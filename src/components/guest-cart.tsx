"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useGuestCart } from "@/components/guest-cart-provider";
import { formatPrice } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { serializeGuestSelection } from "@/modules/cart/guest-selection";
import type { GuestPreview } from "@/modules/cart/guest-preview";

class PreviewError extends Error {}
const unavailable = "No pudimos verificar los precios y la disponibilidad. Conservamos tu selección; vuelve a intentarlo.";
type Validation = { key: string; revision: number; data?: GuestPreview; error?: string };

function GuestQuantity({ productId, name, quantity, update }: {
  productId: string; name: string; quantity: number; update: (id: string, quantity: number) => void;
}) {
  const [draft, setDraft] = useState({ original: quantity, value: String(quantity) });
  // Reset only when the accepted quantity changes; keep the same focused DOM controls.
  if (draft.original !== quantity) setDraft({ original: quantity, value: String(quantity) });
  const value = draft.original === quantity ? draft.value : String(quantity);
  return (
    <form className="quantityForm" onSubmit={(event) => { event.preventDefault(); update(productId, Number(value)); }}>
      <label htmlFor={`guest-qty-${productId}`}>Cantidad <span className="sr-only">de {name}</span></label>
      <div>
        <input id={`guest-qty-${productId}`} name="quantity" type="number" min={1} max={99} step={1} required value={value}
          onChange={(event) => setDraft({ original: quantity, value: event.target.value })} />
        <button type="submit">Actualizar</button>
      </div>
    </form>
  );
}

export function GuestCart() {
  const { items, ready, warning, message, update, remove, replace, getSnapshot } = useGuestCart();
  const [revision, setRevision] = useState(0);
  const [validation, setValidation] = useState<Validation | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const key = serializeGuestSelection(items);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRevision((value) => value + 1); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  useEffect(() => {
    if (!ready || !items.length) return;
    const controller = new AbortController();
    let cancelled = false;
    const stillCurrent = () => !cancelled && serializeGuestSelection(getSnapshot().items) === key;
    fetch("/api/cart/preview", { method: "POST", credentials: "omit", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new PreviewError(typeof data.message === "string" ? data.message : unavailable);
        if (!Array.isArray(data.items) || typeof data.subtotal !== "string") throw new PreviewError(unavailable);
        if (!stillCurrent()) return;
        const preview = data as GuestPreview;
        const normalized = preview.items.map(({ productId, quantity }) => ({ productId, quantity }));
        setValidation({ key: serializeGuestSelection(normalized), revision, data: preview });
        const changes = preview.changes.map((change) => change.kind === "unavailable"
          ? "Se retiró un producto que ya no está disponible."
          : `La disponibilidad cambió: se ajustó un producto a ${change.quantity} unidades.`).join(" ");
        replace(normalized, changes || undefined);
      })
      .catch((error: unknown) => {
        if (!stillCurrent()) return;
        setValidation((previous) => ({ key, revision, data: previous?.data, error: error instanceof PreviewError ? error.message : unavailable }));
      });
    return () => { cancelled = true; controller.abort(); };
  }, [items, key, ready, revision, replace, getSnapshot]);

  const current = validation?.key === key && validation.revision === revision;
  const error = current ? validation?.error : undefined;
  const quote = current && !error ? validation?.data : undefined;
  const pending = ready && items.length > 0 && !current;
  const metadata = new Map(validation?.data?.items.map((item) => [item.productId, item]));
  const subtotal = ready && items.length === 0 ? "0.00" : quote?.subtotal;

  return (
    <section className="cartLayout shell guestCart" aria-busy={pending}>
      <div className="cartMain">
        <p className="eyebrow wine">TU SELECCIÓN</p>
        <h1 ref={heading} tabIndex={-1}>Carrito</h1>
        <p className="guestCartIntro">Selecciona tus productos sin iniciar sesión. Añadirlos no reserva disponibilidad.</p>
        {warning ? <p className="checkoutError" role="alert">{warning}</p> : null}
        <p className="guestCartStatus" role="status" aria-live="polite">{message}</p>
        <noscript><p className="checkoutError">El carrito invitado necesita JavaScript. Puedes explorar el catálogo o <Link href="/iniciar-sesion?callbackUrl=/carrito">ir al ingreso de tu cuenta</Link>.</p></noscript>
        {!ready ? <p role="status">Recuperando tu selección…</p> : null}
        {error ? <div className="checkoutError" role="alert"><p>{error}</p>
          <button className="button buttonDark" type="button" onClick={() => setRevision((value) => value + 1)}>Reintentar verificación</button></div> : null}
        {ready && !items.length ? (
          <div className="emptyPanel"><strong>Tu carrito está vacío.</strong><p>Explora el catálogo y añade tus productos favoritos.</p>
            <Link className="button buttonDark" href="/productos">Ver productos</Link></div>
        ) : <div className="cartItems">
          {items.map((item, index) => {
            const product = metadata.get(item.productId);
            const name = product?.name ?? `Producto ${index + 1} de tu selección`;
            const price = quote?.items.find((line) => line.productId === item.productId);
            return <article className="cartItem" key={item.productId}>
              {product ? <Link className="cartItemImage" href={`/productos/${product.slug}`}>
                <Image src={product.imageUrl ?? `${siteConfig.prototypeAssetsBase}/products.jpg`} alt={product.imageAlt ?? name} fill sizes="110px" />
              </Link> : <div className="guestImagePlaceholder" aria-hidden="true" />}
              <div className="cartItemInfo">
                {product ? <Link href={`/productos/${product.slug}`}><strong>{name}</strong></Link> : <strong>{name}</strong>}
                <span>{price ? `${formatPrice(price.unitPrice)} c/u` : error ? "Precio pendiente de verificar" : "Consultando precio actual…"}</span>
              </div>
              <GuestQuantity productId={item.productId} name={name} quantity={item.quantity} update={update} />
              <div className="cartItemTotal"><strong>{price ? formatPrice(price.lineTotal) : "—"}</strong>
                <button className="removeButton" type="button" aria-label={`Eliminar ${name}`} onClick={() => {
                  remove(item.productId); requestAnimationFrame(() => heading.current?.focus());
                }}>Eliminar</button></div>
            </article>;
          })}
        </div>}
        {items.length ? <Link className="textLink" href="/productos">Agregar más productos →</Link> : null}
      </div>
      <aside className="cartSummary" aria-label="Resumen de tu selección">
        <p className="eyebrow wine">RESUMEN</p>
        <div className="summaryRow"><span>Subtotal</span><strong>{subtotal ? formatPrice(subtotal) : "Por verificar"}</strong></div>
        <div className="summaryRow"><span>Envío</span><span>Se calcula por distrito</span></div>
        <div className="summaryTotal"><span>Total parcial</span><strong>{subtotal ? formatPrice(subtotal) : "Por verificar"}</strong></div>
        {pending ? <p className="summaryNote" role="status">Verificando precios y disponibilidad…</p> : null}
        {quote?.exceedsOrderLimit ? <p className="cartWarning" role="alert">El importe supera el máximo permitido para un pedido. Reduce productos o cantidades.</p> : null}
        <p className="summaryNote">Los precios y la disponibilidad pueden cambiar antes de confirmar. El envío se calcula durante la compra.</p>
        {items.length > 0 ? <>
          <button className="button guestRefresh fullButton" type="button" onClick={() => setRevision((value) => value + 1)}>Actualizar precios y disponibilidad</button>
          <Link className="button buttonPrimary fullButton" href="/iniciar-sesion?callbackUrl=/carrito">Ingresar a mi cuenta</Link>
          <p className="summaryNote">Al ingresar verás el carrito de tu cuenta. Esta selección como invitado permanece en este navegador.</p>
        </> : null}
      </aside>
    </section>
  );
}
