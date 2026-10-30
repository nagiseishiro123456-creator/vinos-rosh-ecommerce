import { z } from "zod";
const place = (max: number) => z.string().trim().min(2, "Escribe al menos 2 caracteres.").max(max, `Usa como máximo ${max} caracteres.`).transform((value) => value.replace(/\s+/g, " "));
export const shippingZoneInputSchema = z.object({
  id: z.string().cuid().optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
  department: place(80), province: place(80), district: place(100),
  price: z.string().trim().regex(/^(0|[1-9]\d{0,4})(\.\d{1,2})?$/, "Usa un importe con hasta dos decimales, por ejemplo 8.50.")
    .refine((value) => {
      if (!/^(0|[1-9]\d{0,4})(\.\d{1,2})?$/.test(value)) return false;
      const [whole, fraction = ""] = value.split("."); return BigInt(whole + fraction.padEnd(2, "0")) <= BigInt(1_000_000);
    }, "La tarifa debe estar entre 0.00 y 10000.00.")
    .transform((value) => { const [whole, fraction = ""] = value.split("."); return whole + "." + fraction.padEnd(2, "0"); }),
}).strict().refine((value) => !!value.id === !!value.expectedUpdatedAt, { path: ["expectedUpdatedAt"], message: "Recarga la zona antes de modificarla." });
export type ShippingZoneInput = z.input<typeof shippingZoneInputSchema>;
