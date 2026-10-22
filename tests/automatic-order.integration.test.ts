import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { prisma } from "../src/lib/prisma";
import { checkoutFixture, confirmationFor } from "./helpers/checkout";
import { automaticCheckoutFixture, automaticInputFor, automaticSandbox } from "./helpers/automatic-checkout";
import { reserveMicuentawebSandboxOrder as reserve } from "../src/modules/orders/automatic-order-service";
import { reserveManualOrder, ManualOrderError, CheckoutConflictError } from "../src/modules/orders/manual-order-service";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { beginMicuentawebSandboxAttempt, PaymentAttemptError } from "../src/modules/payments/izipay/attempt-service";
import { cancelUnpaidReservation, expireUnpaidReservation, reportManualPayment } from "../src/modules/orders/reservation-service";
import { runMaintenance } from "../src/modules/maintenance/service";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());

test("automatic reservation freezes authoritative prices, marks its integration and reserves without inventing a payment", async (t) => {
  const f = await automaticCheckoutFixture(t);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id }, include: { items: true, payments: true, events: true } });
  assert.equal(order.total.toFixed(2), "98.20");
  assert.equal(order.subtotal.toFixed(2), "89.70");
  assert.equal(order.shippingAmount.toFixed(2), "8.50");
  assert.equal(order.paymentIntegration, "MICUENTAWEB_V4");
  assert.equal(order.status, "PENDING_PAYMENT");
  assert.equal(order.paidAt, null);
  assert.equal(order.payments.length, 0);
  assert.equal(order.items[0].unitPrice.toFixed(2), "29.90");
  assert.equal(order.reservationExpiresAt!.getTime() - order.stockReservedAt!.getTime(), 15 * 60_000);
  assert.equal(order.events.filter((e) => e.kind === "AUTOMATIC_SANDBOX_RESERVED").length, 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 0);
  assert.equal((await prisma.cart.findUniqueOrThrow({ where: { id: f.cart.id } })).revision, 1);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: order.id } }), 0);
  const attempt = await beginMicuentawebSandboxAttempt(f.user.id, order.id, automaticSandbox);
  assert.equal(attempt.created, true);
  assert.equal(attempt.attempt.amountMinor, "9820");
  assert.equal(await reportManualPayment(f.user.id, order.number, "QA-DO-NOT-PAY"), "unavailable");
});

test("six automatic confirmations commit one order, one reservation and one audit event", async (t) => {
  const f = await checkoutFixture(t); const input = automaticInputFor(f);
  const results = await Promise.all(Array.from({ length: 6 }, () => reserve(f.user.id, input, automaticSandbox)));
  assert.equal(results.filter((r) => !r.replayed).length, 1);
  assert.equal(new Set(results.map((r) => r.id)).size, 1);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 1);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 1);
  assert.equal(await prisma.orderEvent.count({ where: { actorUserId: f.user.id, kind: "AUTOMATIC_SANDBOX_RESERVED" } }), 1);
  assert.equal(await prisma.payment.count({ where: { order: { userId: f.user.id } } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});

test("automatic replay preserves later cart edits and original deadline despite changed catalogue and disabled configuration", async (t) => {
  const f = await automaticCheckoutFixture(t);
  const original = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
  const later = await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 2 } });
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "90.00", active: false } });
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { price: "30.00", active: false } });
  await prisma.address.update({ where: { id: f.address.id }, data: { active: false } });
  const replay = await reserve(f.user.id, f.automaticInput, {});
  assert.deepEqual(replay, { id: f.order.id, number: f.order.number, replayed: true });
  const saved = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
  assert.deepEqual(saved.reservationExpiresAt, original.reservationExpiresAt);
  assert.equal(saved.total.toFixed(2), "98.20");
  assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { id: later.id } })).quantity, 2);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});

test("automatic and manual method changes conflict on the same checkout identity without converting orders", async (t) => {
  const a = await automaticCheckoutFixture(t);
  await assert.rejects(reserveManualOrder(a.user.id, a.input), CheckoutConflictError);
  await assert.rejects(reserve(a.user.id, { ...a.automaticInput, customerNotes: "Changed" }, automaticSandbox), CheckoutConflictError);
  const b = await checkoutFixture(t);
  const manual = await reserveManualOrder(b.user.id, b.input);
  await assert.rejects(reserve(b.user.id, automaticInputFor(b), automaticSandbox), CheckoutConflictError);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: manual.id } })).paymentIntegration, null);
  assert.equal(await prisma.payment.count({ where: { orderId: manual.id } }), 1);
  assert.equal(await prisma.payment.count({ where: { orderId: a.order.id } }), 0);
});

test("automatic reservations reject foreign accounts, foreign confirmations and forged identities before stock changes", async (t) => {
  const a = await checkoutFixture(t); const b = await checkoutFixture(t);
  const own = automaticInputFor(b);
  for (const input of [automaticInputFor(a), { ...own, checkoutKey: a.input.checkoutKey },
    { ...own, checkoutKey: "ck1:" + "0".repeat(64) }]) {
    await assert.rejects(async () => reserve(b.user.id, input, automaticSandbox),
      (e: unknown) => e instanceof ManualOrderError && e.code === "INVALID_CONFIRMATION");
  }
  assert.equal(await prisma.order.count({ where: { userId: b.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: b.product.id } })).stock, 10);
});

test("automatic and manual buyers competing for the final bottle cannot oversell", async (t) => {
  const owners: string[] = [];
  t.after(async () => {
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: owners } } } });
    await prisma.inventoryMovement.deleteMany({ where: { actorUserId: { in: owners } } });
    await prisma.order.deleteMany({ where: { userId: { in: owners } } });
  });
  const a = await checkoutFixture(t); const b = await checkoutFixture(t);
  owners.push(a.user.id, b.user.id);
  await prisma.product.update({ where: { id: a.product.id }, data: { stock: 1 } });
  await prisma.cartItem.updateMany({ where: { cartId: a.cart.id }, data: { quantity: 1 } });
  await prisma.cartItem.deleteMany({ where: { cartId: b.cart.id } });
  await prisma.cartItem.create({ data: { cartId: b.cart.id, productId: a.product.id, quantity: 1 } });
  const [sa, sb] = await Promise.all([loadCheckoutSnapshot(prisma, a.user.id, a.address.id), loadCheckoutSnapshot(prisma, b.user.id, b.address.id)]);
  const results = await Promise.allSettled([
    reserve(a.user.id, { ...automaticInputFor(a), ...confirmationFor({ ...sa, userId: a.user.id }, a.user.id) }, automaticSandbox),
    reserveManualOrder(b.user.id, { ...b.input, ...confirmationFor({ ...sb, userId: b.user.id }, b.user.id) }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await prisma.order.count({ where: { userId: { in: [a.user.id, b.user.id] } } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: a.product.id } })).stock, 0);
});

test("automatic stale quotes reject changed delivery pricing without consuming stock or identity", async (t) => {
  const f = await checkoutFixture(t);
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { price: "9.00" } });
  await assert.rejects(reserve(f.user.id, automaticInputFor(f), automaticSandbox),
    (e: unknown) => e instanceof ManualOrderError && e.code === "QUOTE_CHANGED");
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
});

test("automatic and manual reservations share the pending-order limit", async (t) => {
  const f = await automaticCheckoutFixture(t);
  for (let index = 0; index < 2; index += 1) {
    await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
    const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
    const confirmed = confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id);
    if (index === 0) await reserveManualOrder(f.user.id, { ...f.input, ...confirmed });
    else await reserve(f.user.id, { ...f.automaticInput, ...confirmed }, automaticSandbox);
  }
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const confirmed = confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id);
  await assert.rejects(reserve(f.user.id, { ...f.automaticInput, ...confirmed }, automaticSandbox),
    (e: unknown) => e instanceof ManualOrderError && e.code === "PENDING_LIMIT");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 5);
});

test("automatic failure after stock decrement rolls back order, event, cart revision and identity", async (t) => {
  const f = await checkoutFixture(t); const input = automaticInputFor(f);
  const name = "qa_auto_" + randomUUID().replaceAll("-", "");
  await prisma.$executeRawUnsafe(`CREATE FUNCTION "${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."checkoutKey" = '${input.checkoutKey}' THEN RAISE EXCEPTION 'QA_AUTOMATIC_RESERVATION_FAULT'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION "${name}"()`);
  const drop = async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${name}" ON "Order"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${name}"()`);
  };
  t.after(drop);
  await assert.rejects(reserve(f.user.id, input, automaticSandbox));
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.orderEvent.count({ where: { actorUserId: f.user.id } }), 0);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal((await prisma.cart.findUniqueOrThrow({ where: { id: f.cart.id } })).revision, 0);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
  await drop();
  assert.equal((await reserve(f.user.id, input, automaticSandbox)).replayed, false);
});

test("automatic expiry uses the persisted deadline and maintenance releases exactly once without reopening replay", async (t) => {
  const f = await automaticCheckoutFixture(t);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
  await beginMicuentawebSandboxAttempt(f.user.id, order.id, automaticSandbox);
  await prisma.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(0) } });
  await runMaintenance(); await runMaintenance();
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "CANCELLED");
  assert.equal(await cancelUnpaidReservation(f.user.id, order.number), false);
  assert.equal(await expireUnpaidReservation(order.id), false);
  assert.equal((await reserve(f.user.id, f.automaticInput, automaticSandbox)).replayed, true);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: order.id, type: "ORDER_RELEASE" } }), 1);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: order.id } }), 1);
});

test("an unlabelled legacy order is not inferred to be eligible for Izipay", async (t) => {
  const f = await automaticCheckoutFixture(t);
  await prisma.order.update({ where: { id: f.order.id }, data: { paymentIntegration: null } });
  await assert.rejects(beginMicuentawebSandboxAttempt(f.user.id, f.order.id, automaticSandbox),
    (e: unknown) => e instanceof PaymentAttemptError && e.code === "ORDER_UNAVAILABLE");
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 0);
});

test("automatic creation requires test configuration and leaves the same identity reusable after a rejected creation", async (t) => {
  const f = await checkoutFixture(t); const input = automaticInputFor(f);
  await assert.rejects(reserve(f.user.id, input, {}), /DISABLED/);
  await assert.rejects(reserve(f.user.id, input, { ...automaticSandbox, IZIPAY_MODE: "PRODUCTION" }), /TEST_CONFIG_REQUIRED/);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal((await reserve(f.user.id, input, automaticSandbox)).replayed, false);
});
