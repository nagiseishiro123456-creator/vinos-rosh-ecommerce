import {
  InventoryMovementType,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";
import {
  getManualPaymentCutoff,
  getManualPaymentHoldMinutes,
} from "../src/modules/orders/hold";

const MAX_EXPIRED_ORDERS_PER_RUN = 100;

async function releaseExpiredManualOrders(now: Date) {
  const holdMinutes = getManualPaymentHoldMinutes();
  const cutoff = getManualPaymentCutoff(now, holdMinutes);

  const candidates = await prisma.order.findMany({
    where: {
      status: OrderStatus.PAYMENT_REVIEW,
      createdAt: { lt: cutoff },
      payments: {
        some: {
          status: PaymentStatus.UNDER_REVIEW,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_EXPIRED_ORDERS_PER_RUN,
    select: { id: true },
  });

  let released = 0;

  for (const candidate of candidates) {
    const didRelease = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: candidate.id },
        select: {
          id: true,
          number: true,
          status: true,
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (!order || order.status !== OrderStatus.PAYMENT_REVIEW) {
        return false;
      }

      const claimed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: OrderStatus.PAYMENT_REVIEW,
        },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: now,
        },
      });

      if (claimed.count !== 1) {
        return false;
      }

      for (const item of order.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
          },
          select: { stock: true },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: InventoryMovementType.ORDER_RELEASE,
            quantity: item.quantity,
            stockAfter: product.stock,
            orderId: order.id,
            note: `Liberación automática por vencimiento de reserva (${holdMinutes} min)`,
          },
        });
      }

      await tx.payment.updateMany({
        where: {
          orderId: order.id,
          status: {
            in: [PaymentStatus.PENDING, PaymentStatus.UNDER_REVIEW],
          },
        },
        data: {
          status: PaymentStatus.CANCELLED,
          reviewedAt: now,
          notes: "Reserva vencida antes de la validación manual del pago.",
        },
      });

      return true;
    });

    if (didRelease) released += 1;
  }

  return { released, holdMinutes };
}

async function main() {
  const now = new Date();

  const [rateLimits, resetTokens] = await prisma.$transaction([
    prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lt: now } },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    }),
  ]);

  const expiredOrders = await releaseExpiredManualOrders(now);

  console.log(
    [
      "Mantenimiento completado:",
      `${rateLimits.count} límites vencidos eliminados`,
      `${resetTokens.count} tokens eliminados`,
      `${expiredOrders.released} pedidos vencidos liberados`,
      `reserva manual configurada en ${expiredOrders.holdMinutes} minutos`,
    ].join(" · "),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
