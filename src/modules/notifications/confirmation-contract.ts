import { z } from "zod";

const money = z.string().regex(/^(0|[1-9]\d{0,7})\.\d{2}$/);
export const confirmationSchema = z.object({
  version: z.literal(1), orderNumber: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), firstName: z.string().max(120),
  total: money, subtotal: money, shippingAmount: money, currency: z.literal("PEN"), paidAt: z.string().datetime(),
  items: z.array(z.object({ name: z.string().min(1).max(300), quantity: z.number().int().min(1).max(99),
    unitPrice: money, subtotal: money }).strict()).min(1).max(200),
}).strict().superRefine((value, context) => {
  const amounts = [value.total, value.subtotal, value.shippingAmount, ...value.items.flatMap((item) => [item.unitPrice, item.subtotal])];
  if (amounts.some((amount) => !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(amount)) || value.items.some((item) => !Number.isInteger(item.quantity))) return;
  const cents = (amount: string) => BigInt(amount.replace(".", ""));
  const sum = value.items.reduce((n, item) => n + cents(item.subtotal), BigInt(0));
  if (sum !== cents(value.subtotal) || cents(value.subtotal) + cents(value.shippingAmount) !== cents(value.total)
    || value.items.some((item) => cents(item.unitPrice) * BigInt(item.quantity) !== cents(item.subtotal))) {
    context.addIssue({ code: "custom", message: "Inconsistent confirmation totals" });
  }
});
export type ConfirmationSnapshot = z.infer<typeof confirmationSchema>;
export const outboxStates = ["QUEUED", "PROCESSING", "SENT", "RETRY", "REVIEW", "CANCELLED"] as const;
export type OutboxState = typeof outboxStates[number];
export const outboxCopy: Record<OutboxState, { label: string; message: string }> = {
  QUEUED: { label: "Pendiente", message: "El pago está confirmado. El aviso está guardado y pendiente de envío." },
  PROCESSING: { label: "Procesando", message: "Hay un intento de envío en curso. No se iniciará otro mientras siga vigente." },
  SENT: { label: "Aceptado por el proveedor", message: "El proveedor aceptó el correo. Esto no acredita su entrega en la bandeja del comprador." },
  RETRY: { label: "Reintento pendiente", message: "El pedido conserva su pago. Se podrá reintentar el mismo aviso cuando llegue la fecha indicada." },
  REVIEW: { label: "Revisión necesaria", message: "Revisa la configuración y el historial con el proveedor antes de repetir el envío." },
  CANCELLED: { label: "Aviso detenido", message: "El pedido cambió de estado y este aviso de confirmación no se enviará." },
};
