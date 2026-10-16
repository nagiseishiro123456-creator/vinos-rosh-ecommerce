import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, type TestContext } from "node:test";

import { prisma } from "../src/lib/prisma";
import { MoneyError } from "../src/modules/checkout/pricing";
import { createCheckoutQuote } from "../src/modules/checkout/quote";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { createManualOrder, ManualOrderError } from "../src/modules/orders/manual-order-service";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());

async function fixture(t: TestContext) {
  const stamp = randomUUID();
  const user = await prisma.user.create({ data: { email: `money-${stamp}@example.com`, passwordHash: "not-a-real-password", firstName: "QA", lastName: "Money" } });
  const zone = await prisma.shippingZone.create({ data: { department: "QA", province: "QA", district: stamp, price: "8.50" } });
  const address = await prisma.address.create({ data: { userId: user.id, recipient: "QA", phone: "000000000", department: "QA", province: "QA", district: stamp, addressLine1: "Dirección sintética" } });
  const product = await prisma.product.create({ data: { name: "Botella QA", slug: `money-${stamp}`, description: "Producto de prueba", price: "29.90", stock: 10 } });
  const cart = await prisma.cart.create({ data: { userId: user.id, items: { create: { productId: product.id, quantity: 3 } } } });
  t.after(async () => {
    await prisma.inventoryMovement.deleteMany({ where: { actorUserId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.shippingZone.delete({ where: { id: zone.id } });
  });
  const snapshot = await loadCheckoutSnapshot(prisma, user.id, address.id);
  const input = { addressId: address.id, provider: "TRANSFER_MANUAL" as const, receiptType: "BOLETA" as const,
    operationCode: `QA-${stamp}`, checkoutQuote: createCheckoutQuote({ ...snapshot, userId: user.id }) };
  return { user, zone, product, cart, address, input };
}

async function unchanged(f: Awaited<ReturnType<typeof fixture>>) {
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.payment.count({ where: { operationCode: f.input.operationCode } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 0);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
}

test("order, item and payment snapshots store exact amounts and ignore browser totals", async (t) => {
  const f = await fixture(t);
  const forgedTotals = { ...f.input, total: "0.01", shippingAmount: "0.00", subtotal: "0.01" };
  const created = await createManualOrder(f.user.id, forgedTotals);
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
});

test("a changed price creates no order or stock movement until a refreshed quote is submitted", async (t) => {
  const f = await fixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "30.10" } });
  await assert.rejects(createManualOrder(f.user.id, f.input), (error: unknown) => error instanceof ManualOrderError && error.code === "QUOTE_CHANGED");
  await unchanged(f);
  const fresh = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const order = await createManualOrder(f.user.id, { ...f.input, checkoutQuote: createCheckoutQuote({ ...fresh, userId: f.user.id }) });
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).total.toFixed(2), "98.80");
});

test("changed shipping and a tampered quote leave the cart and inventory intact", async (t) => {
  const f = await fixture(t);
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { price: "9.00" } });
  await assert.rejects(createManualOrder(f.user.id, f.input), ManualOrderError);
  await unchanged(f);
  const fresh = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  await assert.rejects(createManualOrder(f.user.id, { ...f.input, checkoutQuote: "v1:" + "0".repeat(64) }), ManualOrderError);
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
  await assert.rejects(createManualOrder(f.user.id, { ...f.input, checkoutQuote: createCheckoutQuote({ ...snapshot, userId: f.user.id }) }), MoneyError);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: second.id } })).stock, 99);
});
