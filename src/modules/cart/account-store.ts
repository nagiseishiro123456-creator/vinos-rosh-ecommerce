import type { AccountCartSnapshot, CartCommand, CartCommandRequest, CartCommandResponse } from "./account-contract";

export type AccountCartState = {
  data: AccountCartSnapshot | null; status: "idle" | "loading" | "saving" | "error" | "expired";
  pending: CartCommandRequest | null; message: string; error: string;
};
type Dependencies = {
  request?: typeof fetch; operationId?: () => string; onChange?: () => void;
  listen?: (receive: () => void) => { stop: () => void; publish: () => void };
};
function validCart(value: unknown, userId: string): value is AccountCartSnapshot {
  const cart = value as AccountCartSnapshot | null;
  return Boolean(cart && cart.userId === userId && Number.isSafeInteger(cart.revision) && cart.revision >= 0
    && Array.isArray(cart.items) && typeof cart.subtotal === "string" && /^(0|[1-9]\d*)\.\d{2}$/.test(cart.subtotal)
    && cart.items.every((item) => typeof item.productId === "string" && Number.isSafeInteger(item.quantity) && item.quantity > 0));
}
const uncertain = "No pudimos confirmar el cambio. Conservamos esta operación; reintenta para comprobarla sin repetirla.";
export function createAccountCartStore(userId: string | null, initial: AccountCartSnapshot | null, {
  request = (...args) => fetch(...args), operationId = () => crypto.randomUUID(), onChange = () => {},
  listen = (receive) => {
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("rosh-account-cart-events-v1");
    if (channel) channel.onmessage = (event) => { if (event.data === "changed") receive(); };
    const visible = () => { if (document.visibilityState === "visible") receive(); };
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return { publish: () => channel?.postMessage("changed"), stop: () => {
      channel?.close(); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible);
    } };
  },
}: Dependencies = {}) {
  const serverSnapshot: AccountCartState = { data: initial, status: userId && !initial ? "error" : "idle", pending: null,
    message: "", error: userId && !initial ? "No pudimos cargar el carrito. Vuelve a verificarlo." : "" };
  let state = serverSnapshot, sequence = 0, running = false, disposed = false;
  let connection: ReturnType<NonNullable<Dependencies["listen"]>> | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const set = (value: Partial<AccountCartState>) => { state = { ...state, ...value }; emit(); };
  function accept(data: AccountCartSnapshot) {
    if (!state.data || data.revision >= state.data.revision) state = { ...state, data };
  }
  async function refresh() {
    if (!userId || running || disposed) return false;
    const token = ++sequence;
    if (!state.pending) set({ status: "loading", error: "" });
    try {
      const response = await request("/api/cart", { credentials: "same-origin", cache: "no-store" });
      const data: unknown = await response.json();
      if (token !== sequence || disposed) return false;
      if (response.status === 401) { set({ data: null, status: "expired", error: "Tu sesión venció. Vuelve a ingresar para revisar tu carrito." }); return false; }
      if (response.ok && data && typeof data === "object" && "userId" in data && data.userId !== userId) {
        set({ data: null, status: "expired", error: "La cuenta cambió. Vuelve a ingresar para revisar tu carrito." }); return false;
      }
      if (!response.ok || !validCart(data, userId)) throw new Error("Read failed");
      const changed = data.revision !== state.data?.revision;
      accept(data); set(state.pending ? {} : { status: "idle", error: "" });
      if (changed) onChange();
      return true;
    } catch {
      if (token === sequence && !disposed) set({ status: "error", error: state.pending ? uncertain : "No pudimos verificar el carrito. Reintenta antes de continuar." });
      return false;
    }
  }
  async function retry() {
    if (!userId || running || disposed) return false;
    const command = state.pending;
    if (!command) return refresh();
    running = true; const token = ++sequence; set({ status: "saving", error: "" });
    try {
      const response = await request("/api/cart", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const data = await response.json();
      if (disposed || token !== sequence) return false;
      if (response.status === 401) { set({ data: null, status: "expired", error: "Tu sesión venció. Ingresa con la cuenta de esta operación para comprobarla." }); return false; }
      if (response.status === 409 && data.code === "ACCOUNT_CHANGED" || response.ok && typeof data.userId === "string" && data.userId !== userId) {
        set({ data: null, status: "expired", error: "La cuenta cambió. Ingresa con la cuenta de esta operación para comprobarla." }); return false;
      }
      if (!response.ok) {
        const rejected = [400, 403, 409, 413, 415].includes(response.status);
        set({ status: "error", pending: rejected ? null : command,
          error: typeof data.message === "string" ? data.message : uncertain });
        return false;
      }
      const result = data as CartCommandResponse;
      if (result.userId !== userId || result.operationId !== command.operationId || !validCart(result.cart, userId)
        || !result.result || typeof result.result.adjusted !== "boolean") throw new Error("Invalid response");
      accept(result.cart); set({ status: "idle", pending: null, error: "", message: result.replayed
        ? "El cambio ya se había guardado. Comprobamos el carrito actual sin repetirlo."
        : result.result.adjusted ? "La disponibilidad o el límite cambió: se ajustó a " + result.result.quantity + " unidades."
          : command.action === "remove" ? "Producto eliminado del carrito." : "Carrito actualizado y guardado en tu cuenta." });
      connection?.publish(); onChange(); return true;
    } catch {
      if (!disposed && token === sequence) set({ status: "error", error: uncertain });
      return false;
    } finally { running = false; }
  }
  return {
    getSnapshot: () => state, getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!connection && userId) connection = listen(() => { void refresh(); });
      return () => { listeners.delete(listener); if (!listeners.size) { connection?.stop(); connection = null; } };
    },
    adopt(data: AccountCartSnapshot | null) {
      if (disposed || running || state.pending || state.status === "expired" || !data || data.userId !== userId) return;
      if (state.data && data.revision <= state.data.revision) return;
      accept(data); set({});
    },
    refresh, retry,
    command(command: CartCommand) {
      if (!userId || running || state.pending || state.status === "expired" || disposed) return Promise.resolve(false);
      set({ pending: { ...command, expectedUserId: userId, operationId: operationId() } }); return retry();
    },
    dispose() { disposed = true; sequence++; connection?.stop(); connection = null; listeners.clear(); },
  };
}
