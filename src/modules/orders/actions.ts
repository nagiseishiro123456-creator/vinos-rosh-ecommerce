"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { StockChangedError } from "@/modules/inventory/stock-service";
import { MoneyError } from "@/modules/checkout/pricing";
import { CheckoutUnavailableError } from "@/modules/checkout/snapshot";
import { reserveManualOrder, ManualOrderError, CheckoutConflictError } from "@/modules/orders/manual-order-service";
import { cancelUnpaidReservation, reportManualPayment, PaymentReportError } from "@/modules/orders/reservation-service";
import { manualOrderSchema } from "@/modules/orders/manual-order-input";

const orderNumberSchema = z.string().trim().min(8).max(48);

async function requireUser(callbackUrl = "/checkout") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session.user.id;
}

export async function reserveOrder(formData: FormData) {
  const userId = await requireUser();

  const rateLimit = await consumeRateLimit({
    scope: "manual-order-submit",
    identifier: userId,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    redirect(`/checkout/pago?addressId=${encodeURIComponent(String(formData.get("addressId") ?? ""))}&error=too-many`);
  }

  const parsed = manualOrderSchema.safeParse({
    addressId: formData.get("addressId"),
    checkoutQuote: formData.get("checkoutQuote"),
    checkoutKey: formData.get("checkoutKey"),
    provider: formData.get("provider"),
    receiptType: formData.get("receiptType"),
    documentNumber: formData.get("documentNumber") || undefined,
    businessName: formData.get("businessName") || undefined,
    taxAddress: formData.get("taxAddress") || undefined,
    customerNotes: formData.get("customerNotes") || undefined,
  });

  if (!parsed.success) {
    redirect(`/checkout/pago?addressId=${encodeURIComponent(String(formData.get("addressId") ?? ""))}&error=invalid`);
  }

  let createdOrder: { number: string; replayed: boolean };
  try {
    createdOrder = await reserveManualOrder(userId, parsed.data);
  } catch (error) {
    if (error instanceof CheckoutConflictError) redirect(`/pedidos/${error.orderNumber}?confirmation=conflict`);
    if (error instanceof ManualOrderError) {
      const codes = { QUOTE_CHANGED: "quote-changed", PENDING_LIMIT: "pending-limit", BUSY: "busy", INVALID_CONFIRMATION: "invalid-confirmation", PROVIDER_UNAVAILABLE: "provider" };
      redirect(`/checkout/pago?addressId=${parsed.data.addressId}&error=${codes[error.code]}`);
    }
    if (error instanceof CheckoutUnavailableError) {
      if (error.code === "UNSUPPORTED_ZONE") redirect(`/checkout?addressId=${parsed.data.addressId}&error=unsupported-zone`);
      redirect("/carrito?error=stock-changed");
    }
    if (error instanceof MoneyError) redirect("/carrito?error=amount-invalid");
    if (error instanceof StockChangedError) redirect("/carrito?error=stock-changed");
    throw error;
  }

  revalidatePath("/", "layout");
  revalidatePath("/carrito");
  revalidatePath("/checkout");
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/inventario");
  redirect(`/pedidos/${createdOrder.number}/pagar?${createdOrder.replayed ? "recovered" : "reserved"}=1`);
}

export async function cancelPendingOrder(orderNumber: string) {
  const parsed = orderNumberSchema.safeParse(orderNumber);
  if (!parsed.success) return;
  const userId = await requireUser(`/pedidos/${parsed.data}`);
  const cancelled = await cancelUnpaidReservation(userId, parsed.data);
  refreshOrder(parsed.data);
  redirect(`/pedidos/${parsed.data}?cancel=${cancelled ? "cancelled" : "unavailable"}`);
}

function refreshOrder(number: string) {
  for (const path of ["/carrito", "/mi-cuenta", "/admin", "/admin/pagos", "/admin/pedidos", "/admin/inventario", `/pedidos/${number}`, `/pedidos/${number}/pagar`]) revalidatePath(path);
}

export async function communicateManualPayment(orderNumber: string, formData: FormData) {
  const number = orderNumberSchema.safeParse(orderNumber);
  if (!number.success) return;
  const userId = await requireUser(`/pedidos/${number.data}/pagar`);
  const limit = await consumeRateLimit({ scope: "manual-payment-report", identifier: userId, limit: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) redirect(`/pedidos/${number.data}/pagar?error=too-many`);
  const code = z.string().trim().min(4).max(80).safeParse(formData.get("operationCode"));
  if (!code.success) redirect(`/pedidos/${number.data}/pagar?error=invalid`);
  let result;
  try {
    result = await reportManualPayment(userId, number.data, code.data);
  } catch (error) {
    if (error instanceof PaymentReportError) redirect(`/pedidos/${number.data}/pagar?error=${error.code === "DUPLICATE_OPERATION" ? "duplicate-operation" : "invalid"}`);
    throw error;
  }
  refreshOrder(number.data);
  redirect(`/pedidos/${number.data}?payment=${result}`);
}
