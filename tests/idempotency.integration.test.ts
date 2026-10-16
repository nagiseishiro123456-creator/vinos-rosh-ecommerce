import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { checkoutFixture, confirmationFor } from "./helpers/checkout";
import { prisma } from "../src/lib/prisma";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { reserveManualOrder, ManualOrderError, CheckoutConflictError } from "../src/modules/orders/manual-order-service";
import { cancelUnpaidReservation, expireUnpaidReservation, reportManualPayment } from "../src/modules/orders/reservation-service";
import { approveManualPaymentRecord } from "../src/modules/payments/review-service";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());

test("sequential retries return the same order even after cart, catalogue, address, provider and signing key change", async (t) => {
  const f = await checkoutFixture(t);
  const first = await reserveManualOrder(f.user.id, f.input);
  assert.equal(first.replayed, false);
  const original = await prisma.order.findUniqueOrThrow({ where: { id: first.id } });
  const later = await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 2 } });
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "90.00", active: false } });
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { price: "30.00", active: false } });
  await prisma.address.update({ where: { id: f.address.id }, data: { active: false, addressLine1: "Modificada después" } });
  const previousSecret = process.env.NEXTAUTH_SECRET;
  const previousProvider = process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED;
  t.after(() => { process.env.NEXTAUTH_SECRET = previousSecret; process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED = previousProvider; });
  process.env.NEXTAUTH_SECRET = "rotated-integration-only-secret-at-least-32-chars";
  process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED = "false";
  const retry = await reserveManualOrder(f.user.id, { ...f.input, total: "0.01" } as typeof f.input);
  assert.deepEqual(retry, { id: first.id, number: first.number, replayed: true });
  const saved = await prisma.order.findUniqueOrThrow({ where: { id: first.id }, include: { payments: true } });
  assert.equal(saved.total.toFixed(2), "98.20");
  assert.deepEqual(saved.reservationExpiresAt, original.reservationExpiresAt);
  assert.equal(saved.shippingAddress, "Dirección sintética");
  assert.equal(saved.payments.length, 1);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 1);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: first.id, type: "ORDER_RESERVATION" } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { id: later.id } })).quantity, 2);
});

test("six concurrent identical confirmations commit one order, one payment and one reservation", async (t) => {
  const f = await checkoutFixture(t);
  const results = await Promise.all(Array.from({ length: 6 }, () => reserveManualOrder(f.user.id, f.input)));
  assert.equal(new Set(results.map((r) => r.id)).size, 1);
  assert.equal(results.filter((r) => !r.replayed).length, 1);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 1);
  assert.equal(await prisma.payment.count({ where: { order: { userId: f.user.id } } }), 1);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});

test("same key with changed provider, receipt, fiscal fields, notes or quote conflicts without overwriting the order", async (t) => {
  const f = await checkoutFixture(t);
  const input = { ...f.input, receiptType: "FACTURA" as const, documentNumber: "20123456789", businessName: "QA", taxAddress: "Dirección QA", customerNotes: "Nota original" };
  const first = await reserveManualOrder(f.user.id, input);
  for (const changes of [
    { provider: "YAPE_MANUAL" as const }, { receiptType: "BOLETA" as const }, { documentNumber: "20987654321" },
    { businessName: "Otra QA" }, { taxAddress: "Otra dirección" }, { customerNotes: "Otra nota" },
    { checkoutQuote: "v1:" + "f".repeat(64) }, { addressId: "canotheraddress1234567890" },
  ]) await assert.rejects(reserveManualOrder(f.user.id, { ...input, ...changes }), (e: unknown) => e instanceof CheckoutConflictError && e.orderNumber === first.number);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: first.id } });
  assert.equal(order.businessName, "QA"); assert.equal(order.customerNotes, "Nota original");
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});

test("concurrent conflicting requests select a single winner and report the existing order to its owner", async (t) => {
  const f = await checkoutFixture(t);
  const results = await Promise.allSettled([
    reserveManualOrder(f.user.id, { ...f.input, customerNotes: "Primera" }),
    reserveManualOrder(f.user.id, { ...f.input, customerNotes: "Segunda" }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected");
  assert.ok(rejected?.status === "rejected" && rejected.reason instanceof CheckoutConflictError);
  const order = await prisma.order.findFirstOrThrow({ where: { userId: f.user.id } });
  assert.equal(rejected.reason.orderNumber, order.number);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});

test("another user, missing key and forged key cannot recover or create an order", async (t) => {
  const a = await checkoutFixture(t); const b = await checkoutFixture(t);
  await reserveManualOrder(a.user.id, a.input);
  for (const input of [a.input, { ...b.input, checkoutKey: a.input.checkoutKey }, { ...b.input, checkoutKey: "ck1:" + "0".repeat(64) }, { ...b.input, checkoutKey: undefined }]) {
    await assert.rejects(reserveManualOrder(b.user.id, input as typeof b.input), (e: unknown) => e instanceof ManualOrderError && e.code === "INVALID_CONFIRMATION");
  }
  assert.equal(await prisma.order.count({ where: { userId: b.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: b.product.id } })).stock, 10);
  assert.equal(await prisma.cartItem.count({ where: { cartId: b.cart.id } }), 1);
});

test("failed transaction after decrement rolls stock and identity back; same key succeeds after fault is removed", async (t) => {
  const f = await checkoutFixture(t);
  const name = `qa_idem_${randomUUID().replaceAll("-", "")}`;
  // QA-only database guard lives in checkoutFixture. Fault injection targets exactly this key.
  await prisma.$executeRawUnsafe(`CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."checkoutKey" = '${f.input.checkoutKey}' THEN RAISE EXCEPTION 'QA_CHECKOUT_FAULT'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION "${name}"()`);
  const drop = async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${name}" ON "Order"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${name}"()`);
  };
  t.after(drop);
  await assert.rejects(reserveManualOrder(f.user.id, f.input));
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.payment.count({ where: { order: { userId: f.user.id } } }), 0);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
  await drop();
  const order = await reserveManualOrder(f.user.id, f.input);
  assert.equal(order.replayed, false);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});

test("cancelled and expired results are recovered without renewing them; a new cart generates a new operation", async (t) => {
  const f = await checkoutFixture(t);
  const first = await reserveManualOrder(f.user.id, f.input);
  await cancelUnpaidReservation(f.user.id, first.number);
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 2 } });
  assert.equal((await reserveManualOrder(f.user.id, f.input)).id, first.id);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const input = { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) };
  assert.notEqual(input.checkoutKey, f.input.checkoutKey);
  const second = await reserveManualOrder(f.user.id, input);
  const saved = await prisma.order.findUniqueOrThrow({ where: { id: second.id } });
  await expireUnpaidReservation(second.id, saved.reservationExpiresAt!);
  assert.equal((await reserveManualOrder(f.user.id, input)).id, second.id);
  const expired = await prisma.order.findUniqueOrThrow({ where: { id: second.id } });
  assert.equal(expired.status, "CANCELLED");
  assert.deepEqual(expired.reservationExpiresAt, saved.reservationExpiresAt);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
});

test("a completed paid order is recovered without another payment or stock movement", async (t) => {
  const f = await checkoutFixture(t);
  const first = await reserveManualOrder(f.user.id, f.input);
  await reportManualPayment(f.user.id, first.number, `QA-${randomUUID()}`);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: first.id } });
  await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  await approveManualPaymentRecord(f.user.id, payment.id);
  assert.equal((await reserveManualOrder(f.user.id, f.input)).id, first.id);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: first.id } })).status, "PAID");
  assert.equal(await prisma.payment.count({ where: { orderId: first.id } }), 1);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: first.id } }), 1);
});

test("new reservations still enforce provider readiness and do not consume an identity on failure", async (t) => {
  const f = await checkoutFixture(t);
  const previous = process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED;
  t.after(() => { process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED = previous; });
  process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED = "false";
  await assert.rejects(reserveManualOrder(f.user.id, f.input), (e: unknown) => e instanceof ManualOrderError && e.code === "PROVIDER_UNAVAILABLE");
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED = "true";
  assert.equal((await reserveManualOrder(f.user.id, f.input)).replayed, false);
});
