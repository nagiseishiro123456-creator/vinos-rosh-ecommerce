import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { enqueuePaymentConfirmation } from "@/modules/notifications/outbox-service";
import { versionCredentials } from "./gateway-settings";
import { verifiedProviderAnswer } from "./notification-contract";

export class InvalidIzipayNotification extends Error { constructor() { super("INVALID_NOTIFICATION"); } }
/** Signature verification precedes writes. Neither PANs nor raw provider payloads are persisted. */
export async function acceptIzipayNotification(raw: string, hash: string, source: "ipn" | "browser", ownerId?: string, orderId?: string) {
  let reference: string;
  try { reference = JSON.parse(raw)?.orderDetails?.orderId; } catch { throw new InvalidIzipayNotification(); }
  if (typeof reference !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(reference)) throw new InvalidIzipayNotification();
  const [identity] = await prisma.$queryRaw<Array<{ id: string; orderId: string; gatewayVersionId: string | null; userId: string }>>`
    SELECT a."id",a."orderId",a."gatewayVersionId",o."userId" FROM "PaymentAttempt" a JOIN "Order" o ON o."id"=a."orderId"
    WHERE a."providerReference"=${reference}`;
  if (!identity?.gatewayVersionId || (source === "browser" && (!ownerId || identity.userId !== ownerId || identity.orderId !== orderId))) throw new InvalidIzipayNotification();
  const credentials = await versionCredentials(identity.gatewayVersionId);
  let answer;
  try { answer = verifiedProviderAnswer(raw, hash, credentials, source); } catch { throw new InvalidIzipayNotification(); }
  // A browser return is useful for a TEST result on localhost. Live approvals require a server-to-server IPN.
  if (source === "browser" && credentials.mode === "PRODUCTION") return "WAITING";
  const paid = answer.transactions.filter(transaction => transaction.status === "PAID" && transaction.operationType === "DEBIT");
  const transaction = paid.length === 1 ? paid[0] : answer.transactions[0];
  const eventHash = createHash("sha256").update(`${identity.id}\n${raw}`).digest("hex");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${identity.orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${transaction.uuid},71930222))`;
    const existing = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "IzipayPaymentEvent" WHERE "eventHash"=${eventHash}`;
    if (existing.length) return "DUPLICATE";
    const order = await tx.order.findUniqueOrThrow({ where: { id: identity.orderId }, include: { paymentAttempt: true, payments: true } });
    const attempt = order.paymentAttempt!;
    const applied = await tx.$queryRaw<Array<{ attemptId: string; amountMinor: bigint; currency: string; mode: string }>>`SELECT "attemptId","amountMinor","currency","mode" FROM "IzipayPaymentEvent"
      WHERE "transactionUuid"=${transaction.uuid} AND "outcome" IN ('TEST_APPROVED','APPROVED')`;
    if (applied.some(event => event.attemptId === attempt.id && event.amountMinor === BigInt(transaction.amount)
      && event.currency === transaction.currency && event.mode === answer.orderDetails.mode
      && answer.orderDetails.orderCurrency === event.currency && answer.orderDetails.orderTotalAmount === Number(event.amountMinor)
      && answer.orderDetails.orderEffectiveAmount === Number(event.amountMinor))) return "DUPLICATE";
    const consistent = !applied.length && paid.length === 1 && answer.orderStatus === "PAID"
      && answer.orderDetails.orderCurrency === "PEN" && transaction.currency === "PEN" && transaction.shopId === credentials.merchantId
      && answer.orderDetails.orderTotalAmount === Number(attempt.amountMinor)
      && answer.orderDetails.orderEffectiveAmount === Number(attempt.amountMinor) && transaction.amount === Number(attempt.amountMinor)
      && BigInt(order.total.toFixed(2).replace(".", "")) === attempt.amountMinor
      && order.paymentIntegration === "MICUENTAWEB_V4" && attempt.mode === answer.orderDetails.mode
      && (order.paymentMode ?? "TEST") === attempt.mode;
    const now = new Date();
    const eligible = consistent && order.payments.length === 0 && order.status === "PENDING_PAYMENT" && !!order.stockReservedAt && order.stockReservedAt <= now && !order.stockReleasedAt
      && !order.reservationExpiredAt && !!order.reservationExpiresAt && order.reservationExpiresAt > now && !order.paidAt;
    const outcome = answer.orderStatus !== "PAID" ? "NONFINAL" : !eligible ? "REVIEW"
      : credentials.mode === "SANDBOX" ? "TEST_APPROVED" : "APPROVED";
    await tx.$executeRaw`INSERT INTO "IzipayPaymentEvent" ("id","attemptId","transactionUuid","eventHash","outcome","mode","amountMinor","currency")
      VALUES (${randomUUID()}::uuid,${attempt.id},${transaction.uuid},${eventHash},${outcome},${answer.orderDetails.mode},${transaction.amount},${transaction.currency})`;
    if (outcome === "NONFINAL") return outcome;
    if (outcome === "TEST_APPROVED") {
      // Public demo signatures are forgeable. Test results NEVER mark orders PAID or enqueue commercial emails.
      await tx.orderEvent.create({ data: { orderId: order.id, kind: "IZIPAY_TEST_APPROVED", note: "Resultado de prueba verificado; no acredita dinero recibido ni habilita despacho." } });
      return outcome;
    }
    if (!consistent || order.payments.some(payment => payment.externalReference === transaction.uuid)) {
      await tx.orderEvent.create({ data: { orderId: order.id, kind: "IZIPAY_REVIEW", note: "Notificación requiere conciliación por identidad, importe, moneda o transacción repetida." } });
      return "REVIEW";
    }
    const paymentId = randomUUID();
    const amount = `${Math.floor(transaction.amount/100)}.${String(transaction.amount%100).padStart(2,"0")}`;
    await tx.$executeRaw`INSERT INTO "Payment" ("id","orderId","provider","status","amount","currency","externalReference","paidAt","updatedAt","notes")
      VALUES (${paymentId},${order.id},'IZIPAY',${outcome === "APPROVED" ? "PAID" : "UNDER_REVIEW"}::"PaymentStatus",
      ${amount}::decimal,'PEN',${transaction.uuid},${outcome === "APPROVED" ? now : null},${now},${outcome === "APPROVED" ? "Confirmación IPN verificada." : "Ingreso tardío: requiere conciliación; no reservar ni despachar automáticamente."})`;
    if (outcome === "APPROVED") {
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: now } });
      await enqueuePaymentConfirmation(tx, order.id);
      await tx.orderEvent.create({ data: { orderId: order.id, kind: "IZIPAY_PAID", note: "Pago confirmado por IPN firmada y campos verificados; sin nuevo descuento de stock." } });
    } else {
      await tx.paymentReconciliation.create({ data: { paymentId, receivedAmount: amount } });
      await tx.orderEvent.create({ data: { orderId: order.id, kind: "IZIPAY_LATE_PAYMENT", note: "Abono recibido después del cierre o vencimiento; requiere conciliación." } });
    }
    return outcome;
  });
}
