"use server";

import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import {
  OrderRefundError,
  refundPaidOrder,
} from "@/modules/orders/refund-service";

const orderIdSchema = z.string().cuid();

const refundSchema = z.object({
  refundReference: z.string().trim().min(3).max(120),
  confirm: z.literal("yes"),
});

const allowedTransitions: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.PAID]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.SHIPPED,
  [OrderStatus.SHIPPED]: OrderStatus.DELIVERED,
};

export async function advanceOrderStatus(orderId: string) {
  await requireAdmin("/admin/pedidos");

  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) return;

  const order = await prisma.order.findUnique({
    where: { id: parsed.data },
    select: { id: true, number: true, status: true },
  });

  if (!order) return;

  const nextStatus = allowedTransitions[order.status];
  if (!nextStatus) return;

  const now = new Date();
  const data: {
    status: OrderStatus;
    shippedAt?: Date;
    deliveredAt?: Date;
  } = { status: nextStatus };

  if (nextStatus === OrderStatus.SHIPPED) data.shippedAt = now;
  if (nextStatus === OrderStatus.DELIVERED) data.deliveredAt = now;

  // El estado anterior forma parte del WHERE para impedir saltos de estado si
  // dos acciones administrativas llegan simultáneamente.
  const updated = await prisma.order.updateMany({
    where: {
      id: order.id,
      status: order.status,
    },
    data,
  });

  if (updated.count !== 1) return;

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${order.id}`);
  revalidatePath(`/pedidos/${order.number}`);
  revalidatePath("/mi-cuenta");
}

export async function registerManualRefund(
  orderId: string,
  formData: FormData,
) {
  const session = await requireAdmin(`/admin/pedidos/${orderId}`);

  const parsedId = orderIdSchema.safeParse(orderId);
  const parsedRefund = refundSchema.safeParse({
    refundReference: formData.get("refundReference"),
    confirm: formData.get("confirm"),
  });

  if (!parsedId.success || !parsedRefund.success) return;

  try {
    const result = await refundPaidOrder({
      orderId: parsedId.data,
      adminId: session.user.id,
      refundReference: parsedRefund.data.refundReference,
    });

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${parsedId.data}`);
    revalidatePath(`/pedidos/${result.orderNumber}`);
    revalidatePath("/admin/pagos");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin");
    revalidatePath("/mi-cuenta");
  } catch (error) {
    if (error instanceof OrderRefundError) return;
    throw error;
  }
}
