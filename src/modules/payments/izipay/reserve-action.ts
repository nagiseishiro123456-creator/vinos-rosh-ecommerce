"use server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { automaticOrderSchema } from "@/modules/orders/automatic-order-input";
import { reserveMicuentawebSandboxOrder } from "@/modules/orders/automatic-order-service";
import { CheckoutConflictError } from "@/modules/orders/order-reservation-core";
import { resolveGatewayEnvironment } from "./gateway-settings";
import { isMicuentawebFormEnabled } from "./form-policy";

export async function reserveIzipayFormOrder(form: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/iniciar-sesion?callbackUrl=/checkout");
  let target = "/checkout?error=payment-unavailable";
  try {
    const environment = await resolveGatewayEnvironment();
    if (!isMicuentawebFormEnabled(environment)) throw new Error("DISABLED");
    const budget = await consumeRateLimit({ scope: "izipay-sandbox-reserve", identifier: session.user.id, limit: 10, windowMs: 10*60000 });
    if (!budget.allowed) throw new Error("LIMIT");
    const input = automaticOrderSchema.parse({ addressId: form.get("addressId"), checkoutQuote: form.get("checkoutQuote"),
      checkoutKey: form.get("checkoutKey"), expectedUserId: form.get("expectedUserId"), receiptType: form.get("receiptType"),
      documentNumber: form.get("documentNumber") || undefined, businessName: form.get("businessName") || undefined,
      taxAddress: form.get("taxAddress") || undefined, customerNotes: form.get("customerNotes") || undefined });
    const order = await reserveMicuentawebSandboxOrder(session.user.id, input, environment);
    target = `/pedidos/${order.number}/tarjeta`;
  } catch (error) {
    if (error instanceof CheckoutConflictError) target = `/pedidos/${error.orderNumber}?confirmation=conflict`;
  }
  redirect(target as Route);
}
