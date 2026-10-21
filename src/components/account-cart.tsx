"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/money";
import { siteConfig } from "@/lib/site";
import type { AccountCartSnapshot } from "@/modules/cart/account-contract";
import { useAccountCart, useCartPanel } from "./cart-provider";

export type NativeCartActions = Record<string, { update: (formData: FormData) => Promise<void>; remove: () => Promise<void> }>;
function Quantity({ id, quantity, max, disabled, action, save }: { id: string; quantity: number; max: number; disabled: boolean;
  action?: (formData: FormData) => Promise<void>; save: (quantity: number) => void }) {
  const [draft, setDraft] = useState({ original: quantity, value: String(quantity) });
  if (draft.original !== quantity) setDraft({ original: quantity, value: String(quantity) });
  return <form className="quantityForm" action={action} onSubmit={(event) => { event.preventDefault(); save(Number(draft.value)); }}>
    <label htmlFor={id}>Cantidad</label><div><input id={id} name="quantity" type="number" min={1} max={Math.max(1, max)} required
      value={draft.value} disabled={disabled} onChange={(event) => setDraft({ original: quantity, value: event.target.value })} />
      <button type="submit" disabled={disabled}>Actualizar</button></div>
  </form>;
}
export function AccountCart({ initial, actions = {}, variant = "page", continuation = "/checkout", pageError }: {
  initial?: AccountCartSnapshot; actions?: NativeCartActions; variant?: "page" | "drawer"; continuation?: string; pageError?: string;
}) {
  const cart = useAccountCart(); const { store } = useCartPanel(); const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (initial) store.adopt(initial); }, [initial, store]);
  const ownerMatches = !initial || cart.userId === initial.userId;
  const data = ownerMatches ? cart.data : null;
  const loading = !ownerMatches || cart.status === "loading";
  const Heading = variant === "page" ? "h1" : "h3";
  const saving = cart.status === "saving";
  const disabled = !ownerMatches || saving || Boolean(cart.pending) || cart.status === "expired";
  const verified = ownerMatches && cart.status === "idle" && !cart.pending;
  const items = data?.items ?? [];
  return <section className={"cartLayout accountCart " + (variant === "page" ? "shell" : "drawerCart")} aria-busy={saving || loading}>
    <div className="cartMain">
      <p className="eyebrow wine">TU COMPRA</p><Heading ref={heading} tabIndex={-1}>{variant === "page" ? "Carrito" : "En tu cuenta"}</Heading>
      {pageError ? <div className="checkoutError" role="alert">{pageError === "too-many" ? "Espera un momento antes de volver a modificar el carrito." : "La disponibilidad, el importe o la cantidad cambió. Revisa el carrito antes de continuar."}</div> : null}
      <p className="accountCartStatus" role="status" aria-live="polite">{saving ? "Guardando el cambio en tu cuenta…"
        : loading ? "Verificando el carrito de tu cuenta…" : cart.message}</p>
      {cart.error ? <div className="checkoutError" role="alert"><p>{cart.error}</p>
        {cart.status === "expired" ? <Link className="button buttonDark" href="/iniciar-sesion?callbackUrl=/carrito">Volver a ingresar</Link>
          : <button className="button buttonDark" type="button" onClick={() => { void cart.retry(); }}>{cart.pending ? "Reintentar cambio" : "Actualizar carrito"}</button>}
      </div> : null}
      {items.length === 0 && !loading && cart.status !== "expired" ? <div className="emptyPanel"><strong>Tu carrito está vacío.</strong>
        <p>Explora el catálogo y agrega los productos que quieras revisar antes de comprar.</p><Link className="button buttonDark" href="/productos">Ver productos</Link></div>
        : <div className="cartItems">{items.map((item) => <article className="cartItem" key={item.id}>
          <Link className="cartItemImage" href={("/productos/" + item.slug) as Route}><Image src={item.imageUrl ?? siteConfig.prototypeAssetsBase + "/products.jpg"}
            alt={item.imageAlt ?? item.name} fill sizes="110px" /></Link>
          <div className="cartItemInfo"><Link href={("/productos/" + item.slug) as Route}><strong>{item.name}</strong></Link>
            <span>{item.unitPrice ? formatPrice(item.unitPrice) + " c/u" : "Precio no disponible"}</span>
            {!item.available ? <small className="cartWarning">Este producto ya no está disponible.</small>
              : item.quantity > item.maxQuantity ? <small className="cartWarning">Solo quedan {item.maxQuantity} unidades disponibles.</small> : null}
          </div>
          <Quantity id={(variant === "drawer" ? "drawer-" : "") + "qty-" + item.id} quantity={item.quantity} max={item.maxQuantity}
            disabled={disabled || !item.available} action={actions[item.productId]?.update}
            save={(quantity) => { void cart.command({ action: "set", productId: item.productId, quantity }); }} />
          <div className="cartItemTotal"><strong>{item.lineTotal ? formatPrice(item.lineTotal) : "Por verificar"}</strong>
            <form action={actions[item.productId]?.remove} onSubmit={(event) => {
              event.preventDefault(); void cart.command({ action: "remove", productId: item.productId }).then((ok) => { if (ok) heading.current?.focus({ preventScroll: true }); });
            }}><button className="removeButton" type="submit" disabled={disabled}>Eliminar</button></form>
          </div>
        </article>)}</div>}
      {items.length ? <Link className="textLink" href="/productos">Agregar más productos →</Link> : null}
    </div>
    <aside className="cartSummary" aria-label="Resumen de compra">
      <p className="eyebrow wine">RESUMEN</p>
      <div className="summaryRow"><span>Subtotal</span><strong>{data ? formatPrice(data.subtotal) : "Por verificar"}</strong></div>
      <div className="summaryRow"><span>Envío</span><span>Se calcula por distrito</span></div>
      <div className="summaryTotal"><span>Total parcial</span><strong>{data ? formatPrice(data.subtotal) : "Por verificar"}</strong></div>
      <p className="summaryNote">El costo de envío se confirmará antes del pago. Añadir productos no reserva stock.</p>
      {data?.exceedsOrderLimit ? <p className="cartWarning" role="alert">El importe supera el máximo permitido. Reduce productos o cantidades.</p> : null}
      {items.length > 0 && !data?.hasInvalidItems && !data?.exceedsOrderLimit && verified ? <Link className="button buttonPrimary fullButton"
        href={(continuation === "/carrito" ? "/checkout" : continuation) as Route}>
        {continuation === "/checkout" || continuation === "/carrito" ? "Continuar al checkout" : "Continuar con mi compra"}</Link>
        : <button className="button buttonDisabled fullButton" type="button" disabled>{items.length === 0 ? "Agrega productos para continuar"
          : !verified ? "Verifica el carrito para continuar" : "Corrige el carrito para continuar"}</button>}
    </aside>
  </section>;
}
