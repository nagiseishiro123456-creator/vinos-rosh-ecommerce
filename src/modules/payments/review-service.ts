import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function stateChanged() { return new Error("PAYMENT_STATE_CHANGED"); }

export async function approveManualPaymentRecord(adminId: string, paymentId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          status: true,
          orderId: true,
          order: { select: { status: true } },
        },
      });

      if (
        !payment ||
        payment.status !== PaymentStatus.UNDER_REVIEW ||
        payment.order.status !== OrderStatus.PAYMENT_REVIEW
      ) {
        return;
      }

      const now = new Date();

      const orderClaim = await tx.order.updateMany({
        where: {
          id: payment.orderId,
          status: OrderStatus.PAYMENT_REVIEW,
        },
        data: {
          status: OrderStatus.PAID,
          paidAt: now,
        },
      });

      if (orderClaim.count !== 1) throw stateChanged();

      const paymentClaim = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.UNDER_REVIEW,
        },
        data: {
          status: PaymentStatus.PAID,
          reviewedById: adminId,
          reviewedAt: now,
          paidAt: now,
        },
      });

      if (paymentClaim.count !== 1) throw stateChanged();
    });
  } catch (error) {
    if (!(error instanceof Error && error.message === "PAYMENT_STATE_CHANGED")) {
      throw error;
    }
  }

}
