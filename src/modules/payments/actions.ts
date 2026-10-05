"use server";

import { InventoryMovementType, OrderStatus, PaymentStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const paymentIdSchema = z.string().cuid();

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/admin/pagos");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/mi-cuenta");
  }
  return session.user.id;
}

function stateChanged() {
  return new Error("PAYMENT_STATE_CHANGED");
}

export async function approveManualPayment(paymentId: string) {
  const adminId = await requireAdmin();
  const parsedId = paymentIdSchema.safeParse(paymentId);
  if (!parsedId.success) return;

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: parsedId.data },
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

  revalidatePath("/admin/pagos");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  revalidatePath("/mi-cuenta");
}

export async function rejectManualPayment(paymentId: string) {
  const adminId = await requireAdmin();
  const parsedId = paymentIdSchema.safeParse(paymentId);
  if (!parsedId.success) return;

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: parsedId.data },
        select: {
          id: true,
          status: true,
          orderId: true,
          order: {
            select: {
              number: true,
              status: true,
              items: {
                select: { productId: true, quantity: true },
              },
            },
          },
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
          status: OrderStatus.CANCELLED,
          cancelledAt: now,
        },
      });

      if (orderClaim.count !== 1) throw stateChanged();

      const paymentClaim = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: PaymentStatus.UNDER_REVIEW,
        },
        data: {
          status: PaymentStatus.REJECTED,
          reviewedById: adminId,
          reviewedAt: now,
        },
      });

      if (paymentClaim.count !== 1) throw stateChanged();

      for (const item of payment.order.items) {
        const product = await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
          select: { stock: true },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            orderId: payment.orderId,
            actorUserId: adminId,
            type: InventoryMovementType.ORDER_RELEASE,
            quantity: item.quantity,
            stockAfter: product.stock,
            note: `Liberación por rechazo de pago del pedido ${payment.order.number}`,
          },
        });
      }
    });
  } catch (error) {
    if (!(error instanceof Error && error.message === "PAYMENT_STATE_CHANGED")) {
      throw error;
    }
  }

  revalidatePath("/admin/pagos");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  revalidatePath("/mi-cuenta");
}
