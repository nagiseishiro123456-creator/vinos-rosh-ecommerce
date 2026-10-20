"use client";

import Link from "next/link";
import { useCartPanel } from "./cart-provider";

import { useGuestCart } from "@/components/guest-cart-provider";
import { MAX_GUEST_ITEMS, MAX_GUEST_QUANTITY } from "@/modules/cart/guest-selection";

export function GuestAddToCart({ productId }: { productId: string }) {
  const cart = useGuestCart();
  const { openCart } = useCartPanel();
  const selected = cart.items.find((item) => item.productId === productId);
  const full = selected ? selected.quantity >= MAX_GUEST_QUANTITY : cart.items.length >= MAX_GUEST_ITEMS;
  return (
    <div>
      <button className="button buttonDark productAddButton" type="button" disabled={!cart.ready || full} aria-busy={!cart.ready}
        onClick={(event) => { const trigger = event.currentTarget; void cart.add(productId).then(() => openCart(trigger)); }}>
        Agregar al carrito
      </button>
      {full ? <p className="guestCartStatus" role="status">Alcanzaste el límite de tu selección. <Link href="/carrito">Revisar carrito</Link></p> : null}
      <noscript><p>El carrito invitado necesita JavaScript para conservar tu selección. <Link href="/iniciar-sesion?callbackUrl=/carrito">Ir al ingreso de tu cuenta</Link>.</p></noscript>
    </div>
  );
}
