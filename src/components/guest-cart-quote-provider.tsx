"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useGuestCart } from "./guest-cart-provider";
import { serializeGuestSelection } from "@/modules/cart/guest-selection";
import type { GuestPreview } from "@/modules/cart/guest-preview";

type Validation = { key: string; revision: number; data?: GuestPreview; error?: string };
type Quote = { quote?: GuestPreview; metadata: GuestPreview | undefined; pending: boolean; error?: string; refresh: () => void };
const Context = createContext<Quote | null>(null);
const unavailable = "No pudimos verificar los precios y la disponibilidad. Conservamos tu selección; vuelve a intentarlo.";
class PreviewError extends Error {}
export function GuestCartQuoteProvider({ children }: { children: ReactNode }) {
  const { items, revision: selectionRevision, ready, replace, getSnapshot } = useGuestCart();
  const [revision, setRevision] = useState(0);
  const [validation, setValidation] = useState<Validation | null>(null);
  const key = serializeGuestSelection(items);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRevision((value) => value + 1); };
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  useEffect(() => {
    if (!ready || !items.length) return;
    const controller = new AbortController(); let cancelled = false;
    const current = () => !cancelled && getSnapshot().revision === selectionRevision && serializeGuestSelection(getSnapshot().items) === key;
    fetch("/api/cart/preview", { method: "POST", credentials: "omit", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new PreviewError(typeof data.message === "string" ? data.message : unavailable);
      if (!Array.isArray(data.items) || typeof data.subtotal !== "string") throw new PreviewError(unavailable);
      if (!current()) return;
      const preview = data as GuestPreview;
      const normalized = preview.items.map(({ productId, quantity }) => ({ productId, quantity }));
      setValidation({ key: serializeGuestSelection(normalized), revision, data: preview });
      const changes = preview.changes.map((change) => change.kind === "unavailable" ? "Se retiró un producto que ya no está disponible."
        : "La disponibilidad cambió: se ajustó un producto a " + change.quantity + " unidades.").join(" ");
      void replace(normalized, changes || undefined, key, selectionRevision);
    }).catch((error: unknown) => {
      if (current()) setValidation((previous) => ({ key, revision, data: previous?.data, error: error instanceof PreviewError ? error.message : unavailable }));
    });
    return () => { cancelled = true; controller.abort(); };
  }, [items, key, ready, revision, selectionRevision, replace, getSnapshot]);
  const current = validation?.key === key && validation.revision === revision;
  const error = current ? validation?.error : undefined;
  return <Context.Provider value={{ quote: current && !error ? validation?.data : undefined, metadata: validation?.data,
    error, pending: ready && items.length > 0 && !current, refresh: () => setRevision((value) => value + 1) }}>{children}</Context.Provider>;
}
export function useGuestCartQuote() { const value = useContext(Context); if (!value) throw new Error("GuestCartQuoteProvider required"); return value; }
