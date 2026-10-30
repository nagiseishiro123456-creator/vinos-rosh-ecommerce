import { z } from "zod";
export function normalizeDeliveryPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  return compact.startsWith("+51") ? compact.slice(3) : /^51\d{9}$/.test(compact) ? compact.slice(2) : compact;
}
export const deliveryAddressSchema = z.object({
  label: z.string().trim().max(40, "Usa como máximo 40 caracteres."),
  recipient: z.string().trim().min(2, "Indica el nombre de quien recibirá el pedido.").max(120, "Usa como máximo 120 caracteres."),
  phone: z.string().max(25).transform(normalizeDeliveryPhone).refine((value) => /^9\d{8}$/.test(value), "Escribe un celular peruano de 9 dígitos que empiece con 9. Puedes incluir +51."),
  shippingZoneId: z.string().cuid("Selecciona una zona de entrega activa."),
  addressLine1: z.string().trim().min(5, "Indica calle o avenida y número, con al menos 5 caracteres.").max(200, "Usa como máximo 200 caracteres."),
  reference: z.string().trim().max(250, "Usa como máximo 250 caracteres."),
  isDefault: z.boolean(),
}).strict();
export type DeliveryAddressInput = z.input<typeof deliveryAddressSchema>;
