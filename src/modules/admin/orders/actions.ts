"use server";

import { OrderStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/modules/admin/auth";
import { adminOperation } from "@/modules/admin/operation-feedback";
import { advanceOrder } from "@/modules/admin/orders/transition-service";
import { refundPaidOrder } from "@/modules/orders/refund-service";
import { openPaymentReconciliation, reconciliationSchema, refundPaymentReconciliation, refundReferenceSchema } from "@/modules/payments/reconciliation-service";

const idSchema = z.string().cuid();

export async function advanceOrderStatus(orderId: string, expected: OrderStatus) {
  const session = await requireAdmin("/admin/pedidos");
  if (!idSchema.safeParse(orderId).success || !z.enum(OrderStatus).safeParse(expected).success) redirect("/admin/pedidos");
  await adminOperation(orderId, `/admin/pedidos/${orderId}`, () => advanceOrder(session.user.id, orderId, expected));
}

export async function registerManualRefund(orderId: string, formData: FormData) {
  const session = await requireAdmin("/admin/pedidos");
  if (!idSchema.safeParse(orderId).success) redirect("/admin/pedidos");
  const reference = refundReferenceSchema.safeParse(formData.get("refundReference"));
  if (!reference.success || formData.get("confirm") !== "yes") redirect(`/admin/pedidos/${orderId}?result=invalid`);
  await adminOperation(orderId, `/admin/pedidos/${orderId}`, async () => {
    await refundPaidOrder({ orderId, adminId: session.user.id, refundReference: reference.data });
    return { changed: true };
  });
}

export async function openReconciliation(orderId: string, paymentId: string, formData: FormData) {
  const session = await requireAdmin("/admin/pedidos");
  if (!idSchema.safeParse(orderId).success || !idSchema.safeParse(paymentId).success) redirect("/admin/pedidos");
  const parsed = reconciliationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || formData.get("confirm") !== "yes") redirect(`/admin/pedidos/${orderId}?result=invalid`);
  await adminOperation(orderId, `/admin/pedidos/${orderId}`, () => openPaymentReconciliation(session.user.id, paymentId, parsed.data));
}

export async function closeReconciliation(orderId: string, paymentId: string, formData: FormData) {
  const session = await requireAdmin("/admin/pedidos");
  if (!idSchema.safeParse(orderId).success || !idSchema.safeParse(paymentId).success) redirect("/admin/pedidos");
  const parsed = refundReferenceSchema.safeParse(formData.get("refundReference"));
  if (!parsed.success || formData.get("confirm") !== "yes") redirect(`/admin/pedidos/${orderId}?result=invalid`);
  await adminOperation(orderId, `/admin/pedidos/${orderId}`, () => refundPaymentReconciliation(session.user.id, paymentId, parsed.data));
}
