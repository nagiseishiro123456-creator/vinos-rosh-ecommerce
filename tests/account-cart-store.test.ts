import assert from "node:assert/strict";
import test from "node:test";
import { createAccountCartStore } from "../src/modules/cart/account-store";
import type { AccountCartSnapshot, CartCommandRequest } from "../src/modules/cart/account-contract";

const userId = "c" + "1".repeat(24), productId = "c" + "2".repeat(24);
const operationId = "11111111-1111-4111-8111-111111111111";
function cart(revision = 0, quantity = 3): AccountCartSnapshot {
  return { userId, revision, items: [{ id: "line", productId, quantity, name: "Botella QA", slug: "qa", unitPrice: "29.90",
    lineTotal: (29.9 * quantity).toFixed(2), maxQuantity: 10, available: true, imageUrl: null, imageAlt: null }],
    subtotal: (29.9 * quantity).toFixed(2), hasInvalidItems: false, exceedsOrderLimit: false };
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
function confirmed(request: CartCommandRequest, revision = 1, quantity = 4, replayed = false) {
  return json({ userId, operationId: request.operationId, replayed, result: { productId, quantity, adjusted: false }, cart: cart(revision, quantity) });
}
const noEvents = () => ({ stop() {}, publish() {} });
test("account SSR and anonymous stores do not request private data", async () => {
  let requests = 0;
  const store = createAccountCartStore(null, null, { request: async () => { requests++; throw new Error(); }, listen: noEvents });
  assert.equal(store.getSnapshot(), store.getServerSnapshot());
  await store.refresh(); await store.command({ action: "add", productId }); assert.equal(requests, 0);
  assert.equal(store.getSnapshot().data, null);
});
test("lost response retries the same identity after refreshing current server state", async () => {
  const sent: CartCommandRequest[] = []; let committed = false, changes = 0;
  const store = createAccountCartStore(userId, cart(), { operationId: () => operationId, listen: noEvents, onChange: () => changes++,
    request: async (_url, options) => {
      if (!options?.method) return json(cart(2, 6));
      const request = JSON.parse(String(options.body)); sent.push(request);
      if (!committed) { committed = true; throw new Error("Response lost after commit"); }
      return confirmed(request, 2, 6, true);
    } });
  assert.equal(await store.command({ action: "add", productId }), false);
  assert.equal(store.getSnapshot().data?.items[0].quantity, 3); assert.equal(store.getSnapshot().pending?.operationId, operationId);
  assert.match(store.getSnapshot().error, /sin repetirla/);
  assert.equal(await store.command({ action: "add", productId }), false); assert.equal(sent.length, 1);
  await store.refresh(); assert.equal(store.getSnapshot().data?.items[0].quantity, 6); assert.ok(store.getSnapshot().pending);
  assert.equal(await store.retry(), true); assert.deepEqual(sent[0], sent[1]); assert.equal(store.getSnapshot().pending, null);
  assert.equal(store.getSnapshot().data?.revision, 2); assert.match(store.getSnapshot().message, /sin repetirlo/); assert.equal(changes, 2);
});
test("old read and old SSR cannot overwrite a confirmed mutation", async () => {
  let release!: (response: Response) => void;
  const store = createAccountCartStore(userId, cart(), { operationId: () => operationId, listen: noEvents,
    request: async (_url, options) => options?.method ? confirmed(JSON.parse(String(options.body)))
      : new Promise<Response>((resolve) => { release = resolve; }) });
  const oldRead = store.refresh(); await store.command({ action: "add", productId });
  release(json(cart())); await oldRead; store.adopt(cart());
  assert.equal(store.getSnapshot().data?.items[0].quantity, 4); assert.equal(store.getSnapshot().status, "idle");
});
test("out of order reads and another user payload never replace the account cart", async () => {
  const resolvers: ((response: Response) => void)[] = [];
  const store = createAccountCartStore(userId, cart(), { listen: noEvents,
    request: async () => new Promise<Response>((resolve) => resolvers.push(resolve)) });
  const first = store.refresh(), second = store.refresh(); resolvers[1](json(cart(3, 7))); await second;
  resolvers[0](json(cart(1, 4))); await first; assert.equal(store.getSnapshot().data?.revision, 3);
  const third = store.refresh(); resolvers[2](json({ ...cart(4, 9), userId: "another-user" })); await third;
  assert.equal(store.getSnapshot().data?.items[0].quantity, 7); assert.equal(store.getSnapshot().status, "error");
});
test("401 removes private data and disposed or old server replies cannot restore it", async () => {
  const store = createAccountCartStore(userId, cart(), { listen: noEvents, request: async () => json({}, 401) });
  await store.refresh(); store.adopt(cart(5, 9));
  assert.equal(store.getSnapshot().data, null); assert.equal(store.getSnapshot().status, "expired");
  let release!: (response: Response) => void, changes = 0;
  const old = createAccountCartStore(userId, cart(), { operationId: () => operationId, listen: noEvents, onChange: () => changes++,
    request: async () => new Promise<Response>((resolve) => { release = resolve; }) });
  const request = old.command({ action: "add", productId }); const pending = old.getSnapshot().pending!; old.dispose();
  release(confirmed(pending)); await request; assert.equal(changes, 0); assert.equal(old.getSnapshot().data?.revision, 0);
});
test("rapid duplicate intents and transient errors retain one pending operation", async () => {
  let requests = 0, release!: (response: Response) => void;
  const store = createAccountCartStore(userId, cart(), { operationId: () => operationId, listen: noEvents,
    request: async () => { requests++; return new Promise<Response>((resolve) => { release = resolve; }); } });
  const first = store.command({ action: "add", productId });
  assert.equal(await store.command({ action: "add", productId }), false); assert.equal(requests, 1);
  release(json({}, 503)); await first; assert.equal(store.getSnapshot().pending?.operationId, operationId);
  const retry = store.retry(); release(json({ message: "Espera" }, 429)); await retry;
  assert.equal(store.getSnapshot().pending?.operationId, operationId); assert.equal(store.getSnapshot().status, "error");
});
test("definite refusal can be verified; invalid success remains uncertain", async () => {
  let attempt = 0;
  const store = createAccountCartStore(userId, cart(), { operationId: () => operationId, listen: noEvents,
    request: async (_url, options) => {
      if (!options?.method) return json(cart());
      return ++attempt === 1 ? json({ message: "Sin disponibilidad" }, 409) : json({ userId: "wrong-owner", cart: cart(1, 4) });
    } });
  await store.command({ action: "add", productId }); assert.equal(store.getSnapshot().pending, null);
  assert.match(store.getSnapshot().error, /disponibilidad/); await store.retry(); assert.equal(store.getSnapshot().status, "idle");
  await store.command({ action: "add", productId }); assert.ok(store.getSnapshot().pending); assert.equal(store.getSnapshot().data?.revision, 0);
});
test("invalidation re-reads; subscriptions release browser resources", async () => {
  let receive!: () => void, stops = 0, publishes = 0, requests = 0;
  const store = createAccountCartStore(userId, cart(), { operationId: () => operationId,
    listen: (handler) => { receive = handler; return { stop: () => stops++, publish: () => publishes++ }; },
    request: async (_url, options) => { requests++; return options?.method ? confirmed(JSON.parse(String(options.body)), 2, 5) : json(cart(1, 4)); } });
  const stop = store.subscribe(() => {}); receive(); await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(store.getSnapshot().data?.items[0].quantity, 4);
  await store.command({ action: "add", productId }); assert.equal(publishes, 1); assert.equal(requests, 2);
  stop(); assert.equal(stops, 1);
});
