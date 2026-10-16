import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || undefined).optional();

export const manualOrderSchema = z.object({
  addressId: z.string().cuid(),
  checkoutQuote: z.string().regex(/^v1:[a-f0-9]{64}$/),
  checkoutKey: z.string().regex(/^ck1:[a-f0-9]{64}$/),
  provider: z.enum(["YAPE_MANUAL", "TRANSFER_MANUAL"]),
  receiptType: z.enum(["BOLETA", "FACTURA"]),
  documentNumber: optionalText(20), businessName: optionalText(180),
  taxAddress: optionalText(220), customerNotes: optionalText(500),
}).superRefine((data, ctx) => {
  if (data.receiptType === "FACTURA") {
    if (!/^\d{11}$/.test(data.documentNumber ?? "")) ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "RUC inválido" });
    if (!data.businessName) ctx.addIssue({ code: "custom", path: ["businessName"], message: "Razón social requerida" });
    if (!data.taxAddress) ctx.addIssue({ code: "custom", path: ["taxAddress"], message: "Dirección fiscal requerida" });
  }
});

export type ManualOrderInput = z.infer<typeof manualOrderSchema>;
