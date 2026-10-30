import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, type TestContext } from "node:test";
import { prisma } from "../src/lib/prisma";
import { checkoutFixture, confirmationFor } from "./helpers/checkout";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { cancelUnpaidReservation, expireUnpaidReservation, reportManualPayment } from "../src/modules/orders/reservation-service";
import { approveManualPaymentRecord, rejectManualPaymentRecord } from "../src/modules/payments/review-service";
import { refundPaidOrder } from "../src/modules/orders/refund-service";
import { advanceOrder } from "../src/modules/admin/orders/transition-service";
import { openPaymentReconciliation, refundPaymentReconciliation } from "../src/modules/payments/reconciliation-service";
import { AdminOperationError } from "../src/modules/admin/transaction-auth";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { buildBusinessBackup } from "../src/modules/admin/backup/export";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());

async function fixture(t: TestContext, report = true) {
  const f = await checkoutFixture(t);
  await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  const order = await reserveManualOrder(f.user.id, f.input);
  const operation = `QA-${randomUUID()}`;
  if (report) await reportManualPayment(f.user.id, order.number, operation);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  return { ...f, order, payment, operation };
}
async function state(f: Awaited<ReturnType<typeof fixture>>) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id }, include: { payments: true, events: true } });
  const product = await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } });
  const releases = await prisma.inventoryMovement.count({ where: { orderId: f.order.id, type: "ORDER_RELEASE" } });
  return { order, payment: order.payments[0], stock: product.stock, releases };
}
const errorCode = (code: AdminOperationError["code"]) => (e: unknown) => e instanceof AdminOperationError && e.code === code;

test("RI-02: business export preserves reconciled money, refund reference and order audit without password hashes", async (t) => {
  const f = await fixture(t, false);
  await cancelUnpaidReservation(f.user.id, f.order.number);
  await openPaymentReconciliation(f.user.id, f.payment.id, {
    operationCode: f.operation, receivedAmount: "10.00", reason: "Ingreso recibido tras cancelación.",
  });
  await refundPaymentReconciliation(f.user.id, f.payment.id, "QA-BACKUP-REF");
  const backup = await buildBusinessBackup();
  assert.equal(backup.meta.version, 3);
  assert.ok(backup.users.every((u) => !("passwordHash" in u)));
  assert.equal(backup.orders.find((o) => o.id === f.order.id)?.status, "CANCELLED");
  const received = backup.paymentReconciliations.find((r) => r.paymentId === f.payment.id);
  assert.ok(received?.refundedAt);
  assert.equal(received.receivedAmount.toFixed(2), "10.00");
  assert.equal(received.refundReference, "QA-BACKUP-REF");
  assert.deepEqual(backup.orderEvents.filter((e) => e.orderId === f.order.id).map((e) => e.kind).sort(),
    ["RECONCILIATION_OPENED", "RECONCILIATION_REFUNDED", "RESERVATION_CANCELLED"]);
  const json = JSON.stringify(backup);
  assert.ok(!json.includes(f.user.passwordHash));
  assert.ok(!("passwordResetTokens" in backup));
  assert.ok(json.includes('"receivedAmount":"10"') || json.includes('"receivedAmount":"10.00"'));
});

test("approve versus reject claims one order and records exactly one administrative decision", async (t) => {
  const f = await fixture(t);
  const results = await Promise.all([
    approveManualPaymentRecord(f.user.id, f.payment.id),
    rejectManualPaymentRecord(f.user.id, f.payment.id, "Operación no encontrada en la cuenta."),
  ]);
  assert.equal(results.filter((r) => r.changed).length, 1);
  const s = await state(f);
  assert.equal(s.order.events.filter((e) => e.kind.startsWith("PAYMENT_") && e.kind !== "PAYMENT_REPORTED").length, 1);
  assert.equal(s.payment.reviewedById, f.user.id);
  if (s.order.status === "PAID") { assert.equal(s.payment.status, "PAID"); assert.equal(s.stock, 7); assert.equal(s.releases, 0); }
  else { assert.equal(s.order.status, "CANCELLED"); assert.equal(s.payment.status, "REJECTED"); assert.equal(s.stock, 10); assert.equal(s.releases, 1); }
});

test("duplicate approval is one event and never reserves twice, even past the original deadline", async (t) => {
  const f = await fixture(t);
  await prisma.order.update({ where: { id: f.order.id }, data: { reservationExpiresAt: new Date(0) } });
  const result = await Promise.all([approveManualPaymentRecord(f.user.id, f.payment.id), approveManualPaymentRecord(f.user.id, f.payment.id)]);
  assert.equal(result.filter((r) => r.changed).length, 1);
  const s = await state(f);
  assert.equal(s.order.status, "PAID"); assert.equal(s.stock, 7); assert.equal(s.releases, 0);
  assert.equal(s.order.events.filter((e) => e.kind === "PAYMENT_APPROVED").length, 1);
});

test("duplicate rejection versus cancel/expiry releases stock once and retains the reason", async (t) => {
  const f = await fixture(t);
  await Promise.all([
    rejectManualPaymentRecord(f.user.id, f.payment.id, "Referencia bancaria inválida."),
    rejectManualPaymentRecord(f.user.id, f.payment.id, "Referencia bancaria inválida."),
    cancelUnpaidReservation(f.user.id, f.order.number), expireUnpaidReservation(f.order.id, new Date("2100-01-01")),
  ]);
  const s = await state(f);
  assert.equal(s.order.status, "CANCELLED"); assert.equal(s.payment.status, "REJECTED"); assert.equal(s.stock, 10); assert.equal(s.releases, 1);
  assert.equal(s.order.events.filter((e) => e.kind === "PAYMENT_REJECTED").length, 1);
  assert.equal(s.order.events.find((e) => e.kind === "PAYMENT_REJECTED")?.note, "Referencia bancaria inválida.");
});

test("approval versus customer cancellation/expiry preserves the communicated payment", async (t) => {
  const f = await fixture(t);
  await Promise.all([approveManualPaymentRecord(f.user.id, f.payment.id), cancelUnpaidReservation(f.user.id, f.order.number), expireUnpaidReservation(f.order.id, new Date("2100-01-01"))]);
  const s = await state(f);
  assert.equal(s.order.status, "PAID"); assert.equal(s.payment.status, "PAID"); assert.equal(s.stock, 7); assert.equal(s.releases, 0);
});

test("amount, currency, released or missing reservation and extra payment block approval atomically", async (t) => {
  const f = await fixture(t);
  await prisma.payment.update({ where: { id: f.payment.id }, data: { amount: "98.19" } });
  await assert.rejects(approveManualPaymentRecord(f.user.id, f.payment.id), errorCode("INCONSISTENT"));
  await prisma.payment.update({ where: { id: f.payment.id }, data: { amount: "98.20", currency: "USD" } });
  await assert.rejects(approveManualPaymentRecord(f.user.id, f.payment.id), errorCode("INCONSISTENT"));
  await prisma.payment.update({ where: { id: f.payment.id }, data: { currency: "PEN" } });
  await prisma.order.update({ where: { id: f.order.id }, data: { stockReleasedAt: new Date() } });
  await assert.rejects(approveManualPaymentRecord(f.user.id, f.payment.id), errorCode("INCONSISTENT"));
  await prisma.order.update({ where: { id: f.order.id }, data: { stockReleasedAt: null, stockReservedAt: null } });
  await assert.rejects(approveManualPaymentRecord(f.user.id, f.payment.id), errorCode("INCONSISTENT"));
  await prisma.order.update({ where: { id: f.order.id }, data: { stockReservedAt: new Date() } });
  await prisma.payment.create({ data: { orderId: f.order.id, provider: "TRANSFER_MANUAL", amount: "1.00" } });
  await assert.rejects(approveManualPaymentRecord(f.user.id, f.payment.id), errorCode("INCONSISTENT"));
  const s = await state(f);
  assert.equal(s.order.status, "PAYMENT_REVIEW"); assert.equal(s.stock, 7); assert.equal(s.releases, 0);
  assert.equal(s.order.events.length, 1); // Only the customer's report, no admin mutation.
});

test("current DB role prevents administrative writes after permission revocation", async (t) => {
  const f = await fixture(t);
  await prisma.user.update({ where: { id: f.user.id }, data: { role: "CUSTOMER" } });
  for (const operation of [
    () => approveManualPaymentRecord(f.user.id, f.payment.id),
    () => rejectManualPaymentRecord(f.user.id, f.payment.id, "Sin permiso."),
    () => refundPaidOrder({ adminId: f.user.id, orderId: f.order.id, refundReference: "QA-REF" }),
    () => advanceOrder(f.user.id, f.order.id, "PAID"),
    () => openPaymentReconciliation(f.user.id, f.payment.id, { operationCode: f.operation, receivedAmount: "98.20", reason: "Ingreso tardío." }),
    () => refundPaymentReconciliation(f.user.id, f.payment.id, "QA-REF"),
  ]) await assert.rejects(operation(), errorCode("FORBIDDEN"));
  const s = await state(f);
  assert.equal(s.order.status, "PAYMENT_REVIEW"); assert.equal(s.stock, 7); assert.equal(s.order.events.length, 1);
});

test("duplicate full refunds restore stock and create an event once", async (t) => {
  const f = await fixture(t);
  await approveManualPaymentRecord(f.user.id, f.payment.id);
  const result = await Promise.allSettled([1, 2].map(() => refundPaidOrder({ orderId: f.order.id, adminId: f.user.id, refundReference: " QA-REF " })));
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const s = await state(f);
  assert.equal(s.order.status, "REFUNDED"); assert.equal(s.payment.status, "REFUNDED"); assert.equal(s.stock, 10); assert.equal(s.releases, 1);
  assert.equal(s.payment.refundReference, "QA-REF"); assert.equal(s.order.events.filter((e) => e.kind === "PAYMENT_REFUNDED").length, 1);
});

test("replayed fulfillment forms cannot skip preparation and refund/shipping races stay coherent", async (t) => {
  const f = await fixture(t);
  await approveManualPaymentRecord(f.user.id, f.payment.id);
  const result = await Promise.all([advanceOrder(f.user.id, f.order.id, "PAID"), advanceOrder(f.user.id, f.order.id, "PAID")]);
  assert.equal(result.filter((r) => r.changed).length, 1);
  assert.equal((await state(f)).order.status, "PREPARING");
  assert.equal((await advanceOrder(f.user.id, f.order.id, "PAID")).changed, false);
  await Promise.allSettled([
    advanceOrder(f.user.id, f.order.id, "PREPARING"),
    refundPaidOrder({ orderId: f.order.id, adminId: f.user.id, refundReference: "QA-REF" }),
  ]);
  const s = await state(f);
  if (s.order.status === "SHIPPED") { assert.equal(s.payment.status, "PAID"); assert.equal(s.stock, 7); assert.equal(s.releases, 0); }
  else { assert.equal(s.order.status, "REFUNDED"); assert.equal(s.payment.status, "REFUNDED"); assert.equal(s.stock, 10); assert.equal(s.releases, 1); }
});

test("refund blocks money mismatch and dispatched orders without partial mutation", async (t) => {
  const f = await fixture(t);
  await approveManualPaymentRecord(f.user.id, f.payment.id);
  await prisma.payment.update({ where: { id: f.payment.id }, data: { amount: "1.00" } });
  await assert.rejects(refundPaidOrder({ orderId: f.order.id, adminId: f.user.id, refundReference: "QA-REF" }), errorCode("INCONSISTENT"));
  await prisma.payment.update({ where: { id: f.payment.id }, data: { amount: "98.20" } });
  await advanceOrder(f.user.id, f.order.id, "PAID"); await advanceOrder(f.user.id, f.order.id, "PREPARING");
  await assert.rejects(refundPaidOrder({ orderId: f.order.id, adminId: f.user.id, refundReference: "QA-REF" }));
  const s = await state(f); assert.equal(s.order.status, "SHIPPED"); assert.equal(s.stock, 7); assert.equal(s.releases, 0);
});

test("late income reconciliation and duplicate closure never resurrect an order or touch stock", async (t) => {
  const f = await fixture(t, false);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
  await expireUnpaidReservation(order.id, order.reservationExpiresAt!);
  const input = { operationCode: f.operation, receivedAmount: "100.00", reason: "Ingreso tardío superior al total; devolver íntegramente." };
  const opened = await Promise.all([openPaymentReconciliation(f.user.id, f.payment.id, input), openPaymentReconciliation(f.user.id, f.payment.id, input)]);
  assert.equal(opened.filter((r) => r.changed).length, 1);
  assert.equal((await approveManualPaymentRecord(f.user.id, f.payment.id)).changed, false);
  const closed = await Promise.all([refundPaymentReconciliation(f.user.id, f.payment.id, "QA-LATE-REF"), refundPaymentReconciliation(f.user.id, f.payment.id, "QA-LATE-REF")]);
  assert.equal(closed.filter((r) => r.changed).length, 1);
  const reconciliation = await prisma.paymentReconciliation.findUniqueOrThrow({ where: { paymentId: f.payment.id } });
  assert.equal(reconciliation.receivedAmount.toFixed(2), "100.00"); assert.equal(reconciliation.refundReference, "QA-LATE-REF");
  const s = await state(f);
  assert.equal(s.order.status, "CANCELLED"); assert.equal(s.payment.status, "CANCELLED"); assert.equal(s.stock, 10); assert.equal(s.releases, 1);
  assert.equal(s.order.events.filter((e) => e.kind === "RECONCILIATION_OPENED").length, 1);
  assert.equal(s.order.events.filter((e) => e.kind === "RECONCILIATION_REFUNDED").length, 1);
});

test("rejected discrepant payment can be reconciled, but its code and received amount cannot be rewritten", async (t) => {
  const f = await fixture(t);
  await prisma.payment.update({ where: { id: f.payment.id }, data: { amount: "1.00" } });
  await rejectManualPaymentRecord(f.user.id, f.payment.id, "Importe comunicado incorrecto; revisar ingreso real.");
  const input = { operationCode: f.operation, receivedAmount: "10.00", reason: "Ingreso parcial confirmado." };
  await assert.rejects(openPaymentReconciliation(f.user.id, f.payment.id, { ...input, operationCode: "ANOTHER-CODE" }), errorCode("INCONSISTENT"));
  await openPaymentReconciliation(f.user.id, f.payment.id, input);
  assert.equal((await openPaymentReconciliation(f.user.id, f.payment.id, { ...input, receivedAmount: "20.00" })).changed, false);
  assert.equal((await prisma.paymentReconciliation.findUniqueOrThrow({ where: { paymentId: f.payment.id } })).receivedAmount.toFixed(2), "10.00");
  assert.equal((await state(f)).stock, 10);
});

test("bank reference used in another order rolls reconciliation back without creating an event", async (t) => {
  const f = await fixture(t);
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const second = await reserveManualOrder(f.user.id, { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) });
  await cancelUnpaidReservation(f.user.id, second.number);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: second.id } });
  await assert.rejects(openPaymentReconciliation(f.user.id, payment.id, { operationCode: f.operation, receivedAmount: "1.00", reason: "Ingreso ya usado." }), errorCode("DUPLICATE_OPERATION"));
  assert.equal(await prisma.paymentReconciliation.count({ where: { paymentId: payment.id } }), 0);
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).operationCode, null);
  assert.equal(await prisma.orderEvent.count({ where: { orderId: second.id, kind: "RECONCILIATION_OPENED" } }), 0);
});

test("invalid reconciliation amounts and unclosed orders cannot record received money", async (t) => {
  const f = await fixture(t);
  const input = { operationCode: f.operation, receivedAmount: "98.20", reason: "Ingreso tardío." };
  await assert.rejects(openPaymentReconciliation(f.user.id, f.payment.id, input), errorCode("INCONSISTENT"));
  for (const receivedAmount of ["0.00", "-1.00", "1.001", "1e2", "100000000.00", "1,00", "NaN"])
    await assert.rejects(openPaymentReconciliation(f.user.id, f.payment.id, { ...input, receivedAmount }), errorCode("INVALID_INPUT"));
  assert.equal(await prisma.paymentReconciliation.count({ where: { paymentId: f.payment.id } }), 0);
});
