import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { GuestCart } from "@/components/guest-cart";
import { AccountCart, type NativeCartActions } from "@/components/account-cart";
import { CartMergeBoundary } from "@/components/cart-merge-boundary";
import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { readAccountCart } from "@/modules/cart/account-service";
import { removeCartItem, updateCartItem } from "@/modules/cart/actions";
import { safeInternalDestination } from "@/modules/auth/destination";

export const dynamic = "force-dynamic";
export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string; continuar?: string }> }) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const continuation = safeInternalDestination(params.continuar, "/checkout");
  if (!session?.user?.id) return <main className="cartPage purchaseFlow">
    <div className="catalogHeaderWrap compact"><StoreHeader /></div><GuestCart />
  </main>;
  const userId = session.user.id;
  const snapshot = await readAccountCart(userId);
  const actions: NativeCartActions = Object.fromEntries(snapshot.items.map((item) => [item.productId, {
    update: updateCartItem.bind(null, item.productId, randomUUID(), userId),
    remove: removeCartItem.bind(null, item.productId, randomUUID(), userId),
  }]));
  return <main className="cartPage purchaseFlow"><div className="catalogHeaderWrap compact"><StoreHeader /></div>
    <CartMergeBoundary key={userId} userId={userId} renderId={randomUUID()}
      returnTo={params.continuar ? "/carrito?continuar=" + encodeURIComponent(continuation) : "/carrito"}>
      <AccountCart initial={snapshot} actions={actions} continuation={continuation} pageError={params.error} />
    </CartMergeBoundary>
  </main>;
}
