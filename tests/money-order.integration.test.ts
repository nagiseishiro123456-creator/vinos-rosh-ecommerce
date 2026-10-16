import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { checkoutFixture as fixture } from "./helpers/checkout";

import { prisma } from "../src/lib/prisma";
import { MoneyError } from "../src/modules/checkout/pricing";
import { createCheckoutQuote } from "../src/modules/checkout/quote";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { reserveManualOrder, ManualOrderError } from "../src/modules/orders/manual-order-service";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());


async function unchanged(f: Awaited<ReturnType<typeof fixture>>) {
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.payment.count({ where: { order: { userId: f.user.id } } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 0);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
}

test("order, item and payment snapshots store exact amounts and ignore browser totals", async (t) => {
  const f = await fixture(t);
  const forgedTotals = { ...f.input, total: "0.01", shippingAmount: "0.00", subtotal: "0.01" };
  const created = await reserveManualOrder(f.user.id, forgedTotals);
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "40.00" } });
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { price: "12.00" } });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: created.id }, include: { items: true, payments: true } });
  assert.equal(order.subtotal.toFixed(2), "89.70");
  assert.equal(order.shippingAmount.toFixed(2), "8.50");
  assert.equal(order.total.toFixed(2), "98.20");
  assert.equal(order.items[0].unitPrice.toFixed(2), "29.90");
  assert.equal(order.items[0].subtotal.toFixed(2), "89.70");
  assert.equal(order.payments[0].amount.toFixed(2), "98.20");
  assert.equal(order.payments[0].currency, "PEN");
  assert.equal(order.status, "PENDING_PAYMENT");
  assert.equal(order.payments[0].status, "PENDING");
  assert.equal(order.payments[0].operationCode, null);
});

test("a changed price creates no order or stock movement until a refreshed quote is submitted", async (t) => {
  const f = await fixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "30.10" } });
  await assert.rejects(reserveManualOrder(f.user.id, f.input), (error: unknown) => error instanceof ManualOrderError && error.code === "QUOTE_CHANGED");
  await unchanged(f);
  const fresh = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const order = await reserveManualOrder(f.user.id, { ...f.input, checkoutQuote: createCheckoutQuote({ ...fresh, userId: f.user.id }) });
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).total.toFixed(2), "98.80");
});

test("changed shipping and a tampered quote leave the cart and inventory intact", async (t) => {
  const f = await fixture(t);
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { price: "9.00" } });
  await assert.rejects(reserveManualOrder(f.user.id, f.input), ManualOrderError);
  await unchanged(f);
  const fresh = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  await assert.rejects(reserveManualOrder(f.user.id, { ...f.input, checkoutQuote: "v1:" + "0".repeat(64) }), ManualOrderError);
  assert.equal(fresh.amounts.total.toFixed(2), "98.70");
  await unchanged(f);
});

test("an amount exceeding Decimal(10,2) is rejected before reserving stock", async (t) => {
  const f = await fixture(t);
  const second = await prisma.product.create({ data: { name: "Otra QA", slug: randomUUID(), description: "Producto temporal", price: "999999.00", stock: 99 } });
  t.after(() => prisma.product.delete({ where: { id: second.id } }));
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "999999.00", stock: 99 } });
  await prisma.cartItem.updateMany({ where: { cartId: f.cart.id }, data: { quantity: 99 } });
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: second.id, quantity: 99 } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  await assert.rejects(reserveManualOrder(f.user.id, { ...f.input, checkoutQuote: createCheckoutQuote({ ...snapshot, userId: f.user.id }) }), MoneyError);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: second.id } })).stock, 99);
});
