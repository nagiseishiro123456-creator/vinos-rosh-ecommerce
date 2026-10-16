import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { confirmationFor, checkoutFixture } from "./helpers/checkout";
import { prisma } from "../src/lib/prisma";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { reserveManualOrder, ManualOrderError } from "../src/modules/orders/manual-order-service";
import { cancelUnpaidReservation, expireUnpaidReservation, reportManualPayment, PaymentReportError } from "../src/modules/orders/reservation-service";
import { approveManualPaymentRecord } from "../src/modules/payments/review-service";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());

test("reserving persists a deadline and pending payment before instructions; reporting preserves later cart edits and frozen prices", async (t) => {
  const f = await checkoutFixture(t);
  const created = await reserveManualOrder(f.user.id, f.input);
  const reserved = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { payments: true } });
  assert.equal(reserved.status, "PENDING_PAYMENT");
  assert.ok(reserved.stockReservedAt && reserved.reservationExpiresAt);
  assert.ok(reserved.reservationExpiresAt > reserved.stockReservedAt);
  assert.equal(reserved.stockReleasedAt, null);
  assert.equal(reserved.payments[0].status, "PENDING");
  assert.equal(reserved.payments[0].operationCode, null);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 0);
  const laterItem = await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 2 } });
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "50.00" } });
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { price: "30.00" } });
  const operation = `QA-${randomUUID()}`;
  assert.equal(await reportManualPayment(f.user.id, created.number, operation), "sent");
  assert.equal(await reportManualPayment(f.user.id, created.number, operation), "already-sent");
  const order = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { payments: true, items: true } });
  assert.equal(order.status, "PAYMENT_REVIEW");
  assert.equal(order.total.toFixed(2), "98.20");
  assert.equal(order.items[0].unitPrice.toFixed(2), "29.90");
  assert.equal(order.payments[0].amount.toFixed(2), "98.20");
  assert.equal(order.payments[0].status, "UNDER_REVIEW");
  assert.ok(order.payments[0].reportedAt);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { id: laterItem.id } })).quantity, 2);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: order.id } }), 1);
});

test("two full checkouts competing for the final bottle create only one reserved order", async (t) => {
  const cleanup: { otherId?: string } = {};
  t.after(async () => {
    if (cleanup.otherId) {
      await prisma.order.deleteMany({ where: { userId: cleanup.otherId } });
      await prisma.user.delete({ where: { id: cleanup.otherId } });
    }
  });
  const f = await checkoutFixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { stock: 1 } });
  await prisma.cartItem.updateMany({ where: { cartId: f.cart.id }, data: { quantity: 1 } });
  const other = await prisma.user.create({ data: { email: `concurrent-${randomUUID()}@example.com`, passwordHash: "QA", firstName: "QA", lastName: "Other", cart: { create: { items: { create: { productId: f.product.id, quantity: 1 } } } } } });
  cleanup.otherId = other.id;
  const address = await prisma.address.create({ data: { userId: other.id, recipient: "QA", phone: "000000000", department: "QA", province: "QA", district: f.zone.district, addressLine1: "Dirección ficticia" } });
  const [a, b] = await Promise.all([loadCheckoutSnapshot(prisma, f.user.id, f.address.id), loadCheckoutSnapshot(prisma, other.id, address.id)]);
  const results = await Promise.allSettled([
    reserveManualOrder(f.user.id, { ...f.input, ...confirmationFor({ ...a, userId: f.user.id }, f.user.id) }),
    reserveManualOrder(other.id, { ...f.input, addressId: address.id, ...confirmationFor({ ...b, userId: other.id }, other.id) }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await prisma.order.count({ where: { userId: { in: [f.user.id, other.id] } } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 0);
  assert.equal(await prisma.cartItem.count({ where: { productId: f.product.id } }), 1);
});

test("missing availability in a multi-product checkout leaves every line, payment and stock unchanged", async (t) => {
  const f = await checkoutFixture(t);
  const other = await prisma.product.create({ data: { name: "Otra QA", slug: randomUUID(), description: "QA", price: "1.00", stock: 1 } });
  t.after(() => prisma.product.delete({ where: { id: other.id } }));
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: other.id, quantity: 1 } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  await prisma.product.update({ where: { id: other.id }, data: { stock: 0 } });
  await assert.rejects(reserveManualOrder(f.user.id, { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) }));
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.payment.count({ where: { order: { userId: f.user.id } } }), 0);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 2);
});

test("persisted expiry survives configuration changes; exact deadline rejects reporting and releases once", async (t) => {
  const f = await checkoutFixture(t);
  const previous = process.env.MANUAL_PAYMENT_HOLD_MINUTES;
  t.after(() => { if (previous === undefined) delete process.env.MANUAL_PAYMENT_HOLD_MINUTES; else process.env.MANUAL_PAYMENT_HOLD_MINUTES = previous; });
  process.env.MANUAL_PAYMENT_HOLD_MINUTES = "15";
  const created = await reserveManualOrder(f.user.id, f.input);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(order.reservationExpiresAt!.getTime() - order.stockReservedAt!.getTime(), 15 * 60_000);
  process.env.MANUAL_PAYMENT_HOLD_MINUTES = "1440";
  assert.equal(await expireUnpaidReservation(order.id, new Date(order.reservationExpiresAt!.getTime() - 1)), false);
  assert.equal(await reportManualPayment(f.user.id, order.number, "QA-EXPIRED", order.reservationExpiresAt!), "expired");
  assert.equal(await expireUnpaidReservation(order.id, order.reservationExpiresAt!), false);
  assert.equal(await cancelUnpaidReservation(f.user.id, order.number), false);
  const expired = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true } });
  assert.equal(expired.status, "CANCELLED");
  assert.ok(expired.stockReleasedAt && expired.reservationExpiredAt);
  assert.equal(expired.payments[0].status, "CANCELLED");
  assert.equal(expired.payments[0].operationCode, null);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: order.id, type: "ORDER_RELEASE" } }), 1);
});

test("concurrent cancel and expiry return the reservation only once", async (t) => {
  const f = await checkoutFixture(t);
  const created = await reserveManualOrder(f.user.id, f.input);
  const { reservationExpiresAt: deadline } = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
  const results = await Promise.all([
    cancelUnpaidReservation(f.user.id, created.number, deadline!), expireUnpaidReservation(created.id, deadline!),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: created.id, type: "ORDER_RELEASE" } }), 1);
});

test("reporting races with expiry: either review keeps the stock or expiry releases it", async (t) => {
  const f = await checkoutFixture(t);
  const created = await reserveManualOrder(f.user.id, f.input);
  const { reservationExpiresAt: deadline } = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
  await Promise.all([
    reportManualPayment(f.user.id, created.number, `QA-${randomUUID()}`, new Date(deadline!.getTime() - 1)),
    expireUnpaidReservation(created.id, deadline!),
  ]);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { payments: true } });
  const stock = (await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock;
  if (order.status === "PAYMENT_REVIEW") {
    assert.equal(stock, 7); assert.equal(order.payments[0].status, "UNDER_REVIEW"); assert.equal(order.stockReleasedAt, null);
  } else {
    assert.equal(order.status, "CANCELLED"); assert.equal(stock, 10); assert.equal(order.payments[0].status, "CANCELLED"); assert.equal(order.payments[0].operationCode, null);
  }
});

test("other customers cannot report or cancel; review cannot expire or be customer-cancelled; approval never reserves twice", async (t) => {
  const f = await checkoutFixture(t);
  const created = await reserveManualOrder(f.user.id, f.input);
  assert.equal(await reportManualPayment("other-user", created.number, "QA-FOREIGN"), "unavailable");
  assert.equal(await cancelUnpaidReservation("other-user", created.number), false);
  assert.equal(await reportManualPayment(f.user.id, created.number, `QA-${randomUUID()}`), "sent");
  const order = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { payments: true } });
  assert.equal(await expireUnpaidReservation(order.id, new Date(order.reservationExpiresAt!.getTime() + 1)), false);
  assert.equal(await cancelUnpaidReservation(f.user.id, created.number), false);
  await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  await approveManualPaymentRecord(f.user.id, order.payments[0].id);
  await approveManualPaymentRecord(f.user.id, order.payments[0].id);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "PAID");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: order.id } }), 1);
});

test("a duplicate operation rolls back the review transition without losing either reservation", async (t) => {
  const f = await checkoutFixture(t);
  const first = await reserveManualOrder(f.user.id, f.input);
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const second = await reserveManualOrder(f.user.id, { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) });
  const operation = `QA-${randomUUID()}`;
  await reportManualPayment(f.user.id, first.number, operation);
  await assert.rejects(reportManualPayment(f.user.id, second.number, operation), (e: unknown) => e instanceof PaymentReportError && e.code === "DUPLICATE_OPERATION");
  const order = await prisma.order.findUniqueOrThrow({ where: { id: second.id }, include: { payments: true } });
  assert.equal(order.status, "PENDING_PAYMENT"); assert.equal(order.payments[0].status, "PENDING");
  assert.equal(order.payments[0].operationCode, null);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 6);
});

test("legacy pending without reservation markers is neither payable nor automatically released", async (t) => {
  const f = await checkoutFixture(t);
  const created = await reserveManualOrder(f.user.id, f.input);
  await prisma.order.update({ where: { id: created.id }, data: { stockReservedAt: null, reservationExpiresAt: null } });
  assert.equal(await reportManualPayment(f.user.id, created.number, "QA-LEGACY"), "unavailable");
  assert.equal(await cancelUnpaidReservation(f.user.id, created.number), false);
  assert.equal(await expireUnpaidReservation(created.id, new Date("2100-01-01")), false);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});

test("three reservations or reviews block a fourth before touching stock", async (t) => {
  const f = await checkoutFixture(t);
  await reserveManualOrder(f.user.id, f.input);
  for (let i = 0; i < 2; i++) {
    await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
    const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
    await reserveManualOrder(f.user.id, { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) });
  }
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  await assert.rejects(reserveManualOrder(f.user.id, { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) }), (e: unknown) => e instanceof ManualOrderError && e.code === "PENDING_LIMIT");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 5);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 3);
});
