import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, type TestContext } from "node:test";
import { prisma } from "../src/lib/prisma";
import { checkoutFixture } from "./helpers/checkout";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { reportManualPayment } from "../src/modules/orders/reservation-service";
import { approveManualPaymentRecord } from "../src/modules/payments/review-service";
import { refundPaidOrder } from "../src/modules/orders/refund-service";
import { AdminOperationError } from "../src/modules/admin/transaction-auth";
import { readPaymentSettlement, listPaymentSettlements, savePaymentSettlement, SettlementError } from "../src/modules/payments/settlement-service";
import { buildBusinessBackup } from "../src/modules/admin/backup/export";

after(() => prisma.$disconnect());
const base = { expectedRevision: 0, commissionAmount: "2.50", depositedAmount: "", depositReference: "", depositDate: "", sourceReference: "Extracto QA sintético", reason: "Ingreso y reporte revisados" };
const deposited = { ...base, depositedAmount: "95.70", depositReference: "QA-ABONO", depositDate: "2026-01-01" };
async function fixture(t: TestContext, approve = true) {
  const f = await checkoutFixture(t);
  await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  const order = await reserveManualOrder(f.user.id, f.input);
  await reportManualPayment(f.user.id, order.number, `QA-${randomUUID()}`);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  if (approve) await approveManualPaymentRecord(f.user.id, payment.id);
  return { ...f, order, payment };
}
async function eventCount(orderId: string) { return prisma.orderEvent.count({ where: { orderId, kind: "PAYMENT_SETTLEMENT_RECORDED" } }); }

test("paid manual payments start without invented costs or deposits; a saved fee changes only evidence and audit", async (t) => {
  const f = await fixture(t);
  const before = await readPaymentSettlement(f.user.id, f.payment.id);
  assert.equal(before?.state, "PENDING_COSTS"); assert.equal(before?.recordId, null);
  assert.equal((await listPaymentSettlements(f.user.id)).items.some((item) => item.paymentId === f.payment.id), true);
  assert.deepEqual(await savePaymentSettlement(f.user.id, f.payment.id, base), { revision: 1, state: "PENDING_DEPOSIT", net: "95.70", difference: null });
  assert.equal(await eventCount(f.order.id), 1);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).status, "PAID");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "PAID");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  const notices = await prisma.$queryRaw<Array<{ attempts: number }>>`SELECT "attempts" FROM "PaymentConfirmationOutbox" WHERE "orderId"=${f.order.id}`;
  assert.deepEqual(notices, [{ attempts: 0 }]);
  const backup = await buildBusinessBackup();
  assert.equal(backup.meta.version, 3);
  const evidence = backup.paymentSettlements.find((item) => item.paymentId === f.payment.id);
  assert.equal(evidence?.grossAmount, "98.20"); assert.equal(evidence?.commissionAmount, "2.50");
  assert.equal(evidence?.depositedAmount, null); assert.equal(evidence?.revision, 1);
  assert.equal(backup.orderEvents.filter((event) => event.orderId === f.order.id && event.kind === "PAYMENT_SETTLEMENT_RECORDED").length, 1);
});
test("a discrepancy can be corrected with revision control and auditable previous evidence", async (t) => {
  const f = await fixture(t);
  assert.equal((await savePaymentSettlement(f.user.id, f.payment.id, { ...deposited, depositedAmount: "94.70" })).difference, "-1.00");
  assert.equal((await savePaymentSettlement(f.user.id, f.payment.id, { ...deposited, expectedRevision: 1, reason: "Corrección por referencia verificada" })).state, "MATCHED");
  const row = await readPaymentSettlement(f.user.id, f.payment.id);
  assert.equal(row?.revision, 2); assert.equal(row?.history.length, 2);
  assert.match(row!.history[0].note, /94\.70/); assert.match(row!.history[0].note, /95\.70/); assert.match(row!.history[0].note, /Corrección por referencia verificada/);
});
test("concurrent initial saves keep one record and reject the stale version without a second event", async (t) => {
  const f = await fixture(t);
  const results = await Promise.allSettled([savePaymentSettlement(f.user.id, f.payment.id, deposited), savePaymentSettlement(f.user.id, f.payment.id, { ...deposited, depositedAmount: "94.70" })]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof SettlementError && rejected.reason.code === "CONFLICT");
  assert.equal(await eventCount(f.order.id), 1);
});
test("a revoked admin cannot read, list or modify settlement data", async (t) => {
  const f = await fixture(t); await prisma.user.update({ where: { id: f.user.id }, data: { role: "CUSTOMER" } });
  for (const action of [() => listPaymentSettlements(f.user.id), () => readPaymentSettlement(f.user.id, f.payment.id), () => savePaymentSettlement(f.user.id, f.payment.id, deposited)]) {
    await assert.rejects(action, (error: unknown) => error instanceof AdminOperationError && error.code === "FORBIDDEN");
  }
  assert.equal(await eventCount(f.order.id), 0);
});
test("audit failure rolls back the evidence transaction and returns no private database details", async (t) => {
  const f = await fixture(t);
  await prisma.$executeRawUnsafe(`ALTER TABLE "OrderEvent" ADD CONSTRAINT qa_settlement_audit_fail CHECK (kind <> 'PAYMENT_SETTLEMENT_RECORDED') NOT VALID`);
  try { await assert.rejects(savePaymentSettlement(f.user.id, f.payment.id, deposited), (error: unknown) => error instanceof SettlementError && error.message === "UNAVAILABLE"); }
  finally { await prisma.$executeRawUnsafe(`ALTER TABLE "OrderEvent" DROP CONSTRAINT qa_settlement_audit_fail`); }
  assert.equal((await readPaymentSettlement(f.user.id, f.payment.id))?.recordId, null);
  assert.equal(await eventCount(f.order.id), 0);
});
test("unapproved payments cannot be reconciled", async (t) => {
  const f = await fixture(t, false);
  await assert.rejects(savePaymentSettlement(f.user.id, f.payment.id, deposited), (error: unknown) => error instanceof SettlementError && error.code === "INCONSISTENT");
  assert.equal(await eventCount(f.order.id), 0);
});
test("a refund preserves statement evidence but projects review and blocks further edits", async (t) => {
  const f = await fixture(t); await savePaymentSettlement(f.user.id, f.payment.id, deposited);
  await refundPaidOrder({ adminId: f.user.id, orderId: f.order.id, refundReference: "QA-REFUND" });
  const row = await readPaymentSettlement(f.user.id, f.payment.id);
  assert.equal(row?.state, "REVIEW"); assert.equal(row?.depositedAmount, "95.70"); assert.equal(row?.editable, false);
  await assert.rejects(savePaymentSettlement(f.user.id, f.payment.id, { ...deposited, expectedRevision: 1 }), (error: unknown) => error instanceof SettlementError && error.code === "INCONSISTENT");
  assert.equal(await eventCount(f.order.id), 1);
});
test("changed gross amount and invalid fee/date cannot overwrite existing evidence", async (t) => {
  const f = await fixture(t);
  for (const [change, code] of [[{ commissionAmount: "98.21" }, "COMMISSION_TOO_HIGH"], [{ depositDate: "2099-01-01" }, "FUTURE_DATE"]] as const) {
    await assert.rejects(savePaymentSettlement(f.user.id, f.payment.id, { ...deposited, ...change }), (error: unknown) => error instanceof SettlementError && error.code === code);
  }
  await savePaymentSettlement(f.user.id, f.payment.id, deposited);
  await prisma.payment.update({ where: { id: f.payment.id }, data: { amount: "98.21" } });
  assert.equal((await readPaymentSettlement(f.user.id, f.payment.id))?.state, "REVIEW");
  await assert.rejects(savePaymentSettlement(f.user.id, f.payment.id, { ...deposited, expectedRevision: 1 }), (error: unknown) => error instanceof SettlementError && error.code === "INCONSISTENT");
  assert.equal(await eventCount(f.order.id), 1);
});
