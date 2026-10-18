import { InventoryMovementType, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { checkoutRequestHash, verifyCheckoutKey } from "@/modules/checkout/idempotency";
import { manualOrderSchema, type ManualOrderInput } from "@/modules/orders/manual-order-input";
import { resolveCommerceSettings, COMMERCE_SETTINGS_ID } from "@/modules/settings/queries";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { assertOrderAmountFits } from "@/modules/checkout/pricing";
import { verifyCheckoutQuote } from "@/modules/checkout/quote";
import { loadCheckoutSnapshot } from "@/modules/checkout/snapshot";
import { reserveStock } from "@/modules/inventory/stock-service";
import { getReservationExpiresAt } from "@/modules/orders/hold";

export class ManualOrderError extends Error {
  constructor(public code: "QUOTE_CHANGED" | "PENDING_LIMIT" | "BUSY" | "INVALID_CONFIRMATION" | "PROVIDER_UNAVAILABLE") {
    super(code);
  }
}

export type { ManualOrderInput } from "@/modules/orders/manual-order-input";

export class CheckoutConflictError extends Error {
  constructor(public orderNumber: string) { super("CHECKOUT_CONFLICT"); }
}

function replayOrder(order: { id: string; number: string; checkoutRequestHash: string | null }, requestHash: string) {
  if (order.checkoutRequestHash !== requestHash) throw new CheckoutConflictError(order.number);
  return { id: order.id, number: order.number, replayed: true };
}

export async function reserveManualOrder(userId: string, submitted: ManualOrderInput) {
  const parsed = manualOrderSchema.safeParse(submitted);
  if (!parsed.success) throw new ManualOrderError("INVALID_CONFIRMATION");
  const input = parsed.data;
  const requestHash = checkoutRequestHash(userId, input);
  const identity = { userId_checkoutKey: { userId, checkoutKey: input.checkoutKey } };
  const replaySelect = { id: true, number: true, checkoutRequestHash: true } as const;
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const number = `ROSH-${date}-${randomBytes(6).toString("hex").toUpperCase()}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.order.findUnique({ where: identity, select: replaySelect });
        if (existing) return replayOrder(existing, requestHash);
        if (!verifyCheckoutKey(input.checkoutKey, userId, input.checkoutQuote)) throw new ManualOrderError("INVALID_CONFIRMATION");
        const snapshot = await loadCheckoutSnapshot(tx, userId, input.addressId);
        if (!verifyCheckoutQuote(input.checkoutQuote, { ...snapshot, userId })) {
          throw new ManualOrderError("QUOTE_CHANGED");
        }
        const { address, cart, amounts } = snapshot;
        const settings = resolveCommerceSettings(await tx.commerceSettings.findUnique({ where: { id: COMMERCE_SETTINGS_ID } }));
        const ready = input.provider === "YAPE_MANUAL" ? settings.yape.ready : settings.transfer.ready;
        if (!ready) throw new ManualOrderError("PROVIDER_UNAVAILABLE");
        assertOrderAmountFits(amounts.total);

        const pending = await tx.order.count({ where: { userId, status: { in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAYMENT_REVIEW] } } });
        if (pending >= 3) throw new ManualOrderError("PENDING_LIMIT");

        const stockAfter = await reserveStock(tx, cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })));
        const reservedAt = new Date();
        const order = await tx.order.create({
          data: {
            checkoutKey: input.checkoutKey, checkoutRequestHash: requestHash,
            number, userId, addressId: address.id, status: OrderStatus.PENDING_PAYMENT,
            stockReservedAt: reservedAt, reservationExpiresAt: getReservationExpiresAt(reservedAt),
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
            payments: { create: {
              provider: input.provider, status: PaymentStatus.PENDING,
              amount: amounts.total, currency: "PEN",
            } },
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
        return { ...order, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002" && String(error.meta?.target).includes("checkoutKey")) {
          const winner = await prisma.order.findUnique({ where: identity, select: replaySelect });
          if (winner) return replayOrder(winner, requestHash);
          if (attempt < 2) continue;
          throw new ManualOrderError("BUSY");
        }
        if (error.code === "P2034") {
          if (attempt < 2) continue;
          throw new ManualOrderError("BUSY");
        }
      }
      throw error;
    }
  }
  throw new ManualOrderError("BUSY");
}
