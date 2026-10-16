import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AdminOperationError, assertTransactionAdmin } from "@/modules/admin/transaction-auth";

export const reconciliationSchema = z.object({
  operationCode: z.string().trim().min(4).max(80),
  receivedAmount: z.string().regex(/^(?:0|[1-9]\d{0,7})\.\d{2}$/).refine((v) => new Prisma.Decimal(v).gt(0)),
  reason: z.string().trim().min(4).max(500),
});
export const refundReferenceSchema = z.string().trim().min(3).max(120);

export async function openPaymentReconciliation(adminId: string, paymentId: string, input: z.input<typeof reconciliationSchema>) {
  const parsed = reconciliationSchema.safeParse(input);
  if (!parsed.success) throw new AdminOperationError("INVALID_INPUT");
  const data = parsed.data;
  try {
    return await prisma.$transaction(async (tx) => {
      await assertTransactionAdmin(tx, adminId);
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true, reconciliation: true } });
      if (!payment || payment.order.status !== "CANCELLED" ||
        !["CANCELLED", "REJECTED"].includes(payment.status) || payment.currency !== "PEN" ||
        !["YAPE_MANUAL", "TRANSFER_MANUAL"].includes(payment.provider)) throw new AdminOperationError("INCONSISTENT");
      if (payment.reconciliation) return { changed: false };
      if (payment.operationCode && payment.operationCode !== data.operationCode) throw new AdminOperationError("INCONSISTENT");
      // Same order-first lock order as review/refund/expiry. No state/stock changes.
      const claim = await tx.order.updateMany({ where: { id: payment.orderId, status: "CANCELLED" }, data: { updatedAt: new Date() } });
      if (claim.count !== 1) throw new AdminOperationError("STATE_CHANGED");
      const locked = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { reconciliation: true } });
      if (locked.reconciliation) return { changed: false };
      if (locked.operationCode && locked.operationCode !== data.operationCode) throw new AdminOperationError("INCONSISTENT");
      await tx.payment.update({ where: { id: paymentId }, data: { operationCode: data.operationCode } });
      await tx.paymentReconciliation.create({ data: { paymentId, receivedAmount: data.receivedAmount } });
      await tx.orderEvent.create({ data: { orderId: payment.orderId, actorUserId: adminId,
        kind: "RECONCILIATION_OPENED", note: `Ingreso verificado PEN ${data.receivedAmount}; operación ${data.operationCode}. ${data.reason}`,
      } });
      return { changed: true };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AdminOperationError("DUPLICATE_OPERATION");
    throw error;
  }
}

export async function refundPaymentReconciliation(adminId: string, paymentId: string, reference: string) {
  const parsed = refundReferenceSchema.safeParse(reference);
  if (!parsed.success) throw new AdminOperationError("INVALID_INPUT");
  return prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { reconciliation: true } });
    if (!payment?.reconciliation) throw new AdminOperationError("INCONSISTENT");
    const now = new Date();
    const claim = await tx.order.updateMany({ where: { id: payment.orderId, status: "CANCELLED" }, data: { updatedAt: now } });
    if (claim.count !== 1) throw new AdminOperationError("STATE_CHANGED");
    const updated = await tx.paymentReconciliation.updateMany({ where: { id: payment.reconciliation.id, refundedAt: null },
      data: { refundedAt: now, refundReference: parsed.data } });
    if (updated.count !== 1) return { changed: false };
    await tx.orderEvent.create({ data: { orderId: payment.orderId, actorUserId: adminId,
      kind: "RECONCILIATION_REFUNDED", note: `Devolución externa íntegra PEN ${payment.reconciliation.receivedAmount.toFixed(2)}; referencia ${parsed.data}.`, createdAt: now,
    } });
    return { changed: true };
  });
}
