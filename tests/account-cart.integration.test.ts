import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { prisma } from "../src/lib/prisma";
import { clearRateLimit, consumeRateLimit } from "../src/lib/rate-limit";
import { createAccountCartHandlers, MAX_CART_COMMAND_BYTES } from "../src/modules/cart/account-handler";
import { CartCommandError, executeCartCommand, readAccountCart } from "../src/modules/cart/account-service";
import type { CartCommandRequest } from "../src/modules/cart/account-contract";
import { mergeGuestCart } from "../src/modules/cart/guest-merge-service";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { checkoutFixture, confirmationFor } from "./helpers/checkout";

test.after(() => prisma.$disconnect());
const add = (f: Awaited<ReturnType<typeof checkoutFixture>>, operationId = randomUUID()): CartCommandRequest => ({
  expectedUserId: f.user.id, operationId, action: "add", productId: f.product.id,
});
const quantity = async (cartId: string, productId: string) => (await prisma.cartItem.findUniqueOrThrow({ where: { cartId_productId: { cartId, productId } } })).quantity;
test("two concurrent account additions preserve both increments without reserving stock", async (t) => {
  const f = await checkoutFixture(t);
  await Promise.all([executeCartCommand(f.user.id, add(f)), executeCartCommand(f.user.id, add(f))]);
  assert.equal(await quantity(f.cart.id, f.product.id), 5);
  assert.equal((await readAccountCart(f.user.id)).revision, 2);
  assert.equal(await prisma.cartMutation.count({ where: { userId: f.user.id } }), 2);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 0);
});
test("concurrent copies and lost-response replay use one receipt with current cart state", async (t) => {
  const f = await checkoutFixture(t), request = add(f);
  const results = await Promise.all([executeCartCommand(f.user.id, request), executeCartCommand(f.user.id, request)]);
  assert.deepEqual(results.map((result) => result.replayed).sort(), [false, true]);
  assert.equal(await quantity(f.cart.id, f.product.id), 4);
  await executeCartCommand(f.user.id, { ...add(f), action: "set", quantity: 6 });
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "30.10", stock: 2 } });
  const replay = await executeCartCommand(f.user.id, request);
  assert.equal(replay.replayed, true); assert.equal(replay.result.quantity, 4);
  assert.equal(replay.cart.items[0].quantity, 6); assert.equal(replay.cart.subtotal, "180.60"); assert.equal(replay.cart.hasInvalidItems, true);
  assert.equal(replay.cart.revision, 2); assert.equal(await prisma.cartMutation.count({ where: { userId: f.user.id } }), 2);
});
test("same operation identity with another command conflicts without changing quantities", async (t) => {
  const f = await checkoutFixture(t), request = add(f); await executeCartCommand(f.user.id, request);
  await assert.rejects(executeCartCommand(f.user.id, { ...request, action: "set", quantity: 9 }),
    (error) => error instanceof CartCommandError && error.code === "CONFLICT");
  assert.equal(await quantity(f.cart.id, f.product.id), 4); assert.equal((await readAccountCart(f.user.id)).revision, 1);
});
test("commands enforce stock/99, preserve other lines and remove unavailable products", async (t) => {
  const f = await checkoutFixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { stock: 150 } });
  assert.equal((await executeCartCommand(f.user.id, { ...add(f), action: "set", quantity: 99 })).cart.items[0].quantity, 99);
  const capped = await executeCartCommand(f.user.id, add(f)); assert.equal(capped.result.adjusted, true); assert.equal(capped.result.quantity, 99);
  await prisma.product.update({ where: { id: f.product.id }, data: { stock: 2 } });
  assert.equal((await executeCartCommand(f.user.id, add(f))).result.quantity, 2);
  const extra = await prisma.product.create({ data: { name: "QA extra", slug: "extra-" + randomUUID(), description: "QA", stock: 8, price: "10.00" } });
  t.after(() => prisma.product.delete({ where: { id: extra.id } }));
  await executeCartCommand(f.user.id, { ...add(f), productId: extra.id });
  for (const data of [{ active: false, stock: 2, price: "29.90" }, { active: true, stock: 0, price: "29.90" }, { active: true, stock: 2, price: "0.00" }]) {
    await prisma.product.update({ where: { id: f.product.id }, data });
    await assert.rejects(executeCartCommand(f.user.id, add(f)), (error) => error instanceof CartCommandError && error.code === "UNAVAILABLE");
  }
  await executeCartCommand(f.user.id, { ...add(f), action: "remove" });
  const after = await executeCartCommand(f.user.id, { ...add(f), action: "remove" });
  assert.equal(after.result.quantity, 0); assert.equal(after.cart.items.length, 1); assert.equal(after.cart.items[0].productId, extra.id);
});
test("new distinct lines respect 50-product cap; existing lines remain editable", async (t) => {
  const f = await checkoutFixture(t);
  const products = await prisma.product.createManyAndReturn({ data: Array.from({ length: 50 }, (_, index) => ({
    name: "QA cap", slug: "cap-" + randomUUID() + "-" + index, description: "QA", stock: 10, price: "1.00",
  })), select: { id: true } });
  t.after(() => prisma.product.deleteMany({ where: { id: { in: products.map((p) => p.id) } } }));
  await prisma.cartItem.createMany({ data: products.slice(0, 49).map((p) => ({ cartId: f.cart.id, productId: p.id, quantity: 1 })) });
  await assert.rejects(executeCartCommand(f.user.id, { ...add(f), productId: products[49].id }),
    (error) => error instanceof CartCommandError && error.code === "LIMIT");
  assert.equal((await executeCartCommand(f.user.id, add(f))).result.quantity, 4);
});
test("receipt write failure rolls quantity and revision back together", async (t) => {
  const f = await checkoutFixture(t);
  await prisma.$executeRawUnsafe('ALTER TABLE "CartMutation" ADD CONSTRAINT qa_cart_receipt_fail CHECK ("userId" <> ' + "'" + f.user.id + "'" + ')');
  try { await assert.rejects(executeCartCommand(f.user.id, add(f))); }
  finally { await prisma.$executeRawUnsafe('ALTER TABLE "CartMutation" DROP CONSTRAINT qa_cart_receipt_fail'); }
  assert.equal(await quantity(f.cart.id, f.product.id), 3); assert.equal((await readAccountCart(f.user.id)).revision, 0);
  assert.equal(await prisma.cartMutation.count({ where: { userId: f.user.id } }), 0);
});
test("account snapshots and operation namespaces are isolated by session user", async (t) => {
  const a = await checkoutFixture(t), b = await checkoutFixture(t), operationId = randomUUID();
  await executeCartCommand(a.user.id, add(a, operationId)); await executeCartCommand(b.user.id, add(b, operationId));
  assert.equal(JSON.stringify(await readAccountCart(b.user.id)).includes(a.product.id), false);
  await assert.rejects(executeCartCommand(b.user.id, add(a)), (error) => error instanceof CartCommandError && error.code === "UNAUTHORIZED");
  await assert.rejects(readAccountCart("c" + "z".repeat(24)), (error) => error instanceof CartCommandError && error.code === "UNAUTHORIZED");
});
test("account API validates public origin, strict bounded UTF-8 JSON, owner and rate limit", async (t) => {
  const f = await checkoutFixture(t);
  for (const scope of ["account-cart-read", "account-cart-write"]) t.after(() => clearRateLimit(scope, f.user.id));
  const handlers = createAccountCartHandlers(async () => f.user.id, "https://rosh.example");
  const send = (data: unknown, headers: Record<string, string> = {}, raw = false) => handlers.POST(new Request("http://localhost:3000/api/cart", {
    method: "POST", headers: { origin: "https://rosh.example", "content-type": "application/json", host: "untrusted.example", ...headers },
    body: raw ? data as BodyInit : JSON.stringify(data),
  }));
  const anonymous = createAccountCartHandlers(async () => null, "https://rosh.example");
  assert.equal((await anonymous.GET(new Request("https://rosh.example/api/cart"))).status, 401);
  assert.equal((await send(add(f), { origin: "https://evil.example" })).status, 403);
  assert.equal((await send(add(f), { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await send(add(f), { "content-type": "text/plain" })).status, 415);
  for (const body of [{ ...add(f), price: "0.01" }, { ...add(f), cartId: f.cart.id }, { ...add(f), action: "set", quantity: 100 },
    { ...add(f), action: "set", quantity: "2" }, { ...add(f), quantity: 1 }, { ...add(f), operationId: "invalid" }]) assert.equal((await send(body)).status, 400);
  assert.equal((await send("{", {}, true)).status, 400);
  assert.equal((await send(new Uint8Array([0xc3, 0x28]), {}, true)).status, 400);
  assert.equal((await send("é".repeat(MAX_CART_COMMAND_BYTES), {}, true)).status, 413);
  assert.equal((await send(add(f), { "content-length": String(MAX_CART_COMMAND_BYTES + 1) })).status, 413);
  assert.equal((await send({ ...add(f), expectedUserId: "c" + "a".repeat(24) })).status, 409);
  assert.equal(await quantity(f.cart.id, f.product.id), 3);
  const request = add(f); const accepted = await send(request); assert.equal(accepted.status, 200);
  assert.equal(accepted.headers.get("cache-control"), "no-store"); assert.equal((await send(request)).status, 200);
  assert.equal(await quantity(f.cart.id, f.product.id), 4);
  const get = await handlers.GET(new Request("https://rosh.example/api/cart?userId=ignored"));
  assert.equal(get.headers.get("cache-control"), "no-store"); assert.equal((await get.json()).userId, f.user.id);
  await consumeRateLimit({ scope: "account-cart-write", identifier: f.user.id, limit: 120, windowMs: 60_000 });
  const key = createHash("sha256").update("account-cart-write:" + f.user.id).digest("hex");
  await prisma.rateLimitBucket.update({ where: { key }, data: { count: 120 } });
  const limited = await send(add(f)); assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(await quantity(f.cart.id, f.product.id), 4);
});
test("merge and order reservation advance the shared cart revision atomically", async (t) => {
  const f = await checkoutFixture(t);
  await mergeGuestCart(f.user.id, { expectedUserId: f.user.id, importId: "g2_" + "a".repeat(32), items: [{ productId: f.product.id, quantity: 1 }] });
  assert.equal((await readAccountCart(f.user.id)).revision, 1);
  await executeCartCommand(f.user.id, add(f)); assert.equal((await readAccountCart(f.user.id)).revision, 2);
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  await reserveManualOrder(f.user.id, { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) });
  const after = await readAccountCart(f.user.id); assert.equal(after.revision, 3); assert.equal(after.items.length, 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 5);
});
