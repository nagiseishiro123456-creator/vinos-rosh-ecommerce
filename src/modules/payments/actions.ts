"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { adminOperation } from "@/modules/admin/operation-feedback";
import { approveManualPaymentRecord, rejectManualPaymentRecord } from "@/modules/payments/review-service";

const idSchema = z.string().cuid();

export async function approveManualPayment(paymentId: string, formData: FormData) {
  const session = await requireAdmin("/admin/pagos");
  if (!idSchema.safeParse(paymentId).success || formData.get("confirm") !== "yes") redirect("/admin/pagos?result=invalid");
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { orderId: true } });
  await adminOperation(payment?.orderId, "/admin/pagos", () => approveManualPaymentRecord(session.user.id, paymentId));
}

export async function rejectManualPayment(paymentId: string, formData: FormData) {
  const session = await requireAdmin("/admin/pagos");
  const reason = z.string().trim().min(4).max(500).safeParse(formData.get("reason"));
  if (!idSchema.safeParse(paymentId).success || !reason.success || formData.get("confirm") !== "yes") redirect("/admin/pagos?result=invalid");
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { orderId: true } });
  await adminOperation(payment?.orderId, "/admin/pagos", () => rejectManualPaymentRecord(session.user.id, paymentId, reason.data));
}
