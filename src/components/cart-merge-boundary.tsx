"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useGuestCart } from "@/components/guest-cart-provider";
import { GuestImportAccountError } from "@/modules/cart/guest-store";
import { safeInternalDestination } from "@/modules/auth/destination";
import type { CartMergeResponse } from "@/modules/cart/guest-merge";

class MergeResponseError extends Error { constructor(message: string, public status: number) { super(message); } }
type Failure = { key: string; message: string; signIn: boolean };

export function CartMergeBoundary({ userId, renderId, returnTo = "/carrito", children }: { userId: string; renderId: string; returnTo?: string; children: ReactNode }) {
  const { ready, busy, items, pending, revision, warning, beginImport, confirmImport } = useGuestCart();
  const router = useRouter();
  const [retry, setRetry] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [result, setResult] = useState<CartMergeResponse | null>(null);
  const workKey = pending?.importId ?? (items.length ? revision : "");
  const [lastWork, setLastWork] = useState<{ key: string; renderId: string } | null>(null);
  if (workKey && (lastWork?.key !== workKey || lastWork.renderId !== renderId)) setLastWork({ key: workKey, renderId });
  const refreshing = !workKey && lastWork?.renderId === renderId;
  useEffect(() => { if (refreshing) router.refresh(); }, [refreshing, router]);

  useEffect(() => {
    if (!ready || !workKey) return;
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const selection = await beginImport(userId);
        if (!selection || cancelled) return;
        const response = await fetch("/api/cart/merge", { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importId: selection.importId, expectedUserId: userId, items: selection.items }) });
        const data = await response.json();
        if (!response.ok) throw new MergeResponseError(typeof data.message === "string" ? data.message : "No pudimos confirmar la integración.", response.status);
        if (data.userId !== userId || data.importId !== selection.importId || !Array.isArray(data.result?.changes)) throw new Error("Invalid response");
        if (cancelled) return;
        setResult(data as CartMergeResponse); setFailure(null);
        await confirmImport(userId, selection.importId);
        // The work-to-empty transition refreshes server data, including acknowledgements from another tab.
      } catch (error) {
        if (cancelled) return;
        setFailure({ key: workKey,
          signIn: error instanceof GuestImportAccountError || error instanceof MergeResponseError && [401, 409].includes(error.status),
          message: error instanceof GuestImportAccountError
            ? "Esta selección está vinculada a otra cuenta. Ingresa con la cuenta utilizada para comprobarla; conservamos el pendiente."
            : error instanceof MergeResponseError ? error.message
              : "No pudimos confirmar la integración. Conservamos la selección pendiente; puedes reintentar sin duplicarla." });
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [ready, workKey, retry, userId, renderId, beginImport, confirmImport, router]);

  const blocked = !ready || busy || Boolean(workKey) || refreshing;
  const error = failure?.key === workKey ? failure : null;
  const adjusted = result?.result.changes.length ?? 0;
  return <>
    <noscript><style>{".cartMergeProtected[data-merge-blocked] { display: contents !important; } .cartMergeGate { display: none !important; }"}</style>
      <p className="shell summaryNote">La selección invitada necesita JavaScript para integrarse. Puedes utilizar el carrito de tu cuenta con los formularios de esta página.</p></noscript>
    {blocked ? <section className="cartMergeGate shell" aria-label="Integración de tu selección" aria-busy={!error}>
      <p className="eyebrow wine">TU COMPRA</p><h1>Conservamos tu selección</h1>
      {error ? <div className="checkoutError" role="alert"><p>{error.message}</p>
        <button className="button buttonDark" type="button" onClick={() => { setFailure(null); setRetry((value) => value + 1); }}>Reintentar integración</button>
        {error.signIn ? <Link className="textLink" href={`/iniciar-sesion?callbackUrl=${encodeURIComponent(safeInternalDestination(returnTo, "/carrito"))}`}>Volver a ingresar</Link> : null}
      </div> : <p role="status">{refreshing ? "Actualizando el carrito de tu cuenta…" : "Integrando tu selección con el carrito de tu cuenta…"}</p>}
      <p className="summaryNote">Verificamos disponibilidad y cantidades antes de continuar. Esta operación no reserva botellas.</p>
      {warning ? <p className="checkoutError" role="alert">{warning}</p> : null}
    </section> : result ? <section className="cartMergeResult shell" aria-label="Resultado de la integración" role="status">
      <strong>{result.replayed ? "Tu selección ya se había integrado. Comprobamos el resultado sin volver a sumarla." : "Tu selección se integró al carrito de tu cuenta."}</strong>
      {adjusted ? <><p>La disponibilidad o el límite de cantidad cambió. Revisa estos ajustes antes de continuar:</p>
        <ul>{result.result.changes.map((change) => <li key={change.productId}>{change.kind === "unavailable"
          ? "Se retiró un producto que ya no está disponible." : `Se ajustó un producto a ${change.quantity} unidades por disponibilidad o límite de compra.`}</li>)}</ul></>
        : <p>Revisa las cantidades y el total actuales antes de continuar. Todavía no se reservó stock.</p>}
      {warning ? <p>{warning}</p> : null}
    </section> : null}
    <div className="cartMergeProtected" data-merge-blocked={blocked ? "true" : undefined}>{children}</div>
  </>;
}
