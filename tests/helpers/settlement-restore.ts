import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { assertRestoredMigrations } from "./migration-history";
import { loadCheckoutSnapshot } from "../../src/modules/checkout/snapshot";
import { createCheckoutQuote } from "../../src/modules/checkout/quote";
import { createCheckoutKey } from "../../src/modules/checkout/idempotency";
import { reserveManualOrder } from "../../src/modules/orders/manual-order-service";
import { reportManualPayment } from "../../src/modules/orders/reservation-service";
import { approveManualPaymentRecord } from "../../src/modules/payments/review-service";
import { readPaymentSettlement, savePaymentSettlement, SettlementError } from "../../src/modules/payments/settlement-service";

const contextPath = process.env.S304_CONTEXT_PATH;
assert.ok(contextPath); assert.equal(process.env.CI, "true");
assert.match(new URL(process.env.DATABASE_URL ?? "").pathname, /^\/rosh_s304_(source|target)_\d+$/);
process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED = "true";
process.env.BANK_ACCOUNT_NUMBER = "QA-NO-TRANSFERIR";
const evidence = { expectedRevision: 0, commissionAmount: "2.50", depositedAmount: "94.70", depositReference: "QA-RESTORE-ABONO", depositDate: "2026-01-01", sourceReference: "QA-RESTORE-EXTRACTO", reason: "Verificación sintética del respaldo" };
type Context = { userId: string; orderId: string; paymentId: string; productId: string; recordId: string };
async function main() {
  if (process.argv[2] === "seed") {
    const stamp = randomUUID();
    const user = await prisma.user.create({ data: { email: `settle-restore-${stamp}@example.test`, passwordHash: "synthetic-recovery-fixture-only", firstName: "QA", lastName: "Recovery", role: "ADMIN", cart: { create: {} } }, include: { cart: true } });
    await prisma.shippingZone.create({ data: { department: "QA", province: "QA", district: stamp, price: "8.50" } });
    const address = await prisma.address.create({ data: { userId: user.id, recipient: "QA", phone: "000000000", department: "QA", province: "QA", district: stamp, addressLine1: "Dirección sintética" } });
    const product = await prisma.product.create({ data: { name: "QA settlement recovery", slug: `settle-restore-${stamp}`, description: "Synthetic recovery contract", price: "29.90", stock: 10 } });
    await prisma.cartItem.create({ data: { cartId: user.cart!.id, productId: product.id, quantity: 3 } });
    const snapshot = await loadCheckoutSnapshot(prisma, user.id, address.id);
    const checkoutQuote = createCheckoutQuote({ ...snapshot, userId: user.id });
    const order = await reserveManualOrder(user.id, { addressId: address.id, provider: "TRANSFER_MANUAL", receiptType: "BOLETA", checkoutQuote, checkoutKey: createCheckoutKey(user.id, checkoutQuote) });
    await reportManualPayment(user.id, order.number, `QA-RESTORE-${stamp}`);
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    await approveManualPaymentRecord(user.id, payment.id);
    await savePaymentSettlement(user.id, payment.id, evidence);
    await savePaymentSettlement(user.id, payment.id, { ...evidence, expectedRevision: 1, depositedAmount: "95.70", reason: "Corrección sintética respaldada" });
    const saved = await readPaymentSettlement(user.id, payment.id);
    assert.ok(saved?.recordId);
    writeFileSync(contextPath!, JSON.stringify({ userId: user.id, orderId: order.id, paymentId: payment.id, productId: product.id, recordId: saved.recordId } satisfies Context));
    return;
  }
  assert.equal(process.argv[2], "verify");
  const context = JSON.parse(readFileSync(contextPath!, "utf8")) as Context;
  const migrations = await assertRestoredMigrations();
  const saved = await readPaymentSettlement(context.userId, context.paymentId);
  assert.equal(saved?.recordId, context.recordId); assert.equal(saved?.revision, 2); assert.equal(saved?.state, "MATCHED");
  assert.equal(saved?.commissionAmount, "2.50"); assert.equal(saved?.depositedAmount, "95.70");
  assert.equal(saved?.depositDate, "2026-01-01"); assert.equal(saved?.depositReference, evidence.depositReference);
  assert.equal(saved?.history.length, 2); assert.match(saved!.history[0].note, /94\.70/);
  await assert.rejects(savePaymentSettlement(context.userId, context.paymentId, evidence), (error: unknown) => error instanceof SettlementError && error.code === "CONFLICT");
  assert.equal((await readPaymentSettlement(context.userId, context.paymentId))?.history.length, 2);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: context.productId } })).stock, 7);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: context.orderId } })).status, "PAID");
  const outbox = await prisma.$queryRaw<Array<{ status: string; attempts: number }>>`SELECT "status", "attempts" FROM "PaymentConfirmationOutbox" WHERE "orderId"=${context.orderId}`;
  assert.deepEqual(outbox, [{ status: "QUEUED", attempts: 0 }]);
  console.log("S304_RESTORE_CONTRACT " + JSON.stringify({ passed: true, migrations, revisions: 2, history: 2, state: "MATCHED", stock: 7, outboxAttempts: 0, outboundRequests: 0 }));
}
main().finally(() => prisma.$disconnect()).catch(() => { console.error("SETTLEMENT_RECOVERY_CONTRACT_FAILED"); process.exitCode = 1; });
