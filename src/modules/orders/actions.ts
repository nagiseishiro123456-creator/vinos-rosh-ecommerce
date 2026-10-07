"use server";

import {
  InventoryMovementType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ReceiptType,
} from "@prisma/client";
import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { releaseStock, reserveStock, StockChangedError } from "@/modules/inventory/stock-service";
import { getCommerceSettings } from "@/modules/settings/queries";

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

function createOrderNumber() {
  const date = new Date();
  const ymd = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `ROSH-${ymd}-${random}`;
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

  const provider =
    parsed.data.provider === "YAPE_MANUAL"
      ? PaymentProvider.YAPE_MANUAL
      : PaymentProvider.TRANSFER_MANUAL;

  const duplicateOperation = await prisma.payment.findFirst({
    where: {
      provider,
      operationCode: parsed.data.operationCode,
      status: {
        in: [PaymentStatus.UNDER_REVIEW, PaymentStatus.PAID],
      },
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
      const stockAfterByProduct = await reserveStock(
        tx,
        cart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      );

      const order = await tx.order.create({
        data: {
          number: orderNumber,
          userId,
          addressId: address.id,
          status: OrderStatus.PAYMENT_REVIEW,
          subtotal,
          shippingAmount,
          total,
          receiptType:
            parsed.data.receiptType === "FACTURA"
              ? ReceiptType.FACTURA
              : ReceiptType.BOLETA,
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
        select: { id: true, number: true },
      });

      await tx.inventoryMovement.createMany({
        data: cart.items.map((item) => ({
          productId: item.product.id,
          orderId: order.id,
          actorUserId: userId,
          type: InventoryMovementType.ORDER_RESERVATION,
          quantity: -item.quantity,
          stockAfter: stockAfterByProduct.get(item.product.id) ?? 0,
          note: `Reserva por pedido ${order.number}`,
        })),
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return { number: order.number };
    });
  } catch (error) {
    if (error instanceof StockChangedError) {
      redirect("/carrito?error=stock-changed");
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirect(`/checkout/pago?addressId=${parsed.data.addressId}&error=duplicate-operation`);
    }

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
