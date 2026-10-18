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
import { reserveManualOrder, ManualOrderError } from "@/modules/orders/manual-order-service";
import { cancelUnpaidReservation, reportManualPayment, PaymentReportError } from "@/modules/orders/reservation-service";
import { getCommerceSettings } from "@/modules/settings/queries";

const manualOrderSchema = z
  .object({
    addressId: z.string().cuid(),
    checkoutQuote: z.string().regex(/^v1:[a-f0-9]{64}$/),
    provider: z.enum(["YAPE_MANUAL", "TRANSFER_MANUAL"]),
    receiptType: z.enum(["BOLETA", "FACTURA"]),
    documentNumber: z.string().trim().max(20).optional(),
    businessName: z.string().trim().max(180).optional(),
    taxAddress: z.string().trim().max(220).optional(),
    customerNotes: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.receiptType === "FACTURA") {
      if (!/^\d{11}$/.test(data.documentNumber ?? "")) {
        ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "RUC inválido" });
      }
      if (!data.businessName) {
        ctx.addIssue({ code: "custom", path: ["businessName"], message: "Razón social requerida" });
      }
      if (!data.taxAddress) {
        ctx.addIssue({ code: "custom", path: ["taxAddress"], message: "Dirección fiscal requerida" });
      }
    }
  });

const orderNumberSchema = z.string().trim().min(8).max(48);

async function providerConfigured(provider: "YAPE_MANUAL" | "TRANSFER_MANUAL") {
  const settings = await getCommerceSettings();
  return provider === "YAPE_MANUAL" ? settings.yape.ready : settings.transfer.ready;
}

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

  if (!(await providerConfigured(parsed.data.provider))) {
    redirect(`/checkout/pago?addressId=${parsed.data.addressId}&error=provider`);
  }

  let createdOrder: { number: string };
  try {
    createdOrder = await reserveManualOrder(userId, parsed.data);
  } catch (error) {
    if (error instanceof ManualOrderError) {
      const codes = { QUOTE_CHANGED: "quote-changed", PENDING_LIMIT: "pending-limit", BUSY: "busy" };
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

  revalidatePath("/carrito");
  revalidatePath("/checkout");
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/inventario");
  redirect(`/pedidos/${createdOrder.number}/pagar?reserved=1`);
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
