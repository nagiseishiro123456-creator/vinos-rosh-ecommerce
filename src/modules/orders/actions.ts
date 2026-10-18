"use server";

import {
  InventoryMovementType,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { releaseStock, StockChangedError } from "@/modules/inventory/stock-service";
import { MoneyError } from "@/modules/checkout/pricing";
import { CheckoutUnavailableError } from "@/modules/checkout/snapshot";
import { createManualOrder, ManualOrderError } from "@/modules/orders/manual-order-service";
import { getCommerceSettings } from "@/modules/settings/queries";

const manualOrderSchema = z
  .object({
    addressId: z.string().cuid(),
    checkoutQuote: z.string().regex(/^v1:[a-f0-9]{64}$/),
    provider: z.enum(["YAPE_MANUAL", "TRANSFER_MANUAL"]),
    receiptType: z.enum(["BOLETA", "FACTURA"]),
    operationCode: z.string().trim().min(4).max(80),
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

export async function submitManualOrder(formData: FormData) {
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
    operationCode: formData.get("operationCode"),
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
    createdOrder = await createManualOrder(userId, parsed.data);
  } catch (error) {
    if (error instanceof ManualOrderError) {
      const codes = { QUOTE_CHANGED: "quote-changed", PENDING_LIMIT: "pending-limit", DUPLICATE_OPERATION: "duplicate-operation", BUSY: "busy" };
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
  redirect(`/pedidos/${createdOrder.number}?created=1`);
}

export async function cancelPendingOrder(orderNumber: string) {
  const parsed = orderNumberSchema.safeParse(orderNumber);
  if (!parsed.success) return;

  const userId = await requireUser(`/pedidos/${parsed.data}`);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        number: parsed.data,
        userId,
      },
      select: {
        id: true,
        number: true,
        status: true,
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    if (
      !order ||
      (order.status !== OrderStatus.PENDING_PAYMENT &&
        order.status !== OrderStatus.PAYMENT_REVIEW)
    ) {
      return "unavailable" as const;
    }

    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
      },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: now,
      },
    });

    if (claimed.count !== 1) {
      return "unavailable" as const;
    }

    if (order.status === OrderStatus.PAYMENT_REVIEW) {
      const stockAfterByProduct = await releaseStock(tx, order.items);

      await tx.inventoryMovement.createMany({
        data: order.items.map((item) => ({
          productId: item.productId,
          orderId: order.id,
          actorUserId: userId,
          type: InventoryMovementType.ORDER_RELEASE,
          quantity: item.quantity,
          stockAfter: stockAfterByProduct.get(item.productId) ?? 0,
          note: `Liberación por cancelación del pedido ${order.number}`,
        })),
      });
    }

    await tx.payment.updateMany({
      where: {
        orderId: order.id,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.UNDER_REVIEW] },
      },
      data: {
        status: PaymentStatus.CANCELLED,
      },
    });

    return "cancelled" as const;
  });

  revalidatePath("/mi-cuenta");
  revalidatePath("/admin");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/inventario");
  revalidatePath(`/pedidos/${parsed.data}`);

  redirect(`/pedidos/${parsed.data}?cancel=${result}`);
}
