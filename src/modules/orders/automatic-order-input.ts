import { createHash } from "node:crypto";
import { z } from "zod";
import { checkoutOrderFields, validateInvoice } from "./manual-order-input";

export const automaticOrderSchema = z.object({
  ...checkoutOrderFields, expectedUserId: z.string().cuid(),
}).strict().superRefine(validateInvoice);
export type AutomaticOrderInput = z.infer<typeof automaticOrderSchema>;

// Same checkout identity slot, distinct method fingerprint: changing method is a conflict.
export function automaticOrderRequestHash(userId: string, input: AutomaticOrderInput) {
  return createHash("sha256").update(JSON.stringify([
    "reserve-micuentaweb-test-order:v1", userId, input.checkoutQuote, input.addressId,
    "MICUENTAWEB_V4", "TEST", input.receiptType, input.documentNumber ?? null,
    input.businessName ?? null, input.taxAddress ?? null, input.customerNotes ?? null,
  ])).digest("hex");
}
