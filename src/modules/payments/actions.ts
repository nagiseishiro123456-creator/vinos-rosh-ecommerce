"use server";

import { OrderStatus, PaymentStatus } from "@prisma/client";
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

export async function approveManualPayment(paymentId: string) {
  const adminId = await requireAdmin();
  const parsedId = paymentIdSchema.safeParse(paymentId);
  if (!parsedId.success) return;

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

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PAID,
        reviewedById: adminId,
        reviewedAt: now,
        paidAt: now,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.PAID,
        paidAt: now,
      },
    });
  });

  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
}

export async function rejectManualPayment(paymentId: string) {
  const adminId = await requireAdmin();
  const parsedId = paymentIdSchema.safeParse(paymentId);
  if (!parsedId.success) return;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
        status: true,
        orderId: true,
        order: {
          select: {
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

    for (const item of payment.order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const now = new Date();

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: now,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: now,
      },
    });
  });

  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
}
