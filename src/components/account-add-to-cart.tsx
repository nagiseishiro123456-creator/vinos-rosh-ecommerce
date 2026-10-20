"use client";

import { useRouter } from "next/navigation";
import { useAccountCart, useCartPanel } from "./cart-provider";
import { useGuestCart } from "./guest-cart-provider";

export function AccountAddToCart({ productId, action, expectedUserId }: { productId: string; action: () => Promise<void>; expectedUserId: string }) {
  const cart = useAccountCart(); const { openCart } = useCartPanel(); const guest = useGuestCart(); const router = useRouter();
  const busy = cart.status === "saving" || Boolean(cart.pending);
  return <form action={action} onSubmit={(event) => {
    event.preventDefault();
    if (cart.userId !== expectedUserId) { router.push("/carrito"); router.refresh(); return; }
    if (guest.items.length || guest.pending) { router.push("/carrito"); return; }
    openCart(event.currentTarget.querySelector("button") ?? undefined);
    void cart.command({ action: "add", productId });
  }}><button className="button buttonDark productAddButton" type="submit" disabled={busy} aria-busy={cart.status === "saving"}>
    Agregar al carrito
  </button></form>;
}
