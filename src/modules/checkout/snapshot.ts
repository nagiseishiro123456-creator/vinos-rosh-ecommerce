import type { Prisma } from "@prisma/client";

import { calculateAmounts } from "@/modules/checkout/pricing";

export class CheckoutUnavailableError extends Error {
  constructor(public code: "EMPTY_CART" | "ADDRESS_NOT_FOUND" | "UNSUPPORTED_ZONE" | "STOCK_CHANGED") {
    super(code);
  }
}

export async function loadCheckoutSnapshot(
  db: Pick<Prisma.TransactionClient, "cart" | "address" | "shippingZone">,
  userId: string,
  addressId: string,
) {
  const [address, cart] = await Promise.all([
    db.address.findFirst({ where: { id: addressId, userId, active: true } }),
    db.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            quantity: true,
            product: { select: { id: true, name: true, sku: true, price: true, stock: true, active: true } },
          },
        },
      },
    }),
  ]);
  if (!address) throw new CheckoutUnavailableError("ADDRESS_NOT_FOUND");
  if (!cart?.items.length) throw new CheckoutUnavailableError("EMPTY_CART");
  const shippingZone = await db.shippingZone.findFirst({
    where: { active: true, department: address.department, province: address.province, district: address.district },
  });
  if (!shippingZone) throw new CheckoutUnavailableError("UNSUPPORTED_ZONE");
  if (cart.items.some((item) => !item.product.active || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || item.quantity > item.product.stock)) {
    throw new CheckoutUnavailableError("STOCK_CHANGED");
  }
  const amounts = calculateAmounts(cart.items.map((item) => ({ unitPrice: item.product.price, quantity: item.quantity })), shippingZone.price);
  return { address, cart, shippingZone, amounts };
}
