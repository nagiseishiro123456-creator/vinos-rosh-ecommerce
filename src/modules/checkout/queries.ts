import { calculateAmounts } from "@/modules/checkout/pricing";
import { prisma } from "@/lib/prisma";

export type CheckoutAddress = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  department: string;
  province: string;
  district: string;
  addressLine1: string;
  reference: string | null;
  isDefault: boolean;
};

export type CheckoutShippingZone = {
  id: string;
  department: string;
  province: string;
  district: string;
  price: string;
};

export type CheckoutCartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    stock: number;
    active: boolean;
  };
};

export async function getCheckoutData(userId: string) {
  const [cart, addresses, shippingZones] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId },
      select: {
        items: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                stock: true,
                active: true,
              },
            },
          },
        },
      },
    }),
    prisma.address.findMany({
      where: { userId, active: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        label: true,
        recipient: true,
        phone: true,
        department: true,
        province: true,
        district: true,
        addressLine1: true,
        reference: true,
        isDefault: true,
      },
    }),
    prisma.shippingZone.findMany({
      where: { active: true },
      orderBy: [{ department: "asc" }, { province: "asc" }, { district: "asc" }],
      select: {
        id: true,
        department: true,
        province: true,
        district: true,
        price: true,
      },
    }),
  ]);

  const items: CheckoutCartItem[] = (cart?.items ?? []).map((item) => ({
    ...item,
    product: {
      ...item.product,
      price: item.product.price.toFixed(2),
    },
  }));

  const zones: CheckoutShippingZone[] = shippingZones.map((zone) => ({
    ...zone,
    price: zone.price.toFixed(2),
  }));

  const subtotal = calculateAmounts(items.map((item) => ({
    unitPrice: item.product.price, quantity: item.quantity,
  }))).subtotal.toFixed(2);

  const hasInvalidItems = items.some(
    (item) => !item.product.active || item.product.stock < item.quantity || item.quantity > 99,
  );

  return {
    items,
    addresses: addresses satisfies CheckoutAddress[],
    shippingZones: zones,
    subtotal,
    hasInvalidItems,
  };
}
