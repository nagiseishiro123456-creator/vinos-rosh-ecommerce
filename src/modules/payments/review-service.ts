import { prisma } from "@/lib/prisma";
import { AdminOperationError, assertTransactionAdmin } from "@/modules/admin/transaction-auth";
import { releaseStock } from "@/modules/inventory/stock-service";
import { enqueuePaymentConfirmation } from "@/modules/notifications/outbox-service";

async function review(adminId: string, paymentId: string, decision: "approve" | "reject", reason: string) {
  if (reason.trim().length < 4 || reason.length > 500) throw new AdminOperationError("INVALID_INPUT");
  return prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: {
      order: { include: { items: true, _count: { select: { payments: true } } } },
    } });
    if (!payment || payment.status !== "UNDER_REVIEW" || payment.order.status !== "PAYMENT_REVIEW") {
      return { changed: false, orderId: payment?.orderId, orderNumber: payment?.order.number };
    }
    const order = payment.order;
    if (order._count.payments !== 1 || !order.stockReservedAt || order.stockReleasedAt ||
      !payment.operationCode || !["YAPE_MANUAL", "TRANSFER_MANUAL"].includes(payment.provider) ||
      (decision === "approve" && (payment.currency !== "PEN" || !payment.amount.equals(order.total)))) {
      throw new AdminOperationError("INCONSISTENT");
    }
    const now = new Date();
    const claimed = await tx.order.updateMany({ where: {
      id: order.id, status: "PAYMENT_REVIEW", stockReservedAt: { not: null }, stockReleasedAt: null,
    }, data: decision === "approve" ? { status: "PAID", paidAt: now } : {
      status: "CANCELLED", cancelledAt: now, stockReleasedAt: now,
    } });
    if (claimed.count !== 1) return { changed: false, orderId: order.id, orderNumber: order.number };
    const updated = await tx.payment.updateMany({ where: { id: payment.id, status: "UNDER_REVIEW" }, data: {
      status: decision === "approve" ? "PAID" : "REJECTED", reviewedById: adminId, reviewedAt: now,
      ...(decision === "approve" ? { paidAt: now } : {}),
    } });
    if (updated.count !== 1) throw new AdminOperationError("STATE_CHANGED");
    if (decision === "approve") await enqueuePaymentConfirmation(tx, order.id);
    if (decision === "reject") {
      const stockAfter = await releaseStock(tx, order.items);
      await tx.inventoryMovement.createMany({ data: order.items.map((item) => ({
        productId: item.productId, orderId: order.id, actorUserId: adminId,
        type: "ORDER_RELEASE", quantity: item.quantity, stockAfter: stockAfter.get(item.productId)!,
        note: `Rechazo de pago ${order.number}: ${reason.trim()}`,
      })) });
    }
    await tx.orderEvent.create({ data: { orderId: order.id, actorUserId: adminId,
      kind: decision === "approve" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED", note: reason.trim(), createdAt: now,
    } });
    return { changed: true, orderId: order.id, orderNumber: order.number };
  });
}

export function approveManualPaymentRecord(adminId: string, paymentId: string) {
  return review(adminId, paymentId, "approve", "Ingreso y monto verificados en la cuenta del negocio.");
}

export function rejectManualPaymentRecord(adminId: string, paymentId: string, reason: string) {
  return review(adminId, paymentId, "reject", reason);
}
