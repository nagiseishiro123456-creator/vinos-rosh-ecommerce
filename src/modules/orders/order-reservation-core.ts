import { InventoryMovementType, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { checkoutRequestHash, verifyCheckoutKey } from "@/modules/checkout/idempotency";
import type { ManualOrderInput } from "./manual-order-input";
import { automaticOrderRequestHash, type AutomaticOrderInput } from "./automatic-order-input";
import { readMicuentawebSandboxConfig, type SandboxEnvironment } from "@/modules/payments/izipay/micuentaweb-core";
import { resolveCommerceSettings, COMMERCE_SETTINGS_ID } from "@/modules/settings/queries";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { assertOrderAmountFits } from "@/modules/checkout/pricing";
import { verifyCheckoutQuote } from "@/modules/checkout/quote";
import { loadCheckoutSnapshot } from "@/modules/checkout/snapshot";
import { reserveStock } from "@/modules/inventory/stock-service";
import { getReservationExpiresAt } from "@/modules/orders/hold";

export class OrderReservationError extends Error {
  constructor(public code: "QUOTE_CHANGED" | "PENDING_LIMIT" | "BUSY" | "INVALID_CONFIRMATION" | "PROVIDER_UNAVAILABLE") {
    super(code);
  }
}

type ReservationInput = (ManualOrderInput & { kind: "manual" }) | (AutomaticOrderInput & { kind: "micuentaweb-test" });

export class CheckoutConflictError extends Error {
  constructor(public orderNumber: string) { super("CHECKOUT_CONFLICT"); }
}

function replayOrder(order: { id: string; number: string; checkoutRequestHash: string | null; paymentIntegration: string | null }, requestHash: string, integration: string | null) {
  if (order.checkoutRequestHash !== requestHash || order.paymentIntegration !== integration) throw new CheckoutConflictError(order.number);
  return { id: order.id, number: order.number, replayed: true };
}

// Shared ACID path: no payment-provider network I/O is allowed inside this transaction.
export async function reserveOrder(userId: string, input: ReservationInput, environment: SandboxEnvironment = process.env) {
  const integration = input.kind === "manual" ? null : "MICUENTAWEB_V4";
  const requestHash = input.kind === "manual" ? checkoutRequestHash(userId, input) : automaticOrderRequestHash(userId, input);
  const identity = { userId_checkoutKey: { userId, checkoutKey: input.checkoutKey } };
  const replaySelect = { id: true, number: true, checkoutRequestHash: true, paymentIntegration: true } as const;
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const number = `ROSH-${date}-${randomBytes(6).toString("hex").toUpperCase()}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.order.findUnique({ where: identity, select: replaySelect });
        if (existing) return replayOrder(existing, requestHash, integration);
        if (!verifyCheckoutKey(input.checkoutKey, userId, input.checkoutQuote)) throw new OrderReservationError("INVALID_CONFIRMATION");
        const snapshot = await loadCheckoutSnapshot(tx, userId, input.addressId);
        if (!verifyCheckoutQuote(input.checkoutQuote, { ...snapshot, userId })) {
          throw new OrderReservationError("QUOTE_CHANGED");
        }
        const { address, cart, amounts } = snapshot;
        if (input.kind === "manual") {
          const settings = resolveCommerceSettings(await tx.commerceSettings.findUnique({ where: { id: COMMERCE_SETTINGS_ID } }));
          const ready = input.provider === "YAPE_MANUAL" ? settings.yape.ready : settings.transfer.ready;
          if (!ready) throw new OrderReservationError("PROVIDER_UNAVAILABLE");
        } else {
          readMicuentawebSandboxConfig(environment);
        }
        assertOrderAmountFits(amounts.total);

        const pending = await tx.order.count({ where: { userId, status: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_REVIEW] } } });
        if (pending >= 3) throw new OrderReservationError("PENDING_LIMIT");

        const stockAfter = await reserveStock(tx, cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })));
        const reservedAt = new Date();
        const order = await tx.order.create({
          data: {
            checkoutKey: input.checkoutKey, checkoutRequestHash: requestHash, paymentIntegration: integration,
            number, userId, addressId: address.id, status: OrderStatus.PENDING_PAYMENT,
            stockReservedAt: reservedAt, reservationExpiresAt: input.kind === "manual" ? getReservationExpiresAt(reservedAt) : getReservationExpiresAt(reservedAt, 15),
            subtotal: amounts.subtotal, shippingAmount: amounts.shippingAmount, total: amounts.total,
            receiptType: input.receiptType, documentNumber: input.documentNumber,
            businessName: input.businessName, taxAddress: input.taxAddress,
            shippingRecipient: address.recipient, shippingPhone: address.phone,
            shippingDepartment: address.department, shippingProvince: address.province,
            shippingDistrict: address.district, shippingAddress: address.addressLine1,
            shippingReference: address.reference, customerNotes: input.customerNotes,
            items: {
              create: cart.items.map((item, index) => ({
                productId: item.product.id, productName: item.product.name, productSku: item.product.sku,
                unitPrice: amounts.lines[index].unitPrice, quantity: item.quantity,
                subtotal: amounts.lines[index].subtotal,
              })),
            },
            payments: input.kind === "manual" ? { create: {
              provider: input.provider, status: PaymentStatus.PENDING,
              amount: amounts.total, currency: "PEN",
            } } : undefined,
            events: input.kind === "micuentaweb-test" ? { create: {
              kind: "AUTOMATIC_SANDBOX_RESERVED", actorUserId: userId,
              note: "Reserva de pruebas Mi Cuenta Web; inicio y confirmación de pago pendientes.",
            } } : undefined,
          },
          select: { id: true, number: true },
        });
        await tx.inventoryMovement.createMany({
          data: cart.items.map((item) => ({
            productId: item.product.id, orderId: order.id, actorUserId: userId,
            type: InventoryMovementType.ORDER_RESERVATION, quantity: -item.quantity,
            stockAfter: stockAfter.get(item.product.id) ?? 0,
            note: `Reserva por pedido ${order.number}`,
          })),
        });
        await tx.cartItem.deleteMany({ where: { cartId: cart.id, id: { in: cart.items.map((item) => item.id) } } });
        await tx.cart.update({ where: { id: cart.id }, data: { revision: { increment: 1 } } });
        return { ...order, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002" && String(error.meta?.target).includes("checkoutKey")) {
          const winner = await prisma.order.findUnique({ where: identity, select: replaySelect });
          if (winner) return replayOrder(winner, requestHash, integration);
          if (attempt < 2) continue;
          throw new OrderReservationError("BUSY");
        }
        if (error.code === "P2034") {
          if (attempt < 2) continue;
          throw new OrderReservationError("BUSY");
        }
      }
      throw error;
    }
  }
  throw new OrderReservationError("BUSY");
}
