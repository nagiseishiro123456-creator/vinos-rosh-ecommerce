import { prisma } from "@/lib/prisma";

export async function buildBusinessBackup() {
  const [
    users,
    addresses,
    categories,
    products,
    productImages,
    shippingZones,
    orders,
    orderItems,
    payments,
    reviews,
    inventoryMovements,
    settings,
    contactMessages,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.address.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.productImage.findMany({ orderBy: [{ productId: "asc" }, { position: "asc" }] }),
    prisma.shippingZone.findMany({ orderBy: [{ department: "asc" }, { province: "asc" }, { district: "asc" }] }),
    prisma.order.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.orderItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.payment.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.review.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.inventoryMovement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.commerceSettings.findMany(),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return {
    meta: {
      format: "vinos-rosh-business-backup",
      version: 1,
      generatedAt: new Date().toISOString(),
      excludes: [
        "passwordHash",
        "password reset tokens",
        "rate limit buckets",
        "authentication secrets",
      ],
    },
    users,
    addresses,
    categories,
    products,
    productImages,
    shippingZones,
    orders,
    orderItems,
    payments,
    reviews,
    inventoryMovements,
    settings,
    contactMessages,
  };
}
