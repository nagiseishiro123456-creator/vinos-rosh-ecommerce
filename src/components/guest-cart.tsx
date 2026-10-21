"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { useGuestCart } from "@/components/guest-cart-provider";
import { formatPrice } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import { useGuestCartQuote } from "./guest-cart-quote-provider";

function GuestQuantity({ productId, name, quantity, update }: {
  productId: string; name: string; quantity: number; update: (id: string, quantity: number) => void;
}) {
  const inputId = useId();
  const [draft, setDraft] = useState({ original: quantity, value: String(quantity) });
  // Reset only when the accepted quantity changes; keep the same focused DOM controls.
  if (draft.original !== quantity) setDraft({ original: quantity, value: String(quantity) });
  const value = draft.original === quantity ? draft.value : String(quantity);
  return (
    <form className="quantityForm" onSubmit={(event) => { event.preventDefault(); update(productId, Number(value)); }}>
      <label htmlFor={`guest-qty-${inputId}`}>Cantidad <span className="sr-only">de {name}</span></label>
      <div>
        <input id={`guest-qty-${inputId}`} name="quantity" type="number" min={1} max={99} step={1} required value={value}
          onChange={(event) => setDraft({ original: quantity, value: event.target.value })} />
        <button type="submit">Actualizar</button>
      </div>
    </form>
  );
}

export function GuestCart({ variant = "page" }: { variant?: "page" | "drawer" }) {
  const { items, pending: pendingImport, ready, warning, message, update, remove } = useGuestCart();
  const { quote, metadata: lastPreview, pending, error, refresh } = useGuestCartQuote();
  const heading = useRef<HTMLHeadingElement>(null);
  const Heading = variant === "page" ? "h1" : "h3";
  const metadata = new Map(lastPreview?.items.map((item) => [item.productId, item]));
  const subtotal = ready && items.length === 0 ? "0.00" : quote?.subtotal;
  return (
    <section className={"cartLayout guestCart " + (variant === "page" ? "shell" : "drawerCart")} aria-busy={ready ? pending : undefined}>
      <div className="cartMain">
        <p className="eyebrow wine">TU SELECCIÓN</p>
        <Heading ref={heading} tabIndex={-1}>{variant === "page" ? "Carrito" : "Tu selección"}</Heading>
        <p className="guestCartIntro">Selecciona tus productos sin iniciar sesión. Añadirlos no reserva disponibilidad.</p>
        {warning ? <p className="checkoutError" role="alert">{warning}</p> : null}
        <p className="guestCartStatus" role="status" aria-live="polite">{message}</p>
        {pendingImport ? <div className="checkoutWarningPanel guestPendingSelection" role="status">
          <strong>Tienes una selección pendiente de integrar.</strong>
          <p>{pendingImport.items.reduce((sum, item) => sum + item.quantity, 0)} unidades siguen conservadas para comprobar su integración. Las nuevas adiciones se preparan por separado.</p>
          <Link className="button buttonDark" href="/iniciar-sesion?callbackUrl=/carrito">Ingresar para reintentar</Link>
        </div> : null}
        <noscript>
          <style>{".guestCart .guestLoading, .guestCart .cartSummary { display: none; }"}</style>
          <p className="checkoutError">El carrito invitado necesita JavaScript. Puedes <Link href="/productos">explorar el catálogo</Link> o <Link href="/iniciar-sesion?callbackUrl=/carrito">ir al ingreso de tu cuenta</Link>.</p>
        </noscript>
        {!ready ? <p className="guestLoading" role="status">Recuperando tu selección…</p> : null}
        {error ? <div className="checkoutError" role="alert"><p>{error}</p>
          <button className="button buttonDark" type="button" onClick={refresh}>Reintentar verificación</button></div> : null}
        {ready && !items.length && !pendingImport ? (
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
          <button className="button guestRefresh fullButton" type="button" onClick={refresh}>Actualizar precios y disponibilidad</button>
          <Link className="button buttonPrimary fullButton" href="/iniciar-sesion?callbackUrl=/carrito">Ingresar a mi cuenta</Link>
          <p className="summaryNote">Al ingresar o crear tu cuenta integraremos esta selección con tu carrito y te mostraremos los ajustes. Añadir productos no reserva stock.</p>
        </> : null}
      </aside>
    </section>
  );
}
