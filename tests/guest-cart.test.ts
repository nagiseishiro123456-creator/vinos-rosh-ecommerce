import assert from "node:assert/strict";
import test from "node:test";

import { GUEST_CART_KEY, MAX_GUEST_BYTES, readGuestSelection, serializeGuestSelection } from "../src/modules/cart/guest-selection";
import { createGuestCartStore } from "../src/modules/cart/guest-store";

const id = (n: number) => `c${n.toString(36).padStart(24, "0")}`;
const lines = [{ productId: id(1), quantity: 2 }];

function fixture(initial: string | null = null, failWrite = false) {
  let saved = initial;
  let reads = 0, writes = 0, stops = 0;
  let receive: (raw: string | null) => void = () => {};
  const store = createGuestCartStore({ storage: () => ({
    getItem(key) { assert.equal(key, GUEST_CART_KEY); reads++; return saved; },
    setItem(key, value) { assert.equal(key, GUEST_CART_KEY); writes++; if (failWrite) throw new Error("QuotaExceededError"); saved = value; },
  }), listen: (callback) => { receive = callback; return () => { stops++; }; } });
  return { store, state: () => ({ saved, reads, writes, stops }), external: (raw: string | null) => receive(raw), save: (raw: string | null) => { saved = raw; } };
}

test("guest storage contains only IDs/quantities and normalizes duplicate lines within 99", () => {
  const decoded = readGuestSelection(JSON.stringify({ version: 1, password: "discard", items: [
    { productId: id(1), quantity: 98, price: "0.01", name: "Forged" }, { productId: id(1), quantity: 3 },
  ] }));
  assert.deepEqual(decoded.items, [{ productId: id(1), quantity: 99 }]);
  assert.match(decoded.message, /agruparon/);
  assert.equal(serializeGuestSelection(decoded.items), JSON.stringify({ version: 1, items: [{ productId: id(1), quantity: 99 }] }));
});

test("corrupt, future, oversized or invalid guest selections recover explicitly instead of trusting data", () => {
  const invalid = ["{", JSON.stringify({ version: 2, items: lines }), " ".repeat(MAX_GUEST_BYTES + 1),
    ...[0, -1, 100, 1.5, "2", null].map((quantity) => JSON.stringify({ version: 1, items: [{ productId: id(1), quantity }] })),
    JSON.stringify({ version: 1, items: [{ productId: "invalid", quantity: 1 }] }),
    JSON.stringify({ version: 1, items: Array.from({ length: 51 }, (_, i) => ({ productId: id(i), quantity: 1 })) })];
  for (const raw of invalid) { const decoded = readGuestSelection(raw); assert.deepEqual(decoded.items, []); assert.match(decoded.message, /reinició/); }
  assert.deepEqual(readGuestSelection(null), { items: [], message: "" });
});

test("SSR/initial snapshot never overwrites the saved selection before hydration", () => {
  const f = fixture(serializeGuestSelection(lines));
  assert.equal(f.store.getSnapshot(), f.store.getServerSnapshot());
  assert.deepEqual(f.state(), { saved: serializeGuestSelection(lines), reads: 0, writes: 0, stops: 0 });
  const stop = f.store.subscribe(() => {});
  assert.deepEqual(f.store.getSnapshot().items, lines);
  assert.equal(f.store.getSnapshot().ready, true);
  assert.equal(f.state().writes, 0);
  assert.equal(f.store.getSnapshot(), f.store.getSnapshot());
  stop(); assert.equal(f.state().stops, 1);
});

test("rapid additions, updates and removals respect line/unit limits and persist canonical data", () => {
  const f = fixture(); const stop = f.store.subscribe(() => {});
  f.store.add(id(1)); f.store.add(id(1));
  assert.equal(f.store.getSnapshot().items[0].quantity, 2);
  f.store.update(id(1), 99); f.store.add(id(1)); f.store.update(id(1), -1);
  assert.equal(f.store.getSnapshot().items[0].quantity, 99);
  f.store.remove(id(1)); assert.deepEqual(f.store.getSnapshot().items, []);
  for (let i = 0; i < 51; i++) f.store.add(id(i));
  assert.equal(f.store.getSnapshot().items.length, 50);
  assert.match(f.store.getSnapshot().message, /50 productos/);
  assert.deepEqual(JSON.parse(f.state().saved!).items, f.store.getSnapshot().items);
  stop();
});

test("blocked reads preserve an editable in-memory selection with a truthful persistence warning", () => {
  const store = createGuestCartStore({ storage: () => { throw new Error("SecurityError"); }, listen: () => () => {} });
  const stop = store.subscribe(() => {});
  assert.equal(store.getSnapshot().storage, "memory"); assert.match(store.getSnapshot().warning, /recargar/);
  store.add(id(1)); store.update(id(1), 3);
  assert.equal(store.getSnapshot().items[0].quantity, 3);
  store.remove(id(1)); assert.deepEqual(store.getSnapshot().items, []); stop();
});

test("quota failure keeps the new selection in memory and does not replace it with an old external copy", () => {
  const f = fixture(serializeGuestSelection(lines), true); const stop = f.store.subscribe(() => {});
  f.store.update(id(1), 3);
  assert.equal(f.store.getSnapshot().storage, "memory"); assert.equal(f.store.getSnapshot().items[0].quantity, 3);
  assert.equal(f.state().saved, serializeGuestSelection(lines));
  f.external(serializeGuestSelection([])); assert.equal(f.store.getSnapshot().items[0].quantity, 3);
  stop();
});

test("corrupt storage is repaired with an announcement; valid cross-tab edits and clearing replace selection", () => {
  const f = fixture("corrupt"); const stop = f.store.subscribe(() => {});
  assert.match(f.store.getSnapshot().message, /reinició/);
  assert.equal(f.state().saved, serializeGuestSelection([]));
  f.external(serializeGuestSelection(lines)); assert.deepEqual(f.store.getSnapshot().items, lines);
  f.external(null); assert.deepEqual(f.store.getSnapshot().items, []); stop();
});

test("returning to a subscribed page reloads edits made in another tab while no consumer was mounted", () => {
  const f = fixture(serializeGuestSelection(lines));
  const stop = f.store.subscribe(() => {}); stop();
  f.save(serializeGuestSelection([{ productId: id(1), quantity: 7 }]));
  const stopAgain = f.store.subscribe(() => {});
  assert.equal(f.store.getSnapshot().items[0].quantity, 7);
  assert.equal(f.state().writes, 0); stopAgain();
});
