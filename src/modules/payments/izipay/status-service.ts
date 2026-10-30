import { prisma } from "@/lib/prisma";
import { paymentStatusSchema, type PaymentProgressState, type PaymentStatusSnapshot } from "./status-contract";

export class PaymentStatusUnavailableError extends Error {
  constructor() { super("PAYMENT_STATUS_UNAVAILABLE"); }
}

type StatusOrder = {
  id: string; number: string; status: PaymentStatusSnapshot["orderStatus"]; total: { toFixed: (places: number) => string };
  paidAt: Date | null; paymentIntegration: string | null; stockReservedAt: Date | null;
  reservationExpiresAt: Date | null; stockReleasedAt: Date | null; reservationExpiredAt: Date | null;
  paymentAttempt: { state: "INITIATING" | "TOKEN_READY" | "UNCERTAIN"; integration: string; mode: string;
    amountMinor: bigint; currency: string } | null;
};

/** Read-only projection. A token or browser callback can never establish payment approval. */
export function projectMicuentawebPaymentStatus(order: StatusOrder, now = new Date()): PaymentStatusSnapshot {
  if (order.paymentIntegration !== "MICUENTAWEB_V4") throw new PaymentStatusUnavailableError();
  const total = order.total.toFixed(2);
  const attempt = order.paymentAttempt;
  let state: PaymentProgressState;
  if (["CANCELLED", "REFUNDED"].includes(order.status)) state = "closed";
  else if (["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(order.status)) state = order.paidAt ? "confirmed" : "review";
  else if (order.status !== "PENDING_PAYMENT" || order.paidAt) state = "review";
  else if (order.stockReleasedAt || order.reservationExpiredAt || (order.reservationExpiresAt && order.reservationExpiresAt <= now)) state = "expired";
  else if (!order.stockReservedAt || order.stockReservedAt > now || !order.reservationExpiresAt) state = "review";
  else if (!attempt) state = "reserved";
  else if (!/^(0|[1-9]\d{0,7})\.\d{2}$/.test(total) || attempt.integration !== "MICUENTAWEB_V4"
      || attempt.mode !== "TEST" || attempt.currency !== "PEN" || attempt.amountMinor !== BigInt(total.replace(".", ""))) state = "review";
  else state = { INITIATING: "initiating", TOKEN_READY: "prepared", UNCERTAIN: "uncertain" }[attempt.state] as PaymentProgressState;

  return paymentStatusSchema.parse({ orderId: order.id, orderNumber: order.number, orderStatus: order.status,
    total, currency: "PEN", state, reservationExpiresAt: order.reservationExpiresAt?.toISOString() ?? null,
    confirmedAt: order.paidAt?.toISOString() ?? null, observedAt: now.toISOString() });
}

/** Ownership is checked in the query. No provider call, reservation expiry or database write. */
export async function readMicuentawebPaymentStatus(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId, paymentIntegration: "MICUENTAWEB_V4" }, select: {
    id: true, number: true, status: true, total: true, paidAt: true, paymentIntegration: true,
    stockReservedAt: true, reservationExpiresAt: true, stockReleasedAt: true, reservationExpiredAt: true,
    paymentAttempt: { select: { state: true, integration: true, mode: true, amountMinor: true, currency: true } },
  } });
  if (!order) throw new PaymentStatusUnavailableError();
  return projectMicuentawebPaymentStatus(order);
}
