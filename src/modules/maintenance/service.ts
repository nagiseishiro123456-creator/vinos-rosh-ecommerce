import { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getManualPaymentHoldMinutes } from "@/modules/orders/hold";
import { expireUnpaidReservation } from "@/modules/orders/reservation-service";

const MAX_EXPIRED_ORDERS_PER_RUN = 100;

async function releaseExpiredManualOrders(now: Date) {
  const candidates = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT, reservationExpiresAt: { lte: now },
      stockReservedAt: { not: null }, stockReleasedAt: null,
    },
    orderBy: { reservationExpiresAt: "asc" }, take: MAX_EXPIRED_ORDERS_PER_RUN,
    select: { id: true },
  });
  let released = 0;
  for (const candidate of candidates) {
    if (await expireUnpaidReservation(candidate.id, now)) released += 1;
  }
  return { released, holdMinutes: getManualPaymentHoldMinutes() };
}

export async function runMaintenance(now = new Date()) {
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

  return {
    rateLimitsDeleted: rateLimits.count,
    resetTokensDeleted: resetTokens.count,
    expiredOrdersReleased: expiredOrders.released,
    holdMinutes: expiredOrders.holdMinutes,
  };
}
