import { GUEST_CART_KEY, MAX_GUEST_ITEMS, MAX_GUEST_QUANTITY, normalizeGuestItems,
  readGuestSelection, serializeGuestSelection, type GuestLine } from "./guest-selection";

type Snapshot = {
  items: readonly GuestLine[];
  ready: boolean;
  storage: "loading" | "persistent" | "memory";
  warning: string;
  message: string;
};
type StorageAdapter = Pick<Storage, "getItem" | "setItem">;
type Dependencies = {
  storage?: () => StorageAdapter;
  listen?: (receive: (raw: string | null) => void) => () => void;
};
const serverSnapshot: Snapshot = { items: [], ready: false, storage: "loading", warning: "", message: "" };
const memoryWarning = "No podemos guardar tu selección en este navegador. Puedes seguir durante esta visita, pero podrías perderla al recargar o cerrar la página.";

/** One instance per provider; no singleton containing data across SSR requests/users. */
export function createGuestCartStore({ storage = () => window.localStorage, listen = (receive) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === GUEST_CART_KEY || event.key === null) receive(event.newValue);
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
} }: Dependencies = {}) {
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  let stopListening: (() => void) | undefined;
  const emit = () => listeners.forEach((listener) => listener());
  function persist() {
    if (snapshot.storage === "memory") return;
    try { storage().setItem(GUEST_CART_KEY, serializeGuestSelection(snapshot.items)); }
    catch { snapshot = { ...snapshot, storage: "memory", warning: memoryWarning }; }
  }
  function hydrate(refresh = false) {
    if ((snapshot.ready && !refresh) || snapshot.storage === "memory") return;
    try {
      const raw = storage().getItem(GUEST_CART_KEY);
      const decoded = readGuestSelection(raw);
      snapshot = { ...decoded, ready: true, storage: "persistent", warning: "" };
      // Read before any write. Repair invalid/extra fields only after decoding the saved selection.
      if (raw !== null && raw !== serializeGuestSelection(snapshot.items)) persist();
    } catch {
      snapshot = { ...snapshot, ready: true, storage: "memory", warning: memoryWarning };
    }
  }
  function commit(items: GuestLine[], message: string) {
    snapshot = { ...snapshot, items, message };
    persist();
    emit();
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      const first = listeners.size === 0;
      listeners.add(listener);
      hydrate(first && snapshot.ready);
      if (!stopListening) stopListening = listen((raw) => {
        if (snapshot.storage === "memory") return;
        const decoded = readGuestSelection(raw);
        snapshot = { ...snapshot, ...decoded };
        emit();
      });
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { stopListening?.(); stopListening = undefined; }
      };
    },
    add(productId: string) {
      if (!snapshot.ready || !normalizeGuestItems([{ productId, quantity: 1 }])) return;
      const existing = snapshot.items.find((item) => item.productId === productId);
      if (!existing && snapshot.items.length >= MAX_GUEST_ITEMS) {
        snapshot = { ...snapshot, message: "Tu carrito admite hasta 50 productos distintos. Elimina uno antes de añadir otro." }; emit(); return;
      }
      const items = existing ? snapshot.items.map((item) => item.productId === productId
        ? { ...item, quantity: Math.min(MAX_GUEST_QUANTITY, item.quantity + 1) } : item)
        : [...snapshot.items, { productId, quantity: 1 }];
      commit(items, "Producto añadido al carrito. La disponibilidad se verifica antes de comprar.");
    },
    update(productId: string, quantity: number) {
      if (!snapshot.ready || !normalizeGuestItems([{ productId, quantity }])) return;
      commit(snapshot.items.map((item) => item.productId === productId ? { productId, quantity } : item), "Cantidad actualizada.");
    },
    remove(productId: string) {
      if (!snapshot.ready) return;
      commit(snapshot.items.filter((item) => item.productId !== productId), "Producto eliminado del carrito.");
    },
    replace(value: readonly GuestLine[], message?: string) {
      const items = normalizeGuestItems(value);
      if (!snapshot.ready || !items) return;
      if (serializeGuestSelection(snapshot.items) === serializeGuestSelection(items)
        && (message === undefined || message === snapshot.message)) return;
      commit(items, message ?? snapshot.message);
    },
  };
}
