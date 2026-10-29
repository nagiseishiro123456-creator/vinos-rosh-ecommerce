import { Prisma } from "@prisma/client";
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
    orderEvents,
    paymentReconciliations,
    paymentSettlements,
  ] = await prisma.$transaction([
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
    prisma.orderEvent.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    prisma.paymentReconciliation.findMany({ orderBy: [{ openedAt: "asc" }, { id: "asc" }] }),
    prisma.$queryRaw<Array<{ id: string; paymentId: string; grossAmount: string; commissionAmount: string | null;
      depositedAmount: string | null; depositReference: string | null; depositDate: string | null;
      sourceReference: string; revision: number; createdAt: Date; updatedAt: Date }>>`
      SELECT "id"::text, "paymentId", "grossAmount"::text, "commissionAmount"::text, "depositedAmount"::text,
        "depositReference", to_char("depositDate", 'YYYY-MM-DD') AS "depositDate", "sourceReference", "revision", "createdAt", "updatedAt"
      FROM "PaymentSettlement" ORDER BY "createdAt", "id"`,
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

  return {
    meta: {
      format: "vinos-rosh-business-backup",
      version: 3,
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
    orderEvents,
    paymentReconciliations,
    paymentSettlements,
  };
}
