import { z } from "zod";

const moneyPattern = /^(?:0|[1-9]\d{0,7})\.\d{2}$/;
const optionalMoney = z.string().trim().max(11).refine((value) => value === "" || moneyPattern.test(value), "Usa dos decimales, por ejemplo 2.50; deja vacío si no lo sabes.").transform((value) => value || null);
const reference = z.string().trim().max(120, "Usa como máximo 120 caracteres.").regex(/^[^\r\n]*$/, "Escribe la referencia en una sola línea.");
const realDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const settlementInputSchema = z.object({
  expectedRevision: z.number().int().min(0).max(2_147_483_646),
  commissionAmount: optionalMoney,
  depositedAmount: optionalMoney,
  depositReference: reference,
  depositDate: z.string().trim().refine((value) => value === "" || realDate(value), "Indica una fecha válida de abono."),
  sourceReference: reference.refine((value) => value.length >= 4, "Identifica el reporte o extracto revisado, con al menos 4 caracteres."),
  reason: z.string().trim().min(4, "Explica el registro o la corrección con al menos 4 caracteres.").max(500, "Usa como máximo 500 caracteres."),
}).strict().superRefine((data, context) => {
  if (data.depositedAmount !== null) {
    if (data.depositReference.length < 3) context.addIssue({ code: "custom", path: ["depositReference"], message: "Indica la referencia del abono verificado, con al menos 3 caracteres." });
    if (!data.depositDate) context.addIssue({ code: "custom", path: ["depositDate"], message: "Indica la fecha del abono verificado." });
  } else {
    if (data.depositReference) context.addIssue({ code: "custom", path: ["depositReference"], message: "Registra el importe abonado o deja también la referencia vacía." });
    if (data.depositDate) context.addIssue({ code: "custom", path: ["depositDate"], message: "Registra el importe abonado o deja también la fecha vacía." });
  }
});
export type SettlementInput = z.input<typeof settlementInputSchema>;
export type SettlementData = z.output<typeof settlementInputSchema>;
export type SettlementState = "PENDING_COSTS" | "PENDING_DEPOSIT" | "MATCHED" | "DIFFERENCE" | "REVIEW";
export const settlementCopy: Record<SettlementState, { label: string; message: string }> = {
  PENDING_COSTS: { label: "Comisión pendiente", message: "El costo todavía es desconocido; no se calcula el neto ni se da por conciliado." },
  PENDING_DEPOSIT: { label: "Abono pendiente", message: "El neto está calculado, pero falta verificar el importe recibido en la cuenta." },
  MATCHED: { label: "Conciliado manualmente", message: "El abono registrado coincide con el neto calculado a partir del reporte revisado." },
  DIFFERENCE: { label: "Diferencia por revisar", message: "El importe abonado difiere del neto esperado. Comprueba el reporte y la cuenta del negocio." },
  REVIEW: { label: "Revisión necesaria", message: "El pago o el pedido cambió; conserva el registro y revisa su historial antes de continuar." },
};
export function moneyMinor(value: string) {
  if (!moneyPattern.test(value)) throw new Error("INVALID_SETTLEMENT_MONEY");
  return BigInt(value.replace(".", ""));
}
function decimal(value: bigint) {
  const sign = value < BigInt(0) ? "-" : "";
  const digits = (value < BigInt(0) ? -value : value).toString().padStart(3, "0");
  return sign + digits.slice(0, -2) + "." + digits.slice(-2);
}
export function projectSettlement(gross: string, commission: string | null, deposited: string | null, consistent = true) {
  const amount = moneyMinor(gross);
  const fee = commission === null ? null : moneyMinor(commission);
  const received = deposited === null ? null : moneyMinor(deposited);
  if (!consistent || amount <= BigInt(0) || (fee !== null && fee > amount)) return { state: "REVIEW" as SettlementState, net: null, difference: null };
  const net = fee === null ? null : amount - fee;
  const difference = net === null || received === null ? null : received - net;
  const state: SettlementState = net === null ? "PENDING_COSTS" : received === null ? "PENDING_DEPOSIT" : difference === BigInt(0) ? "MATCHED" : "DIFFERENCE";
  return { state, net: net === null ? null : decimal(net), difference: difference === null ? null : decimal(difference) };
}
