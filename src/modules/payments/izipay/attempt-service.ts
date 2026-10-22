import { createHash, randomUUID } from "node:crypto";
import { PaymentAttemptState, Prisma, type PaymentAttempt } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildMicuentawebPayment, readMicuentawebSandboxConfig, type SandboxEnvironment,
} from "@/modules/payments/izipay/micuentaweb-core";

export class PaymentAttemptError extends Error {
  constructor(public readonly code: "ORDER_UNAVAILABLE" | "INVALID_COMPLETION" | "BUSY") {
    super(code);
    this.name = "PaymentAttemptError";
  }
}

function view(attempt: PaymentAttempt) {
  // JSON-safe metadata; no token, email or private credential in this projection.
  return {
    id: attempt.id, providerReference: attempt.providerReference, state: attempt.state,
    amountMinor: attempt.amountMinor.toString(), currency: attempt.currency,
    createdAt: attempt.createdAt, tokenReadyAt: attempt.tokenReadyAt, uncertainAt: attempt.uncertainAt,
  };
}

/**
 * Internal preparation only; userId must come from the server's authenticated session.
 * Never pass an HTTP body as an order snapshot. Never run provider calls inside this transaction.
 * Only the creator may perform ONE outbound request; every replay returns created:false.
 */
export async function beginMicuentawebSandboxAttempt(
  userId: string, orderId: string, environment: SandboxEnvironment,
) {
  readMicuentawebSandboxConfig(environment);
  if (!userId || !orderId) throw new PaymentAttemptError("ORDER_UNAVAILABLE");
  try {
    return await prisma.$transaction(async (tx) => {
      // Serialize creators and observe cancellation/expiry already committed on the order.
      const owned = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Order" WHERE "id" = ${orderId} AND "userId" = ${userId} FOR UPDATE
      `;
      if (owned.length !== 1) throw new PaymentAttemptError("ORDER_UNAVAILABLE");
      const existing = await tx.paymentAttempt.findUnique({ where: { orderId } });
      if (existing) return { created: false as const, attempt: view(existing) };

      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: {
        status: true, total: true, stockReservedAt: true, reservationExpiresAt: true,
        stockReleasedAt: true, reservationExpiredAt: true, paidAt: true,
        user: { select: { email: true } }, payments: { select: { id: true } },
      } });
      const now = new Date();
      if (order.status !== "PENDING_PAYMENT" || !order.stockReservedAt || order.stockReservedAt > now
        || !order.reservationExpiresAt || order.reservationExpiresAt <= now
        || order.stockReleasedAt || order.reservationExpiredAt || order.paidAt || order.payments.length !== 0) {
        // Manual/Culqi orders retain their existing flow; no automatic method conversion.
        throw new PaymentAttemptError("ORDER_UNAVAILABLE");
      }
      const snapshot = {
        orderReference: randomUUID(), total: order.total.toFixed(2), currency: "PEN" as const,
        customerEmail: order.user.email,
      };
      const payload = buildMicuentawebPayment(snapshot);
      const attempt = await tx.paymentAttempt.create({ data: {
        orderId, providerReference: snapshot.orderReference, integration: "MICUENTAWEB_V4", mode: "TEST",
        amountMinor: BigInt(payload.amount), currency: payload.currency,
      } });
      return { created: true as const, attempt: view(attempt), snapshot };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 3_000, timeout: 5_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError
      && ["P2002", "P2028", "P2034"].includes(error.code)) throw new PaymentAttemptError("BUSY");
    throw error;
  }
}

/** Internal completion, never callable with a token/reference supplied by a browser. */
export async function recordMicuentawebTokenReady(attemptId: string, formToken: unknown) {
  if (typeof formToken !== "string" || !formToken.trim() || Buffer.byteLength(formToken, "utf8") > 65_536) {
    throw new PaymentAttemptError("INVALID_COMPLETION");
  }
  const changed = await prisma.paymentAttempt.updateMany({
    where: { id: attemptId, state: PaymentAttemptState.INITIATING },
    data: { state: PaymentAttemptState.TOKEN_READY,
      tokenHash: createHash("sha256").update(formToken, "utf8").digest("hex"), tokenReadyAt: new Date() },
  });
  return changed.count === 1;
}

/** Timeout/crash recovery blocks new requests; no automatic unlock, retry, refund or PAID effect. */
export async function recordMicuentawebAttemptUncertain(attemptId: string) {
  const changed = await prisma.paymentAttempt.updateMany({
    where: { id: attemptId, state: PaymentAttemptState.INITIATING },
    data: { state: PaymentAttemptState.UNCERTAIN, uncertainAt: new Date() },
  });
  return changed.count === 1;
}
