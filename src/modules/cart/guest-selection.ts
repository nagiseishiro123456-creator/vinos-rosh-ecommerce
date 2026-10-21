/** Browser-safe selection only. Prices and availability are always read from the server. */
export const GUEST_CART_KEY = "rosh-guest-cart-v1";
export const MAX_GUEST_ITEMS = 50;
export const MAX_GUEST_QUANTITY = 99;
export const MAX_GUEST_BYTES = 16 * 1024;
export const PRODUCT_ID_PATTERN = /^c[a-z0-9]{24}$/;

export type GuestLine = { productId: string; quantity: number };

export function normalizeGuestItems(value: unknown): GuestLine[] | null {
  if (!Array.isArray(value) || value.length > MAX_GUEST_ITEMS) return null;
  const quantities = new Map<string, number>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const { productId, quantity } = entry;
    if (typeof productId !== "string" || !PRODUCT_ID_PATTERN.test(productId)
      || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_GUEST_QUANTITY) return null;
    quantities.set(productId, Math.min(MAX_GUEST_QUANTITY, (quantities.get(productId) ?? 0) + quantity));
  }
  return Array.from(quantities, ([productId, quantity]) => ({ productId, quantity }));
}

export function serializeGuestSelection(items: readonly GuestLine[]) {
  return JSON.stringify({ version: 1, items: items.map(({ productId, quantity }) => ({ productId, quantity })) });
}

export function readGuestSelection(raw: string | null): { items: GuestLine[]; message: string } {
  if (raw === null) return { items: [], message: "" };
  try {
    if (raw.length > MAX_GUEST_BYTES || new TextEncoder().encode(raw).byteLength > MAX_GUEST_BYTES) throw new Error();
    const value = JSON.parse(raw);
    if (!value || value.version !== 1) throw new Error();
    const items = normalizeGuestItems(value.items);
    if (!items) throw new Error();
    return { items, message: items.length < value.items.length ? "Se agruparon productos repetidos y se ajustaron las cantidades." : "" };
  } catch {
    return { items: [], message: "No pudimos recuperar la selección guardada. El carrito se reinició; puedes añadir tus productos nuevamente." };
  }
}
