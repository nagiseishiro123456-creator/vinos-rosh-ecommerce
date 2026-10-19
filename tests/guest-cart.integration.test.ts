import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test, { after, type TestContext } from "node:test";

import { POST } from "../src/app/api/cart/preview/route";
import { prisma } from "../src/lib/prisma";
import { clearRateLimit, consumeRateLimit } from "../src/lib/rate-limit";
import { MAX_GUEST_BYTES } from "../src/modules/cart/guest-selection";
import { previewGuestCart } from "../src/modules/cart/guest-preview-service";
import { checkoutFixture } from "./helpers/checkout";

after(() => prisma.$disconnect());

function requests(t: TestContext) {
  const identifier = randomUUID();
  t.after(() => clearRateLimit("guest-cart-preview", identifier));
  return { identifier, send: (body: string | ArrayBuffer, extra: Record<string, string> = {}) => POST(new Request(
    "http://localhost:3000/api/cart/preview", { method: "POST", headers: {
      "Content-Type": "application/json", "x-forwarded-for": identifier, ...extra,
    }, body },
  )) };
}

async function commercialState(f: Awaited<ReturnType<typeof checkoutFixture>>) {
  return {
    product: await prisma.product.findUniqueOrThrow({ where: { id: f.product.id }, select: { stock: true } }),
    cart: await prisma.cartItem.findMany({ where: { cartId: f.cart.id }, select: { productId: true, quantity: true } }),
    orders: await prisma.order.count({ where: { userId: f.user.id } }),
    payments: await prisma.payment.count({ where: { order: { userId: f.user.id } } }),
    movements: await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }),
  };
}

test("anonymous preview uses current exact prices and stock without commercial mutations", async (t) => {
  const f = await checkoutFixture(t); const api = requests(t);
  const selection = [{ productId: f.product.id, quantity: 3 }];
  const before = await commercialState(f);
  const response = await api.send(JSON.stringify({ items: selection }));
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  const initial = await response.json(); assert.equal(initial.subtotal, "89.70"); assert.equal(initial.items[0].unitPrice, "29.90");
  assert.deepEqual(await commercialState(f), before);
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "30.10", stock: 2 } });
  const changed = await previewGuestCart(selection);
  assert.equal(changed.subtotal, "60.20"); assert.equal(changed.items[0].quantity, 2);
  assert.deepEqual(changed.changes, [{ productId: f.product.id, kind: "quantity-reduced", quantity: 2 }]);
  const afterChange = await commercialState(f);
  const parallel = await Promise.all([previewGuestCart(selection), previewGuestCart(selection)]);
  assert.equal(parallel[0].subtotal, "60.20"); assert.equal(parallel[1].subtotal, "60.20");
  assert.deepEqual(await commercialState(f), afterChange);
});

test("unavailable and hidden products are removed without exposing private product metadata", async (t) => {
  const f = await checkoutFixture(t);
  const selection = [{ productId: f.product.id, quantity: 1 }];
  await prisma.product.update({ where: { id: f.product.id }, data: { active: false } });
  const hidden = await previewGuestCart(selection);
  assert.deepEqual(hidden.items, []); assert.equal(hidden.subtotal, "0.00");
  assert.equal(JSON.stringify(hidden).includes(f.product.name), false);
  await prisma.product.update({ where: { id: f.product.id }, data: { active: true, stock: 0 } });
  assert.deepEqual((await previewGuestCart(selection)).changes, [{ productId: f.product.id, kind: "unavailable", quantity: 0 }]);
});

test("public preview rejects forged money, duplicate/invalid lines and bounded-stream violations", async (t) => {
  const f = await checkoutFixture(t); const api = requests(t);
  const line = { productId: f.product.id, quantity: 1 };
  const before = await commercialState(f);
  for (const value of [{ items: [line], total: "0.01" }, { items: [{ ...line, price: "0.01" }] },
    { items: [line, line] }, { items: [{ ...line, quantity: 100 }] }, { items: [{ ...line, quantity: 1.5 }] },
    { items: [{ ...line, productId: "invalid" }] }, { items: Array.from({ length: 51 }, () => line) }]) {
    assert.equal((await api.send(JSON.stringify(value))).status, 400);
  }
  assert.equal((await api.send("{")).status, 400);
  assert.equal((await api.send(new Uint8Array([0xc3, 0x28]).buffer)).status, 400);
  assert.equal((await api.send(" ".repeat(MAX_GUEST_BYTES + 1))).status, 413);
  assert.equal((await api.send("{}", { "content-length": String(MAX_GUEST_BYTES + 1) })).status, 413);
  assert.equal((await api.send("{}", { "content-type": "text/plain" })).status, 415);
  assert.deepEqual(await commercialState(f), before);
});

test("preview rate limit returns Retry-After without touching the commercial cart", async (t) => {
  const f = await checkoutFixture(t); const api = requests(t); const scope = "guest-cart-preview";
  await consumeRateLimit({ scope, identifier: api.identifier, limit: 120, windowMs: 60_000 });
  const key = createHash("sha256").update(`${scope}:${api.identifier}`).digest("hex");
  await prisma.rateLimitBucket.update({ where: { key }, data: { count: 120 } });
  const before = await commercialState(f);
  const response = await api.send(JSON.stringify({ items: [{ productId: f.product.id, quantity: 1 }] }));
  assert.equal(response.status, 429); assert.ok(Number(response.headers.get("retry-after")) > 0);
  assert.deepEqual(await commercialState(f), before);
});

test("large preview arithmetic stays exact and marks the order ceiling without making a reservation", async (t) => {
  const f = await checkoutFixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "99999999.99", stock: 99 } });
  const before = await commercialState(f);
  const preview = await previewGuestCart([{ productId: f.product.id, quantity: 99 }]);
  assert.equal(preview.subtotal, "9899999999.01"); assert.equal(preview.exceedsOrderLimit, true);
  assert.deepEqual(await commercialState(f), before);
});
