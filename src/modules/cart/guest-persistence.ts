import { MAX_GUEST_BYTES, PRODUCT_ID_PATTERN, normalizeGuestItems, readGuestSelection, type GuestLine } from "./guest-selection";

export const IMPORT_ID_PATTERN = /^(g2_[a-f0-9]{32}|g1_[a-f0-9]{64})$/;
export type PendingCartImport = { userId: string; importId: string; items: GuestLine[] };
export type GuestState = { revision: string; items: GuestLine[]; pending: PendingCartImport | null };

export function newGuestRevision() { return `g2_${crypto.randomUUID().replaceAll("-", "")}`; }
export function canonicalGuestItems(items: readonly GuestLine[]) {
  return items.map(({ productId, quantity }) => ({ productId, quantity })).sort((a, b) => a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0);
}
export function encodeGuestState(state: GuestState) {
  return JSON.stringify({ version: 2, revision: state.revision, items: state.items.map(({ productId, quantity }) => ({ productId, quantity })),
    pending: state.pending ? { userId: state.pending.userId, importId: state.pending.importId,
      items: state.pending.items.map(({ productId, quantity }) => ({ productId, quantity })) } : null });
}
export async function decodeGuestState(raw: string | null): Promise<{ state: GuestState; message: string }> {
  const empty = () => ({ revision: newGuestRevision(), items: [], pending: null });
  if (raw === null) return { state: empty(), message: "" };
  try {
    if (raw.length > MAX_GUEST_BYTES || new TextEncoder().encode(raw).byteLength > MAX_GUEST_BYTES) throw new Error();
    const value = JSON.parse(raw);
    if (value.version === 1) {
      const decoded = readGuestSelection(raw);
      if (decoded.message.includes("reinició")) throw new Error();
      const bytes = new TextEncoder().encode(JSON.stringify(canonicalGuestItems(decoded.items)));
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
      return { state: { revision: `g1_${digest}`, items: decoded.items, pending: null }, message: decoded.message };
    }
    if (value.version !== 2 || typeof value.revision !== "string" || !IMPORT_ID_PATTERN.test(value.revision)) throw new Error();
    const items = normalizeGuestItems(value.items);
    if (!items) throw new Error();
    let pending: PendingCartImport | null = null;
    if (value.pending !== null && value.pending !== undefined) {
      const p = value.pending;
      const selected = normalizeGuestItems(p.items);
      if (typeof p.userId !== "string" || !PRODUCT_ID_PATTERN.test(p.userId) || typeof p.importId !== "string"
        || !IMPORT_ID_PATTERN.test(p.importId) || !selected?.length || selected.length !== p.items.length) throw new Error();
      pending = { userId: p.userId, importId: p.importId, items: selected };
    }
    return { state: { revision: value.revision, items, pending }, message: "" };
  } catch {
    return { state: empty(), message: "No pudimos recuperar la selección guardada. El carrito se reinició; puedes añadir tus productos nuevamente." };
  }
}
