import { z } from "zod";
import { verifyMicuentawebIpnSignature } from "./micuentaweb-core";
import type { GatewayCredentials } from "./gateway-crypto";

const minor = z.number().int().min(1).max(9999999999);
export const providerAnswerSchema = z.object({
  shopId: z.string().max(64), orderStatus: z.enum(["PAID", "UNPAID", "RUNNING"]),
  orderDetails: z.object({ orderId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), mode: z.enum(["TEST", "PRODUCTION"]),
    orderCurrency: z.string().regex(/^[A-Z]{3}$/), orderTotalAmount: minor, orderEffectiveAmount: z.number().int().min(0).max(9999999999) }),
  transactions: z.array(z.object({ uuid: z.string().regex(/^(?:[a-fA-F0-9]{32}|[a-fA-F0-9-]{36})$/),
    shopId: z.string().max(64), status: z.string().max(32), amount: minor, currency: z.string().regex(/^[A-Z]{3}$/),
    operationType: z.string().max(16) })).min(1).max(32),
});
export type ProviderAnswer = z.infer<typeof providerAnswerSchema>;
export function verifiedProviderAnswer(raw: string, hash: string, credentials: GatewayCredentials, source: "ipn" | "browser") {
  const key = source === "ipn" ? credentials.apiPassword : credentials.hmacKey;
  if (!verifyMicuentawebIpnSignature(raw, hash, key)) throw new Error("INVALID_NOTIFICATION");
  const parsed = providerAnswerSchema.safeParse(JSON.parse(raw));
  if (!parsed.success || parsed.data.shopId !== credentials.merchantId
    || parsed.data.orderDetails.mode !== (credentials.mode === "SANDBOX" ? "TEST" : "PRODUCTION")
    || (credentials.merchantId === "69876357" && credentials.mode !== "SANDBOX")) throw new Error("INVALID_NOTIFICATION");
  return parsed.data;
}
