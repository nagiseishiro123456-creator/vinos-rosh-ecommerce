import { GUEST_CART_KEY, MAX_GUEST_ITEMS, MAX_GUEST_QUANTITY, normalizeGuestItems, serializeGuestSelection, type GuestLine } from "./guest-selection";
import { decodeGuestState, encodeGuestState, newGuestRevision, type GuestState } from "./guest-persistence";

type Snapshot = GuestState & {
  ready: boolean; busy: boolean; storage: "loading" | "persistent" | "memory"; warning: string; message: string;
};
type StorageAdapter = Pick<Storage, "getItem" | "setItem">;
type Lock = <T>(action: () => Promise<T>) => Promise<T>;
type Dependencies = { storage?: () => StorageAdapter; lock?: Lock; listen?: (receive: () => void) => () => void };
const serverSnapshot: Snapshot = { revision: "", items: [], pending: null, ready: false, busy: false, storage: "loading", warning: "", message: "" };
const memoryWarning = "No podemos guardar tu selección de forma segura en este navegador. Puedes seguir durante esta visita, pero podrías perderla al recargar o cerrar la página.";
export class GuestImportAccountError extends Error {}

/** Per-provider state. Web Locks serialize all disk mutations; network never holds the lock. */
export function createGuestCartStore({ storage = () => window.localStorage, lock = async (action) => {
  if (!navigator.locks) throw new Error("Web Locks unavailable");
  return navigator.locks.request(`${GUEST_CART_KEY}:lock`, action);
}, listen = (receive) => {
  const onStorage = (event: StorageEvent) => { if (event.key === GUEST_CART_KEY || event.key === null) receive(); };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
} }: Dependencies = {}) {
  let snapshot = serverSnapshot;
  let savedRaw: string | null | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  let queued = 0;
  const listeners = new Set<() => void>();
  let stopListening: (() => void) | undefined;
  const emit = () => listeners.forEach((listener) => listener());
  function memory() { snapshot = { ...snapshot, storage: "memory", warning: memoryWarning }; }
  function persist() {
    if (snapshot.storage === "memory") return;
    try { const raw = encodeGuestState(snapshot); storage().setItem(GUEST_CART_KEY, raw); savedRaw = raw; }
    catch { memory(); }
  }
  async function hydrate() {
    if (snapshot.ready && snapshot.storage === "memory") return;
    try {
      const raw = storage().getItem(GUEST_CART_KEY);
      if (snapshot.ready && raw === savedRaw) return;
      const decoded = await decodeGuestState(raw);
      snapshot = { ...snapshot, ...decoded.state, ready: true, message: decoded.message,
        storage: snapshot.storage === "memory" ? "memory" : "persistent" };
      savedRaw = raw;
      if (raw !== encodeGuestState(snapshot)) persist();
    } catch {
      memory();
      snapshot = { ...snapshot, ready: true, revision: snapshot.revision || newGuestRevision() };
    }
  }
  function enqueue<T>(action: () => T | Promise<T>): Promise<T> {
    queued++;
    snapshot = { ...snapshot, busy: true }; emit();
    const task = queue.then(async () => {
      const run = async () => { await hydrate(); return action(); };
      if (snapshot.storage === "memory") return run();
      let entered = false;
      try { return await lock(async () => { entered = true; return run(); }); }
      catch (error) {
        if (entered) throw error;
        // Without a cross-tab lock recover readable selection once, without disk writes.
        memory(); return run();
      }
    }).finally(() => {
      queued--;
      snapshot = { ...snapshot, busy: queued > 0 }; emit();
    });
    queue = task.catch(() => undefined);
    return task;
  }
  function commit(items: GuestLine[], message: string) {
    const changed = serializeGuestSelection(items) !== serializeGuestSelection(snapshot.items);
    snapshot = { ...snapshot, items, revision: changed ? newGuestRevision() : snapshot.revision, message };
    persist();
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    whenIdle: () => queue,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!stopListening) {
        stopListening = listen(() => { void enqueue(() => {}); });
        void enqueue(() => {});
      }
      return () => { listeners.delete(listener); if (!listeners.size) { stopListening?.(); stopListening = undefined; } };
    },
    add(productId: string) { return enqueue(() => {
      if (!normalizeGuestItems([{ productId, quantity: 1 }])) return;
      const existing = snapshot.items.find((item) => item.productId === productId);
      if (!existing && snapshot.items.length >= MAX_GUEST_ITEMS) {
        snapshot = { ...snapshot, message: "Tu carrito admite hasta 50 productos distintos. Elimina uno antes de añadir otro." }; return;
      }
      commit(existing ? snapshot.items.map((item) => item.productId === productId
        ? { ...item, quantity: Math.min(MAX_GUEST_QUANTITY, item.quantity + 1) } : item)
        : [...snapshot.items, { productId, quantity: 1 }], "Producto añadido al carrito. La disponibilidad se verifica antes de comprar.");
    }); },
    update(productId: string, quantity: number) { return enqueue(() => {
      if (!normalizeGuestItems([{ productId, quantity }])) return;
      commit(snapshot.items.map((item) => item.productId === productId ? { productId, quantity } : item), "Cantidad actualizada.");
    }); },
    remove(productId: string) { return enqueue(() => {
      commit(snapshot.items.filter((item) => item.productId !== productId), "Producto eliminado del carrito.");
    }); },
    replace(value: readonly GuestLine[], message?: string, expectedSelection?: string) { return enqueue(() => {
      if (expectedSelection !== undefined && serializeGuestSelection(snapshot.items) !== expectedSelection) return;
      const items = normalizeGuestItems(value);
      if (!items) return;
      if (serializeGuestSelection(snapshot.items) === serializeGuestSelection(items) && (message === undefined || message === snapshot.message)) return;
      commit(items, message ?? snapshot.message);
    }); },
    beginImport(userId: string) { return enqueue(() => {
      if (snapshot.pending) {
        if (snapshot.pending.userId !== userId) throw new GuestImportAccountError();
        return snapshot.pending;
      }
      if (!snapshot.items.length) return null;
      const pending = { userId, importId: snapshot.revision, items: snapshot.items };
      snapshot = { ...snapshot, pending, items: [], revision: newGuestRevision(), message: "Tu selección está pendiente de integrarse a tu cuenta." };
      persist(); return pending;
    }); },
    confirmImport(userId: string, importId: string) { return enqueue(() => {
      if (snapshot.pending?.userId === userId && snapshot.pending.importId === importId) {
        snapshot = { ...snapshot, pending: null, message: "Tu selección se integró al carrito de tu cuenta." };
        persist();
      }
    }); },
  };
}
