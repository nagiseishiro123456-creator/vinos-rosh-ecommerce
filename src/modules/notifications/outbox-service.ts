import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { AdminOperationError, assertTransactionAdmin } from "@/modules/admin/transaction-auth";
import { confirmationSchema, type ConfirmationSnapshot, type OutboxState } from "./confirmation-contract";
import { renderPaymentConfirmation } from "./confirmation-template";
import { MailDeliveryError, mailEnvelopeSchema, readPaymentEmailConfig, sendConfirmationViaResend, type EmailEnvironment, type MailEnvelope } from "./resend-transport";

const paidStates = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];
const RETRY_WINDOW = 23 * 60 * 60_000; // Stop before the provider's documented 24-hour idempotency boundary.
type Job = {
  id: string; orderId: string; status: OutboxState; recipient: string; payload: unknown; envelope: unknown;
  senderConfigHash: string | null; attempts: number; firstAttemptAt: Date | null; nextAttemptAt: Date;
  leaseToken: string | null; lockedUntil: Date | null; providerMessageId: string | null;
  acceptedAt: Date | null; lastErrorCode: string | null; createdAt: Date; updatedAt: Date;
};
export type DispatchResult = "SENT" | "RETRY" | "REVIEW" | "CANCELLED" | "DISABLED" | "BUSY" | "WAIT" | "NOT_FOUND" | "UNCHANGED";

/** Must run inside the same transaction that records a genuine payment approval. */
async function enqueue(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: {
    user: { select: { email: true, firstName: true } }, items: { orderBy: { id: "asc" } },
  } });
  if (!paidStates.includes(order.status) || !order.paidAt) throw new Error("CONFIRMATION_REQUIRES_PAID_ORDER");
  const recipient = z.string().email().max(254).parse(order.user.email);
  const snapshot = confirmationSchema.parse({ version: 1, orderNumber: order.number, firstName: order.user.firstName,
    total: order.total.toFixed(2), subtotal: order.subtotal.toFixed(2), shippingAmount: order.shippingAmount.toFixed(2),
    currency: "PEN", paidAt: order.paidAt.toISOString(), items: order.items.map((item) => ({
      name: item.productName, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2), subtotal: item.subtotal.toFixed(2),
    })) });
  // SQL repository keeps locking/lease semantics explicit; Prisma schema describes the additive table.
  await tx.$executeRaw`INSERT INTO "PaymentConfirmationOutbox" ("id", "orderId", "recipient", "payload")
    VALUES (${randomUUID()}::uuid, ${order.id}, ${recipient}, ${JSON.stringify(snapshot)}::jsonb)
    ON CONFLICT ("orderId") DO NOTHING`;
}

export async function enqueuePaymentConfirmation(tx: Prisma.TransactionClient, orderId: string) {
  try { await enqueue(tx, orderId); }
  catch { throw new AdminOperationError("NOTIFICATION_UNAVAILABLE"); }
}

async function stop(tx: Prisma.TransactionClient, jobId: string, status: "REVIEW" | "CANCELLED", code: string, now: Date) {
  await tx.$executeRaw`UPDATE "PaymentConfirmationOutbox" SET "status"=${status}, "lastErrorCode"=${code},
    "leaseToken"=NULL, "lockedUntil"=NULL, "updatedAt"=${now} WHERE "id"=${jobId}::uuid`;
  return { kind: status } as const;
}

/** Single operator-triggered delivery. No network calls within the database transaction. */
async function dispatch(adminId: string, id: string, options: {
  environment?: EmailEnvironment; now?: () => Date;
  send?: (body: MailEnvelope, key: string, apiKey: string) => Promise<string>;
} = {}): Promise<DispatchResult> {
  if (!z.string().uuid().safeParse(id).success) return "NOT_FOUND";
  const config = readPaymentEmailConfig(options.environment ?? process.env);
  const now = options.now?.() ?? new Date();
  const claim = await prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    if (!config) return { kind: "DISABLED" } as const;
    const rows = await tx.$queryRaw<Job[]>`SELECT * FROM "PaymentConfirmationOutbox" WHERE "id"=${id}::uuid FOR UPDATE`;
    const job = rows[0];
    if (!job) return { kind: "NOT_FOUND" } as const;
    if (["SENT", "REVIEW", "CANCELLED"].includes(job.status)) return { kind: "UNCHANGED" } as const;
    if (job.status === "PROCESSING" && job.lockedUntil && job.lockedUntil > now) return { kind: "BUSY" } as const;
    if (job.status !== "PROCESSING" && job.nextAttemptAt > now) return { kind: "WAIT" } as const;
    if (job.attempts >= 5 || (job.firstAttemptAt && (job.firstAttemptAt > now || now.getTime() - job.firstAttemptAt.getTime() >= RETRY_WINDOW))) {
      return stop(tx, id, "REVIEW", "RETRY_WINDOW_OR_LIMIT", now);
    }
    const fingerprint = createHash("sha256").update(JSON.stringify([config.apiKey, config.from, config.appUrl])).digest("hex");
    if (job.senderConfigHash && job.senderConfigHash !== fingerprint) return stop(tx, id, "REVIEW", "SENDER_CONFIG_CHANGED", now);
    const order = await tx.order.findUnique({ where: { id: job.orderId }, select: {
      status: true, paidAt: true, number: true, total: true, user: { select: { email: true } },
    } });
    if (!order || ["CANCELLED", "REFUNDED"].includes(order.status)) return stop(tx, id, "CANCELLED", "ORDER_CLOSED", now);
    if (!paidStates.includes(order.status) || !order.paidAt) return stop(tx, id, "REVIEW", "ORDER_NOT_PAID", now);
    const snapshot = confirmationSchema.safeParse(job.payload);
    if (!snapshot.success || snapshot.data.orderNumber !== order.number || snapshot.data.total !== order.total.toFixed(2)
      || snapshot.data.paidAt !== order.paidAt.toISOString() || order.user.email !== job.recipient) {
      return stop(tx, id, "REVIEW", "SNAPSHOT_OR_RECIPIENT_CHANGED", now);
    }
    const saved = job.envelope ? mailEnvelopeSchema.safeParse(job.envelope) : null;
    if (saved && (!saved.success || saved.data.to[0] !== job.recipient)) return stop(tx, id, "REVIEW", "ENVELOPE_INVALID", now);
    const envelope = saved?.success ? saved.data : { from: config.from, to: [job.recipient], ...renderPaymentConfirmation(snapshot.data, config.appUrl) };
    const lease = randomUUID();
    await tx.$executeRaw`UPDATE "PaymentConfirmationOutbox" SET "status"='PROCESSING', "attempts"="attempts"+1,
      "firstAttemptAt"=COALESCE("firstAttemptAt", ${now}), "envelope"=${JSON.stringify(envelope)}::jsonb,
      "senderConfigHash"=${fingerprint}, "leaseToken"=${lease}::uuid, "lockedUntil"=${new Date(now.getTime()+60_000)},
      "lastErrorCode"=NULL, "updatedAt"=${now} WHERE "id"=${id}::uuid`;
    return { kind: "CLAIMED", envelope, lease, attempts: job.attempts + 1 } as const;
  });
  if (claim.kind !== "CLAIMED") return claim.kind;
  let providerMessageId: string | null = null;
  let errorCode: "RETRYABLE" | "PROVIDER_REJECTED" | null = null;
  try {
    const result = await (options.send ?? sendConfirmationViaResend)(claim.envelope, `payment-confirmation/${id}`, config!.apiKey);
    if (!z.string().uuid().safeParse(result).success) throw new MailDeliveryError("RETRYABLE");
    providerMessageId = result;
  } catch (error) { errorCode = error instanceof MailDeliveryError ? error.code : "RETRYABLE"; }
  const finished = options.now?.() ?? new Date();
  const status = providerMessageId ? "SENT" : errorCode === "PROVIDER_REJECTED" || claim.attempts >= 5 ? "REVIEW" : "RETRY";
  // If this commit fails after acceptance, the same frozen envelope/key can be recovered after lease expiry.
  const changed = await prisma.$executeRaw`UPDATE "PaymentConfirmationOutbox" SET "status"=${status},
    "providerMessageId"=${providerMessageId}::uuid, "acceptedAt"=${providerMessageId ? finished : null}, "lastErrorCode"=${errorCode},
    "nextAttemptAt"=${new Date(finished.getTime()+Math.min(60_000*2**claim.attempts, 3600_000))},
    "leaseToken"=NULL, "lockedUntil"=NULL, "updatedAt"=${finished}
    WHERE "id"=${id}::uuid AND "status"='PROCESSING' AND "leaseToken"=${claim.lease}::uuid`;
  return changed === 1 ? status : "UNCHANGED";
}

export async function dispatchPaymentConfirmation(...args: Parameters<typeof dispatch>) {
  try { return await dispatch(...args); }
  catch (error) {
    if (error instanceof AdminOperationError) throw error;
    throw new Error("PAYMENT_CONFIRMATION_QUEUE_UNAVAILABLE");
  }
}

export type OutboxSummary = Pick<Job, "id" | "orderId" | "status" | "attempts" | "nextAttemptAt" | "acceptedAt" | "lastErrorCode" | "createdAt"> & { orderNumber: string };
export async function listPaymentConfirmations(adminId: string) {
  return prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    return tx.$queryRaw<OutboxSummary[]>`SELECT j."id", j."orderId", j."status", j."attempts", j."nextAttemptAt", j."acceptedAt",
      j."lastErrorCode", j."createdAt", o."number" AS "orderNumber" FROM "PaymentConfirmationOutbox" j
      JOIN "Order" o ON o."id"=j."orderId" ORDER BY j."createdAt" DESC, j."id" DESC LIMIT 50`;
  });
}
export async function readPaymentConfirmation(adminId: string, id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  return prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    const rows = await tx.$queryRaw<Array<Pick<Job, "id" | "recipient" | "payload" | "status" | "attempts" | "acceptedAt" | "nextAttemptAt" | "lastErrorCode">>>`
      SELECT "id", "recipient", "payload", "status", "attempts", "acceptedAt", "nextAttemptAt", "lastErrorCode"
      FROM "PaymentConfirmationOutbox" WHERE "id"=${id}::uuid`;
    const job = rows[0]; if (!job) return null;
    return { ...job, payload: confirmationSchema.parse(job.payload) as ConfirmationSnapshot };
  });
}
