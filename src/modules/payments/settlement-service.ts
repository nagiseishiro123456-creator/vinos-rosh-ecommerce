import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminOperationError, assertTransactionAdmin } from "@/modules/admin/transaction-auth";
import { moneyMinor, projectSettlement, settlementInputSchema, type SettlementInput } from "./settlement-contract";

export class SettlementError extends Error {
  constructor(public code: "INVALID_INPUT" | "COMMISSION_TOO_HIGH" | "FUTURE_DATE" | "CONFLICT" | "INCONSISTENT" | "NOT_FOUND" | "UNAVAILABLE") { super(code); }
}
type Row = {
  paymentId: string; orderId: string; orderNumber: string; provider: string; paymentStatus: string; orderStatus: string;
  paymentAmount: string; orderTotal: string; currency: string; paidAt: Date | null; orderPaidAt: Date | null; paymentCount: number;
  recordId: string | null; grossAmount: string | null; commissionAmount: string | null; depositedAmount: string | null;
  depositReference: string | null; depositDate: string | null; sourceReference: string | null; revision: number | null;
  updatedAt: Date | null;
};
const columns = Prisma.sql`p."id" AS "paymentId", p."orderId", o."number" AS "orderNumber", p."provider"::text,
  p."status"::text AS "paymentStatus", o."status"::text AS "orderStatus", p."amount"::text AS "paymentAmount",
  o."total"::text AS "orderTotal", p."currency", p."paidAt", o."paidAt" AS "orderPaidAt",
  (SELECT count(*)::int FROM "Payment" others WHERE others."orderId"=o."id") AS "paymentCount",
  s."id"::text AS "recordId", s."grossAmount"::text, s."commissionAmount"::text, s."depositedAmount"::text,
  s."depositReference", to_char(s."depositDate", 'YYYY-MM-DD') AS "depositDate", s."sourceReference", s."revision", s."updatedAt"`;
function eligible(row: Row) {
  return row.paymentStatus === "PAID" && ["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(row.orderStatus)
    && ["YAPE_MANUAL", "TRANSFER_MANUAL"].includes(row.provider) && row.currency === "PEN" && row.paymentCount === 1
    && !!row.paidAt && !!row.orderPaidAt && row.paidAt.getTime() === row.orderPaidAt.getTime() && row.paymentAmount === row.orderTotal
    && (!row.grossAmount || row.grossAmount === row.paymentAmount);
}
function view(row: Row) {
  const consistent = eligible(row);
  return { ...row, editable: consistent, ...projectSettlement(row.grossAmount ?? row.paymentAmount, row.commissionAmount, row.depositedAmount, consistent) };
}
async function safe<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof SettlementError || error instanceof AdminOperationError) throw error;
    throw new SettlementError("UNAVAILABLE");
  }
}
export async function listPaymentSettlements(adminId: string, page = 1) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) throw new SettlementError("INVALID_INPUT");
  return safe(() => prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`SELECT ${columns} FROM "Payment" p
      JOIN "Order" o ON o."id"=p."orderId" LEFT JOIN "PaymentSettlement" s ON s."paymentId"=p."id"
      WHERE (p."status"='PAID' AND p."provider" IN ('YAPE_MANUAL','TRANSFER_MANUAL')) OR s."id" IS NOT NULL
      ORDER BY p."createdAt" DESC, p."id" DESC LIMIT 26 OFFSET ${(page - 1) * 25}`);
    return { items: rows.slice(0, 25).map(view), hasNext: rows.length > 25, page };
  }));
}
export async function readPaymentSettlement(adminId: string, paymentId: string) {
  return safe(() => prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`SELECT ${columns} FROM "Payment" p JOIN "Order" o ON o."id"=p."orderId"
      LEFT JOIN "PaymentSettlement" s ON s."paymentId"=p."id" WHERE p."id"=${paymentId}`);
    if (!rows[0]) return null;
    const history = await tx.orderEvent.findMany({ where: { orderId: rows[0].orderId, kind: "PAYMENT_SETTLEMENT_RECORDED" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, select: { id: true, note: true, createdAt: true, actor: { select: { firstName: true, lastName: true } } } });
    return { ...view(rows[0]), history };
  }));
}
export async function savePaymentSettlement(adminId: string, paymentId: string, input: SettlementInput, now = new Date()) {
  const parsed = settlementInputSchema.safeParse(input);
  if (!parsed.success) throw new SettlementError("INVALID_INPUT");
  const data = parsed.data;
  // Calendar date is entered as Peru's local bank date, without a timezone conversion.
  if (data.depositDate && data.depositDate > now.toLocaleDateString("en-CA", { timeZone: "America/Lima" })) throw new SettlementError("FUTURE_DATE");
  return safe(() => prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, select: { orderId: true } });
    if (!payment) throw new SettlementError("NOT_FOUND");
    // Same order-first lock order as refunds. Lock payment before taking its current snapshot.
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id"=${payment.orderId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id"=${paymentId} FOR UPDATE`;
    const rows = await tx.$queryRaw<Row[]>(Prisma.sql`SELECT ${columns} FROM "Payment" p JOIN "Order" o ON o."id"=p."orderId"
      LEFT JOIN "PaymentSettlement" s ON s."paymentId"=p."id" WHERE p."id"=${paymentId}`);
    const row = rows[0];
    if (!row || !eligible(row)) throw new SettlementError("INCONSISTENT");
    if ((row.revision ?? 0) !== data.expectedRevision) throw new SettlementError("CONFLICT");
    if (data.commissionAmount !== null && moneyMinor(data.commissionAmount) > moneyMinor(row.paymentAmount)) throw new SettlementError("COMMISSION_TOO_HIGH");
    const revision = (row.revision ?? 0) + 1;
    const id = row.recordId ?? randomUUID();
    await tx.$executeRaw`INSERT INTO "PaymentSettlement" ("id", "paymentId", "grossAmount", "commissionAmount", "depositedAmount", "depositReference", "depositDate", "sourceReference", "revision", "createdAt", "updatedAt")
      VALUES (${id}::uuid, ${paymentId}, ${row.paymentAmount}::numeric, ${data.commissionAmount}::numeric, ${data.depositedAmount}::numeric,
        ${data.depositReference || null}, ${data.depositDate || null}::date, ${data.sourceReference}, ${revision}, ${now}, ${now})
      ON CONFLICT ("paymentId") DO UPDATE SET "commissionAmount"=EXCLUDED."commissionAmount", "depositedAmount"=EXCLUDED."depositedAmount",
        "depositReference"=EXCLUDED."depositReference", "depositDate"=EXCLUDED."depositDate", "sourceReference"=EXCLUDED."sourceReference",
        "revision"=EXCLUDED."revision", "updatedAt"=EXCLUDED."updatedAt"`;
    const result = projectSettlement(row.paymentAmount, data.commissionAmount, data.depositedAmount);
    const describe = (fee: string | null, amount: string | null, reference: string | null, date: string | null, source: string | null) =>
      `comisión PEN ${fee ?? "pendiente"}; abono PEN ${amount ?? "pendiente"}; referencia ${reference || "pendiente"}; fecha ${date || "pendiente"}; fuente ${source || "sin registro"}`;
    await tx.orderEvent.create({ data: { orderId: row.orderId, actorUserId: adminId, kind: "PAYMENT_SETTLEMENT_RECORDED",
      note: `Conciliación manual v${revision}. Antes: ${describe(row.commissionAmount, row.depositedAmount, row.depositReference, row.depositDate, row.sourceReference)}. Después: ${describe(data.commissionAmount, data.depositedAmount, data.depositReference, data.depositDate, data.sourceReference)}. Neto PEN ${result.net ?? "pendiente"}; diferencia PEN ${result.difference ?? "pendiente"}. Motivo: ${data.reason}`, createdAt: now } });
    return { revision, ...result };
  }));
}
