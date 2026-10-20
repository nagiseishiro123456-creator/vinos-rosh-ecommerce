import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test, { after, type TestContext } from "node:test";
import { prisma } from "../src/lib/prisma";
import { clearRateLimit, consumeRateLimit } from "../src/lib/rate-limit";
import { createGuestMergeHandler } from "../src/modules/cart/guest-merge-handler";
import { CartMergeError, mergeGuestCart } from "../src/modules/cart/guest-merge-service";
import { MAX_GUEST_BYTES } from "../src/modules/cart/guest-selection";
import { checkoutFixture } from "./helpers/checkout";

after(() => prisma.$disconnect());
const identity = () => `g2_${randomUUID().replaceAll("-", "")}`;
const input = (f: Awaited<ReturnType<typeof checkoutFixture>>, quantity = 2, importId = identity()) => ({
  expectedUserId: f.user.id, importId, items: [{ productId: f.product.id, quantity }],
});
async function state(f: Awaited<ReturnType<typeof checkoutFixture>>) {
  return { stock: (await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock,
    orders: await prisma.order.count({ where: { userId: f.user.id } }), payments: await prisma.payment.count({ where: { order: { userId: f.user.id } } }),
    movements: await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }) };
}
async function quantity(f: Awaited<ReturnType<typeof checkoutFixture>>) {
  return (await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: f.cart.id, productId: f.product.id } } }))?.quantity ?? 0;
}
function api(t: TestContext, userId: string | null) {
  if (userId) t.after(() => clearRateLimit("guest-cart-merge", userId));
  const handler = createGuestMergeHandler(async () => userId, "http://localhost:3000");
  return (body: unknown, extra: Record<string, string> = {}, raw = false) => handler(new Request("http://localhost:3000/api/cart/merge", {
    method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...extra },
    body: raw ? body as string : JSON.stringify(body),
  }));
}

test("merge sums once, retains other account lines and never reserves stock or creates commerce records", async (t) => {
  const f = await checkoutFixture(t); const before = await state(f);
  const other = await prisma.product.create({ data: { name: "Otra QA", slug: `merge-${randomUUID()}`, description: "QA", price: "20.10", stock: 10 } });
  t.after(() => prisma.product.delete({ where: { id: other.id } }));
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: other.id, quantity: 4 } });
  const request = input(f); const first = await mergeGuestCart(f.user.id, request);
  assert.equal(first.replayed, false); assert.deepEqual(first.result.lines, [{ productId: f.product.id, quantity: 5 }]);
  assert.equal(await quantity(f), 5);
  assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { cartId_productId: { cartId: f.cart.id, productId: other.id } } })).quantity, 4);
  assert.equal((await mergeGuestCart(f.user.id, request)).replayed, true); assert.equal(await quantity(f), 5);
  assert.deepEqual(await state(f), before); assert.equal(await prisma.cartImport.count({ where: { userId: f.user.id } }), 1);
});
test("same identity replays even after prices, availability and the private cart change; altered content conflicts", async (t) => {
  const f = await checkoutFixture(t); const request = input(f);
  const first = await mergeGuestCart(f.user.id, request);
  await prisma.cartItem.deleteMany({ where: { cartId: f.cart.id } });
  await prisma.product.update({ where: { id: f.product.id }, data: { active: false, price: "40.10", stock: 0 } });
  const replay = await mergeGuestCart(f.user.id, request); assert.deepEqual(replay.result, first.result); assert.equal(replay.replayed, true);
  assert.equal(await quantity(f), 0);
  await assert.rejects(mergeGuestCart(f.user.id, { ...request, items: [{ productId: f.product.id, quantity: 1 }] }),
    (error) => error instanceof CartMergeError && error.code === "CONFLICT");
  assert.equal(await quantity(f), 0); assert.equal(await prisma.cartImport.count({ where: { userId: f.user.id } }), 1);
});
test("concurrent retries share one receipt, while distinct imports serialize their sums", async (t) => {
  const f = await checkoutFixture(t); const before = await state(f); const request = input(f, 1);
  const same = await Promise.all([mergeGuestCart(f.user.id, request), mergeGuestCart(f.user.id, request)]);
  assert.equal(same.filter((result) => !result.replayed).length, 1); assert.equal(await quantity(f), 4);
  const distinct = await Promise.all([mergeGuestCart(f.user.id, input(f, 1)), mergeGuestCart(f.user.id, input(f, 1))]);
  assert.equal(distinct.filter((result) => !result.replayed).length, 2); assert.equal(await quantity(f), 6);
  assert.equal(await prisma.cartImport.count({ where: { userId: f.user.id } }), 3); assert.deepEqual(await state(f), before);
});
test("concurrent same key with different contents commits one complete request and rejects the other", async (t) => {
  const f = await checkoutFixture(t); const importId = identity();
  const results = await Promise.allSettled([mergeGuestCart(f.user.id, input(f, 1, importId)), mergeGuestCart(f.user.id, input(f, 2, importId))]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected");
  assert.ok(rejected?.status === "rejected" && rejected.reason instanceof CartMergeError && rejected.reason.code === "CONFLICT");
  assert.ok([4, 5].includes(await quantity(f))); assert.equal(await prisma.cartImport.count({ where: { userId: f.user.id } }), 1);
});
test("current stock and 99-unit ceiling adjust quantities, hidden/missing/zero-price products disappear", async (t) => {
  const f = await checkoutFixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { stock: 4 } });
  const clamped = await mergeGuestCart(f.user.id, input(f, 5));
  assert.deepEqual(clamped.result.changes, [{ productId: f.product.id, kind: "quantity-reduced", quantity: 4 }]);
  await prisma.product.update({ where: { id: f.product.id }, data: { stock: 200 } });
  await mergeGuestCart(f.user.id, input(f, 99)); assert.equal(await quantity(f), 99);
  for (const data of [{ active: false, stock: 10, price: "29.90" }, { active: true, stock: 0, price: "29.90" }, { active: true, stock: 10, price: "0.00" }]) {
    await prisma.product.update({ where: { id: f.product.id }, data });
    const result = await mergeGuestCart(f.user.id, input(f, 1)); assert.deepEqual(result.result.lines, []);
    assert.deepEqual(result.result.changes, [{ productId: f.product.id, kind: "unavailable", quantity: 0 }]); assert.equal(await quantity(f), 0);
  }
  const missing = `c${"z".repeat(24)}`;
  const result = await mergeGuestCart(f.user.id, { ...input(f), items: [{ productId: missing, quantity: 1 }] });
  assert.deepEqual(result.result.changes, [{ productId: missing, kind: "unavailable", quantity: 0 }]);
});
test("receipt failure rolls back all cart changes, leaving stock and order state intact", async (t) => {
  const f = await checkoutFixture(t); const request = input(f); const before = await state(f);
  // Generated hex identity only; this temporary constraint exists in the isolated QA database.
  assert.match(request.importId, /^g2_[a-f0-9]{32}$/);
  await prisma.$executeRawUnsafe(`ALTER TABLE "CartImport" ADD CONSTRAINT "qa_import_rollback" CHECK ("importId" <> '${request.importId}')`);
  try { await assert.rejects(mergeGuestCart(f.user.id, request)); }
  finally { await prisma.$executeRawUnsafe('ALTER TABLE "CartImport" DROP CONSTRAINT "qa_import_rollback"'); }
  assert.equal(await quantity(f), 3); assert.equal(await prisma.cartImport.count({ where: { userId: f.user.id } }), 0);
  assert.deepEqual(await state(f), before);
});
test("identity namespace belongs to the current user and cannot expose another user's result", async (t) => {
  const a = await checkoutFixture(t); const b = await checkoutFixture(t); const importId = identity();
  await mergeGuestCart(a.user.id, input(a, 2, importId));
  const sendB = api(t, b.user.id);
  assert.equal((await sendB(input(a, 2, importId))).status, 409); assert.equal(await quantity(b), 3);
  const result = await mergeGuestCart(b.user.id, input(b, 1, importId)); assert.equal(result.userId, b.user.id);
  assert.equal(result.replayed, false); assert.equal(JSON.stringify(result).includes(a.product.id), false);
  await assert.rejects(mergeGuestCart(`c${"z".repeat(24)}`, { ...input(a), expectedUserId: `c${"z".repeat(24)}` }),
    (error) => error instanceof CartMergeError && error.code === "UNAUTHORIZED");
});
test("merge endpoint enforces session, origin, strict bounded JSON and retry-safe responses", async (t) => {
  const f = await checkoutFixture(t); const send = api(t, f.user.id); const request = input(f); const before = await state(f);
  assert.equal((await api(t, null)(request)).status, 401);
  for (const origin of ["https://evil.example", "null", ""]) assert.equal((await send(request, { origin })).status, 403);
  assert.equal((await send(request, { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await send(request, { "content-type": "text/plain" })).status, 415);
  for (const value of [{ ...request, total: "0.01" }, { ...request, items: [{ ...request.items[0], price: "0.01" }] },
    { ...request, items: [request.items[0], request.items[0]] }, { ...request, items: [] }, { ...request, importId: "checkout-key" },
    { ...request, items: [{ ...request.items[0], quantity: 100 }] }, { ...request, items: Array.from({ length: 51 }, () => request.items[0]) }]) {
    assert.equal((await send(value)).status, 400);
  }
  assert.equal((await send("{", {}, true)).status, 400);
  assert.equal((await send(new Uint8Array([0xc3, 0x28]), {}, true)).status, 400);
  assert.equal((await send("é".repeat(MAX_GUEST_BYTES / 2 + 1), {}, true)).status, 413);
  assert.equal((await send(" ".repeat(MAX_GUEST_BYTES + 1), {}, true)).status, 413);
  assert.equal((await send(request, { "content-length": String(MAX_GUEST_BYTES + 1) })).status, 413);
  assert.equal(await quantity(f), 3); assert.deepEqual(await state(f), before);
  const response = await send(request); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).replayed, false);
  const replay = await send(request); assert.equal((await replay.json()).replayed, true); assert.equal(await quantity(f), 5);
  assert.equal((await send({ ...request, items: [{ ...request.items[0], quantity: 1 }] })).status, 409);
  await consumeRateLimit({ scope: "guest-cart-merge", identifier: f.user.id, limit: 60, windowMs: 60_000 });
  const key = createHash("sha256").update(`guest-cart-merge:${f.user.id}`).digest("hex");
  await prisma.rateLimitBucket.update({ where: { key }, data: { count: 60 } });
  const limited = await send(request); assert.equal(limited.status, 429); assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(await quantity(f), 5); assert.deepEqual(await state(f), before);
});

test("configured public origin remains valid when Next or the reverse proxy changes the internal URL", async (t) => {
  const f = await checkoutFixture(t);
  t.after(() => clearRateLimit("guest-cart-merge", f.user.id));
  const handler = createGuestMergeHandler(async () => f.user.id, "https://tienda.rosh.example");
  const request = (origin: string) => new Request("http://localhost:3000/api/cart/merge", {
    method: "POST", headers: { origin, "content-type": "application/json", host: "untrusted.example" }, body: JSON.stringify(input(f)),
  });
  assert.equal((await handler(request("https://untrusted.example"))).status, 403);
  assert.equal((await handler(request("http://localhost:3000"))).status, 403);
  assert.equal((await handler(request("https://tienda.rosh.example"))).status, 200);
  assert.equal(await quantity(f), 5);
});
