"use server";

import { PaymentProvider, PaymentStatus, ReceiptType, OrderStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const manualOrderSchema = z
  .object({
    addressId: z.string().cuid(),
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

function isEnabled(name: string) {
  return process.env[name] === "true";
}

function providerConfigured(provider: "YAPE_MANUAL" | "TRANSFER_MANUAL") {
  if (provider === "YAPE_MANUAL") {
    return (
      isEnabled("PAYMENTS_YAPE_MANUAL_ENABLED") &&
      Boolean(process.env.YAPE_PHONE || process.env.YAPE_QR_IMAGE_URL)
    );
  }

  return (
    isEnabled("PAYMENTS_TRANSFER_MANUAL_ENABLED") &&
    Boolean(process.env.BANK_ACCOUNT_NUMBER)
  );
}

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/checkout");
  }
  return session.user.id;
}

function createOrderNumber() {
  const date = new Date();
  const ymd = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("");
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `ROSH-${ymd}-${random}`;
}

export async function submitManualOrder(formData: FormData) {
  const userId = await requireUser();

  const parsed = manualOrderSchema.safeParse({
    addressId: formData.get("addressId"),
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

  if (!providerConfigured(parsed.data.provider)) {
    redirect(`/checkout/pago?addressId=${parsed.data.addressId}&error=provider`);
  }

  const provider = parsed.data.provider === "YAPE_MANUAL"
    ? PaymentProvider.YAPE_MANUAL
    : PaymentProvider.TRANSFER_MANUAL;

  const duplicateOperation = await prisma.payment.findFirst({
    where: {
      provider,
      operationCode: parsed.data.operationCode,
      status: { in: [PaymentStatus.UNDER_REVIEW, PaymentStatus.PAID] },
    },
    select: { id: true },
  });

  if (duplicateOperation) {
    redirect(`/checkout/pago?addressId=${parsed.data.addressId}&error=duplicate-operation`);
  }

  const [address, cart] = await Promise.all([
    prisma.address.findFirst({
      where: { id: parsed.data.addressId, userId, active: true },
    }),
    prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
                active: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!address || !cart || cart.items.length === 0) {
    redirect("/carrito");
  }

  const shippingZone = await prisma.shippingZone.findFirst({
    where: {
      active: true,
      department: address.department,
      province: address.province,
      district: address.district,
    },
  });

  if (!shippingZone) {
    redirect(`/checkout?addressId=${address.id}&error=unsupported-zone`);
  }

  const invalidItem = cart.items.find(
    (item) => !item.product.active || item.quantity < 1 || item.quantity > item.product.stock,
  );

  if (invalidItem) {
    redirect("/carrito?error=stock-changed");
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const shippingAmount = Number(shippingZone.price);
  const total = subtotal + shippingAmount;
  const orderNumber = createOrderNumber();

  let createdOrder: { number: string };

  try {
    createdOrder = await prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const reserved = await tx.product.updateMany({
          where: {
            id: item.product.id,
            active: true,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (reserved.count !== 1) {
          throw new Error("STOCK_CHANGED");
        }
      }

      const order = await tx.order.create({
        data: {
          number: orderNumber,
          userId,
          addressId: address.id,
          status: OrderStatus.PAYMENT_REVIEW,
          subtotal,
          shippingAmount,
          total,
          receiptType: parsed.data.receiptType === "FACTURA" ? ReceiptType.FACTURA : ReceiptType.BOLETA,
          documentNumber: parsed.data.documentNumber,
          businessName: parsed.data.businessName,
          taxAddress: parsed.data.taxAddress,
          shippingRecipient: address.recipient,
          shippingPhone: address.phone,
          shippingDepartment: address.department,
          shippingProvince: address.province,
          shippingDistrict: address.district,
          shippingAddress: address.addressLine1,
          shippingReference: address.reference,
          customerNotes: parsed.data.customerNotes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.product.id,
              productName: item.product.name,
              productSku: item.product.sku,
              unitPrice: item.product.price,
              quantity: item.quantity,
              subtotal: Number(item.product.price) * item.quantity,
            })),
          },
          payments: {
            create: {
              provider,
              status: PaymentStatus.UNDER_REVIEW,
              amount: total,
              currency: "PEN",
              operationCode: parsed.data.operationCode,
            },
          },
        },
        select: { number: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK_CHANGED") {
      redirect("/carrito?error=stock-changed");
    }
    throw error;
  }

  revalidatePath("/carrito");
  revalidatePath("/checkout");
  revalidatePath("/mi-cuenta");
  redirect(`/pedidos/${createdOrder.number}?created=1`);
}
