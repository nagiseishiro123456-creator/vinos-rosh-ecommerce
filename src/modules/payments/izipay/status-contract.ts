import { z } from "zod";

export const paymentProgressStates = ["reserved", "initiating", "prepared", "uncertain", "expired", "confirmed", "closed", "review"] as const;
export const paymentStatusSchema = z.object({
  orderId: z.string().cuid(),
  orderNumber: z.string().min(1).max(64),
  state: z.enum(paymentProgressStates),
  orderStatus: z.enum(["PENDING_PAYMENT", "PAYMENT_REVIEW", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  total: z.string().regex(/^(0|[1-9]\d{0,7})\.\d{2}$/),
  currency: z.literal("PEN"),
  reservationExpiresAt: z.string().datetime().nullable(),
  confirmedAt: z.string().datetime().nullable(),
  observedAt: z.string().datetime(),
}).strict().superRefine((value, context) => {
  const paid = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(value.orderStatus);
  if (value.state === "confirmed" && (!paid || !value.confirmedAt)) {
    context.addIssue({ code: "custom", message: "Unconfirmed payment state" });
  }
});
export type PaymentStatusSnapshot = z.infer<typeof paymentStatusSchema>;
export type PaymentProgressState = PaymentStatusSnapshot["state"];

export const paymentProgressCopy: Record<PaymentProgressState, { title: string; message: string; tone: "neutral" | "waiting" | "warning" | "success" }> = {
  reserved: { title: "Tu pedido está reservado", message: "La reserva está guardada. Todavía no hemos registrado un pago para este pedido.", tone: "neutral" },
  initiating: { title: "Estamos verificando el inicio", message: "El intento sigue pendiente de verificación. Actualiza el estado antes de volver a intentar.", tone: "waiting" },
  prepared: { title: "El formulario fue preparado", message: "Preparar el formulario no confirma un pago. Si perdiste esa pantalla, consulta el estado antes de iniciar otro intento.", tone: "neutral" },
  uncertain: { title: "Necesitamos verificar el intento", message: "No podemos confirmar el resultado todavía. Si ya pagaste, no pagues otra vez; contacta a la tienda con el número de pedido.", tone: "warning" },
  expired: { title: "La reserva venció", message: "El plazo de reserva terminó. Si ya pagaste, contacta a la tienda para revisar el abono antes de hacer otra compra.", tone: "warning" },
  confirmed: { title: "Pago confirmado", message: "El servidor registró la confirmación del pago. Puedes seguir el estado de preparación y entrega desde tu pedido.", tone: "success" },
  closed: { title: "Este pedido está cerrado", message: "El pedido fue cancelado o reembolsado. Consulta su detalle o contacta a la tienda si tienes una operación pendiente de revisar.", tone: "neutral" },
  review: { title: "El pedido requiere revisión", message: "Hay información que necesita verificar la tienda. Conserva tu número de pedido y evita realizar otro pago para este pedido.", tone: "warning" },
};
