"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/modules/admin/auth";
import { AdminOperationError } from "@/modules/admin/transaction-auth";
import { settlementInputSchema } from "@/modules/payments/settlement-contract";
import { savePaymentSettlement, SettlementError } from "@/modules/payments/settlement-service";

export type SettlementFormState = { message?: string; errors?: Record<string, string> };
export async function recordSettlement(paymentId: string, _previous: SettlementFormState, form: FormData): Promise<SettlementFormState> {
  const session = await requireAdmin("/admin/conciliacion");
  const text = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)) : "";
  const revision = text("expectedRevision");
  const input = { expectedRevision: /^(0|[1-9]\d{0,9})$/.test(revision) ? Number(revision) : -1,
    commissionAmount: text("commissionAmount"), depositedAmount: text("depositedAmount"), depositReference: text("depositReference"),
    depositDate: text("depositDate"), sourceReference: text("sourceReference"), reason: text("reason") };
  const parsed = settlementInputSchema.safeParse(input);
  if (!parsed.success) return { message: "Revisa los campos indicados. Los cambios todavía no se guardaron.", errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) };
  if (text("confirm") !== "yes") return { message: "Confirma que revisaste el reporte y la cuenta del negocio." };
  try {
    const budget = await consumeRateLimit({ scope: "payment-settlement-admin", identifier: session.user.id, limit: 15, windowMs: 60_000 });
    if (!budget.allowed) return { message: "Espera un minuto antes de guardar más conciliaciones." };
    await savePaymentSettlement(session.user.id, paymentId, input);
  } catch (error) {
    if (error instanceof SettlementError) {
      if (error.code === "COMMISSION_TOO_HIGH") return { errors: { commissionAmount: "La comisión no puede superar el pago bruto confirmado." }, message: "Corrige la comisión." };
      if (error.code === "FUTURE_DATE") return { errors: { depositDate: "El abono verificado no puede tener una fecha futura en Perú." }, message: "Corrige la fecha del abono." };
      if (error.code === "CONFLICT") return { message: "Otra persona guardó una versión más reciente. Recarga la página y revisa el historial antes de volver a guardar." };
      if (error.code === "INCONSISTENT" || error.code === "NOT_FOUND") return { message: "El pago o el pedido cambió. Recarga y revisa su estado antes de continuar." };
    }
    if (error instanceof AdminOperationError) return { message: "Tu cuenta ya no tiene permisos de administración." };
    return { message: "No pudimos guardar la conciliación. Recarga y revisa el historial antes de reintentar." };
  }
  revalidatePath("/admin/conciliacion"); revalidatePath(`/admin/conciliacion/${paymentId}`);
  redirect(`/admin/conciliacion/${paymentId}?saved=1` as Route);
}
