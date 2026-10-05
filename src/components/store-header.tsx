import { getServerSession } from "next-auth";

import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function StoreHeader() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  let cartCount = 0;
  if (userId) {
    try {
      const aggregate = await prisma.cartItem.aggregate({
        where: { cart: { userId } },
        _sum: { quantity: true },
      });
      cartCount = aggregate._sum.quantity ?? 0;
    } catch (error) {
      console.error("HEADER_CART_COUNT_ERROR", error);
    }
  }

  return (
    <SiteHeader
      cartCount={cartCount}
      isAuthenticated={Boolean(session?.user)}
      isAdmin={session?.user?.role === "ADMIN"}
    />
  );
}
