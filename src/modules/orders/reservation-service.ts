import { InventoryMovementType, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { releaseStock } from "@/modules/inventory/stock-service";

export class PaymentReportError extends Error {
  constructor(public code: "DUPLICATE_OPERATION" | "INVALID_OPERATION") { super(code); }
}

// Claim the order before touching products/payments. All callers share this lock order.
async function closeReservation(
  tx: Prisma.TransactionClient, orderId: string, now: Date,
  options: { expired: boolean; userId?: string },
) {
  const where: Prisma.OrderWhereInput = {
    id: orderId, userId: options.userId, status: OrderStatus.PENDING_PAYMENT,
    stockReservedAt: { not: null }, stockReleasedAt: null,
    payments: { none: { status: { in: [PaymentStatus.UNDER_REVIEW, PaymentStatus.PAID] } } },
    ...(options.expired ? { reservationExpiresAt: { lte: now } } : {}),
  };
  const order = await tx.order.findFirst({ where, select: {
    id: true, number: true, items: { select: { productId: true, quantity: true } },
  } });
  if (!order) return false;
  const claimed = await tx.order.updateMany({ where, data: {
    status: OrderStatus.CANCELLED, cancelledAt: now, stockReleasedAt: now,
    ...(options.expired ? { reservationExpiredAt: now } : {}),
  } });
  if (claimed.count !== 1) return false;
  const stockAfter = await releaseStock(tx, order.items);
  await tx.inventoryMovement.createMany({ data: order.items.map((item) => ({
    productId: item.productId, orderId: order.id, actorUserId: options.userId,
    type: InventoryMovementType.ORDER_RELEASE, quantity: item.quantity,
    stockAfter: stockAfter.get(item.productId)!,
    note: options.expired ? `Reserva vencida: ${order.number}` : `Cancelación sin pago comunicado: ${order.number}`,
  })) });
  await tx.payment.updateMany({ where: { orderId, status: PaymentStatus.PENDING }, data: {
    status: PaymentStatus.CANCELLED,
    notes: options.expired ? "Reserva vencida sin operación comunicada." : "Reserva cancelada por el cliente sin operación comunicada.",
  } });
  return true;
}

export async function expireUnpaidReservation(orderId: string, now = new Date()) {
  return prisma.$transaction((tx) => closeReservation(tx, orderId, now, { expired: true }));
}

export async function cancelUnpaidReservation(userId: string, number: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { userId, number }, select: { id: true } });
    if (!order) return false;
    return closeReservation(tx, order.id, now, { expired: false, userId });
  });
}

export async function reportManualPayment(userId: string, number: string, operationCode: string, now = new Date()) {
  const code = operationCode.trim();
  if (code.length < 4 || code.length > 80) throw new PaymentReportError("INVALID_OPERATION");
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { userId, number }, include: { payments: true } });
      if (!order) return "unavailable" as const;
      const payment = order.payments.find((p) => p.provider === "YAPE_MANUAL" || p.provider === "TRANSFER_MANUAL");
      if (order.status === OrderStatus.PAYMENT_REVIEW && payment?.operationCode === code) return "already-sent" as const;
      if (order.status !== OrderStatus.PENDING_PAYMENT || !order.stockReservedAt || order.stockReleasedAt || !order.reservationExpiresAt) return "unavailable" as const;
      if (order.reservationExpiresAt <= now) {
        await closeReservation(tx, order.id, now, { expired: true, userId });
        return "expired" as const;
      }
      if (order.payments.length !== 1 || !payment || payment.status !== PaymentStatus.PENDING || payment.operationCode || !payment.amount.equals(order.total)) return "unavailable" as const;
      const claimed = await tx.order.updateMany({ where: {
        id: order.id, userId, status: OrderStatus.PENDING_PAYMENT, stockReleasedAt: null,
        stockReservedAt: { not: null }, reservationExpiresAt: { gt: now },
      }, data: { status: OrderStatus.PAYMENT_REVIEW } });
      if (claimed.count !== 1) return "unavailable" as const;
      const updated = await tx.payment.updateMany({ where: {
        id: payment.id, status: PaymentStatus.PENDING, operationCode: null,
      }, data: { status: PaymentStatus.UNDER_REVIEW, operationCode: code, reportedAt: now } });
      if (updated.count !== 1) throw new Error("PAYMENT_STATE_CHANGED");
      return "sent" as const;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new PaymentReportError("DUPLICATE_OPERATION");
    if (error instanceof Error && error.message === "PAYMENT_STATE_CHANGED") return "unavailable" as const;
    throw error;
  }
}
