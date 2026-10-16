import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { checkoutSigningSecret } from "@/modules/checkout/signing";
import type { ManualOrderInput } from "@/modules/orders/manual-order-input";

export function createCheckoutKey(userId: string, quote: string, secret?: string) {
  if (!userId || !/^v1:[a-f0-9]{64}$/.test(quote)) throw new Error("INVALID_CHECKOUT_CONFIRMATION");
  return `ck1:${createHmac("sha256", checkoutSigningSecret(secret))
    .update("rosh-checkout-key:v1\n").update(JSON.stringify([userId, quote])).digest("hex")}`;
}

export function verifyCheckoutKey(key: string, userId: string, quote: string, secret?: string) {
  if (!/^ck1:[a-f0-9]{64}$/.test(key) || !/^v1:[a-f0-9]{64}$/.test(quote)) return false;
  return timingSafeEqual(Buffer.from(key), Buffer.from(createCheckoutKey(userId, quote, secret)));
}

// Input is normalized by the shared schema. Only accepted business fields enter the hash.
export function checkoutRequestHash(userId: string, input: ManualOrderInput) {
  return createHash("sha256").update(JSON.stringify([
    "reserve-manual-order:v1", userId, input.checkoutQuote, input.addressId,
    input.provider, input.receiptType, input.documentNumber ?? null,
    input.businessName ?? null, input.taxAddress ?? null, input.customerNotes ?? null,
  ])).digest("hex");
}
