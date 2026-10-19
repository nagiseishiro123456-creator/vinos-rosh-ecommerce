"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useGuestCart } from "@/components/guest-cart-provider";
import { MAX_GUEST_ITEMS, MAX_GUEST_QUANTITY } from "@/modules/cart/guest-selection";

export function GuestAddToCart({ productId }: { productId: string }) {
  const cart = useGuestCart();
  const router = useRouter();
  const selected = cart.items.find((item) => item.productId === productId);
  const full = selected ? selected.quantity >= MAX_GUEST_QUANTITY : cart.items.length >= MAX_GUEST_ITEMS;
  return (
    <div>
      <button className="button buttonDark productAddButton" type="button" disabled={!cart.ready || full} aria-busy={!cart.ready}
        onClick={() => { cart.add(productId); router.push("/carrito"); }}>
        Agregar al carrito
      </button>
      {full ? <p className="guestCartStatus" role="status">Alcanzaste el límite de tu selección. <Link href="/carrito">Revisar carrito</Link></p> : null}
      <noscript><p>El carrito invitado necesita JavaScript para conservar tu selección. <Link href="/iniciar-sesion?callbackUrl=/carrito">Ir al ingreso de tu cuenta</Link>.</p></noscript>
    </div>
  );
}
