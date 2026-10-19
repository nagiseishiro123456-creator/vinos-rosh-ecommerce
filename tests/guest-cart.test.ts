import assert from "node:assert/strict";
import test from "node:test";
import { GUEST_CART_KEY, MAX_GUEST_BYTES, readGuestSelection, serializeGuestSelection } from "../src/modules/cart/guest-selection";
import { decodeGuestState, encodeGuestState } from "../src/modules/cart/guest-persistence";
import { createGuestCartStore, GuestImportAccountError } from "../src/modules/cart/guest-store";

const id = (n: number) => `c${n.toString(36).padStart(24, "0")}`;
const lines = [{ productId: id(1), quantity: 2 }];

function fixture(initial: string | null = null) {
  let saved = initial, failWrite = false;
  let stops = 0;
  const events: string[] = [];
  const listeners = new Set<() => void>();
  let lockQueue: Promise<unknown> = Promise.resolve();
  const lock = <T>(action: () => Promise<T>): Promise<T> => {
    const task = lockQueue.then(action); lockQueue = task.catch(() => {}); return task;
  };
  const make = (missingLock = false) => createGuestCartStore({ storage: () => ({
    getItem(key) { assert.equal(key, GUEST_CART_KEY); events.push("read"); return saved; },
    setItem(key, value) { assert.equal(key, GUEST_CART_KEY); events.push("write"); if (failWrite) throw new Error("QuotaExceededError"); saved = value; },
  }), lock: missingLock ? async () => { throw new Error("No lock"); } : lock,
  listen: (receive) => { listeners.add(receive); return () => { listeners.delete(receive); stops++; }; } });
  return { make, state: () => ({ saved, stops, events }), failWrites: () => { failWrite = true; },
    save: (raw: string | null) => { saved = raw; }, notify: () => listeners.forEach((receive) => receive()) };
}
async function open(f: ReturnType<typeof fixture>, missingLock = false) {
  const store = f.make(missingLock); const stop = store.subscribe(() => {}); await store.whenIdle(); return { store, stop };
}

test("legacy selection contains only IDs/quantities and normalizes duplicate lines within 99", () => {
  const decoded = readGuestSelection(JSON.stringify({ version: 1, password: "discard", items: [
    { productId: id(1), quantity: 98, price: "0.01" }, { productId: id(1), quantity: 3 },
  ] }));
  assert.deepEqual(decoded.items, [{ productId: id(1), quantity: 99 }]); assert.match(decoded.message, /agruparon/);
  assert.equal(serializeGuestSelection(decoded.items), JSON.stringify({ version: 1, items: decoded.items }));
});
test("corrupt, future, oversized or invalid selections recover explicitly", async () => {
  for (const raw of ["{", JSON.stringify({ version: 3, items: lines }), " ".repeat(MAX_GUEST_BYTES + 1),
    ...[0, -1, 100, 1.5, "2", null].map((quantity) => JSON.stringify({ version: 1, items: [{ productId: id(1), quantity }] })),
    JSON.stringify({ version: 1, items: [{ productId: "invalid", quantity: 1 }] }),
    JSON.stringify({ version: 1, items: Array.from({ length: 51 }, (_, i) => ({ productId: id(i), quantity: 1 })) })]) {
    const decoded = await decodeGuestState(raw); assert.deepEqual(decoded.state.items, []); assert.match(decoded.message, /reinició/);
  }
});
test("SSR snapshot reads before migrating storage and strips non-selection metadata", async () => {
  const f = fixture(JSON.stringify({ version: 1, secret: "discard", items: lines.map((line) => ({ ...line, price: "0.01" })) }));
  const store = f.make(); assert.equal(store.getSnapshot(), store.getServerSnapshot()); assert.deepEqual(f.state().events, []);
  const stop = store.subscribe(() => {}); await store.whenIdle();
  assert.deepEqual(store.getSnapshot().items, lines); assert.equal(store.getSnapshot().ready, true);
  assert.equal(f.state().events[0], "read"); assert.match(store.getSnapshot().revision, /^g1_[a-f0-9]{64}$/);
  assert.equal(f.state().saved!.includes("price"), false); assert.equal(f.state().saved!.includes("secret"), false);
  assert.equal(store.getSnapshot(), store.getSnapshot()); stop(); assert.equal(f.state().stops, 1);
});
test("legacy migration is canonical across two independently recovered tabs", async () => {
  const a = await decodeGuestState(serializeGuestSelection([...lines, { productId: id(2), quantity: 1 }]));
  const b = await decodeGuestState(serializeGuestSelection([{ productId: id(2), quantity: 1 }, ...lines]));
  assert.equal(a.state.revision, b.state.revision);
});
test("rapid queued additions, edits and removals preserve limits and the last action", async () => {
  const f = fixture(); const { store, stop } = await open(f);
  await Promise.all([store.add(id(1)), store.add(id(1)), store.update(id(1), 99), store.add(id(1)), store.update(id(1), -1)]);
  assert.equal(store.getSnapshot().items[0].quantity, 99);
  await store.remove(id(1)); assert.deepEqual(store.getSnapshot().items, []);
  await Promise.all(Array.from({ length: 51 }, (_, i) => store.add(id(i))));
  assert.equal(store.getSnapshot().items.length, 50); assert.match(store.getSnapshot().message, /50 productos/);
  assert.deepEqual(JSON.parse(f.state().saved!).items, store.getSnapshot().items); stop();
});
test("blocked storage remains editable in memory with a truthful warning", async () => {
  const store = createGuestCartStore({ storage: () => { throw new Error("SecurityError"); }, lock: (action) => action(), listen: () => () => {} });
  const stop = store.subscribe(() => {}); await store.whenIdle();
  assert.equal(store.getSnapshot().storage, "memory"); assert.match(store.getSnapshot().warning, /recargar/);
  await store.add(id(1)); await store.update(id(1), 3); assert.equal(store.getSnapshot().items[0].quantity, 3);
  await store.remove(id(1)); assert.deepEqual(store.getSnapshot().items, []); stop();
});
test("unavailable locks recover readable data in memory without unsafe writes", async () => {
  const f = fixture(serializeGuestSelection(lines)); const { store, stop } = await open(f, true);
  assert.equal(store.getSnapshot().storage, "memory"); assert.deepEqual(store.getSnapshot().items, lines);
  await store.add(id(1)); assert.equal(store.getSnapshot().items[0].quantity, 3);
  assert.equal(f.state().events.includes("write"), false); stop();
});
test("quota failure keeps new memory data and ignores stale disk events", async () => {
  const f = fixture(serializeGuestSelection(lines)); const { store, stop } = await open(f); f.failWrites();
  const previous = f.state().saved;
  await store.update(id(1), 3); assert.equal(store.getSnapshot().storage, "memory");
  assert.equal(store.getSnapshot().items[0].quantity, 3); assert.equal(f.state().saved, previous);
  f.save(null); f.notify(); await store.whenIdle(); assert.equal(store.getSnapshot().items[0].quantity, 3); stop();
});
test("corrupt storage repairs and cross-tab replacement/clearing are reflected", async () => {
  const f = fixture("corrupt"); const { store, stop } = await open(f);
  assert.match(store.getSnapshot().message, /reinició/); assert.equal(JSON.parse(f.state().saved!).version, 2);
  f.save(serializeGuestSelection(lines)); f.notify(); await store.whenIdle(); assert.deepEqual(store.getSnapshot().items, lines);
  f.save(null); f.notify(); await store.whenIdle(); assert.deepEqual(store.getSnapshot().items, []); stop();
});
test("resubscription reloads edits made while no consumer was mounted", async () => {
  const f = fixture(serializeGuestSelection(lines)); const { store, stop } = await open(f); stop();
  f.save(serializeGuestSelection([{ productId: id(1), quantity: 7 }]));
  const stopAgain = store.subscribe(() => {}); await store.whenIdle(); assert.equal(store.getSnapshot().items[0].quantity, 7); stopAgain();
});
test("two tabs claim the same immutable import and acknowledgements preserve later additions", async () => {
  const f = fixture(serializeGuestSelection(lines)); const a = await open(f); const b = await open(f);
  const [one, two] = await Promise.all([a.store.beginImport(id(9)), b.store.beginImport(id(9))]);
  assert.deepEqual(one, two); assert.deepEqual(one!.items, lines); assert.deepEqual(a.store.getSnapshot().items, []);
  await b.store.add(id(2)); await b.store.update(id(2), 4);
  await a.store.confirmImport(id(9), one!.importId);
  const saved = JSON.parse(f.state().saved!); assert.equal(saved.pending, null);
  assert.deepEqual(saved.items, [{ productId: id(2), quantity: 4 }]);
  await b.store.confirmImport(id(9), one!.importId); assert.deepEqual(b.store.getSnapshot().items, saved.items);
  a.stop(); b.stop();
});
test("lost response retains identity on reload and refuses reassignment to another account", async () => {
  const f = fixture(serializeGuestSelection(lines)); const a = await open(f);
  const pending = await a.store.beginImport(id(9)); a.stop();
  const b = await open(f); assert.deepEqual(await b.store.beginImport(id(9)), pending);
  const before = f.state().saved;
  await assert.rejects(b.store.beginImport(id(8)), GuestImportAccountError); assert.equal(f.state().saved, before);
  await b.store.confirmImport(id(8), pending!.importId); assert.deepEqual(b.store.getSnapshot().pending, pending);
  await b.store.confirmImport(id(9), pending!.importId); assert.equal(b.store.getSnapshot().pending, null); b.stop();
});
test("failed local acknowledgement reloads the same pending identity, never a new import", async () => {
  const f = fixture(serializeGuestSelection(lines)); const a = await open(f);
  const pending = await a.store.beginImport(id(9)); f.failWrites();
  await a.store.confirmImport(id(9), pending!.importId); assert.equal(a.store.getSnapshot().storage, "memory"); a.stop();
  const b = await open(f); assert.deepEqual(await b.store.beginImport(id(9)), pending); b.stop();
});
test("a later identical selection has a fresh identity; a stale preview cannot erase a queued edit", async () => {
  const f = fixture(serializeGuestSelection(lines)); const { store, stop } = await open(f);
  const first = await store.beginImport(id(9)); await store.confirmImport(id(9), first!.importId);
  await store.add(id(1)); await store.update(id(1), 2);
  const key = serializeGuestSelection(store.getSnapshot().items);
  await Promise.all([store.add(id(2)), store.replace(lines, undefined, key)]);
  assert.equal(store.getSnapshot().items.length, 2);
  await store.remove(id(2));
  const second = await store.beginImport(id(9)); assert.notEqual(first!.importId, second!.importId);
  assert.deepEqual(first!.items, second!.items); assert.equal(encodeGuestState(store.getSnapshot()).includes("price"), false); stop();
});
