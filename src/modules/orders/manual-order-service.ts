import { InventoryMovementType, OrderStatus, PaymentProvider, PaymentStatus, Prisma, ReceiptType } from "@prisma/client";
import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { assertOrderAmountFits } from "@/modules/checkout/pricing";
import { verifyCheckoutQuote } from "@/modules/checkout/quote";
import { loadCheckoutSnapshot } from "@/modules/checkout/snapshot";
import { reserveStock } from "@/modules/inventory/stock-service";

export class ManualOrderError extends Error {
  constructor(public code: "QUOTE_CHANGED" | "PENDING_LIMIT" | "DUPLICATE_OPERATION" | "BUSY") {
    super(code);
  }
}

export type ManualOrderInput = {
  addressId: string;
  checkoutQuote: string;
  provider: typeof PaymentProvider.YAPE_MANUAL | typeof PaymentProvider.TRANSFER_MANUAL;
  receiptType: ReceiptType;
  operationCode: string;
  documentNumber?: string;
  businessName?: string;
  taxAddress?: string;
  customerNotes?: string;
};

export async function createManualOrder(userId: string, input: ManualOrderInput) {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const number = `ROSH-${date}-${randomBytes(6).toString("hex").toUpperCase()}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const snapshot = await loadCheckoutSnapshot(tx, userId, input.addressId);
        if (!verifyCheckoutQuote(input.checkoutQuote, { ...snapshot, userId })) {
          throw new ManualOrderError("QUOTE_CHANGED");
        }
        const { address, cart, amounts } = snapshot;
        assertOrderAmountFits(amounts.total);

        const pending = await tx.order.count({ where: { userId, status: OrderStatus.PAYMENT_REVIEW } });
        if (pending >= 3) throw new ManualOrderError("PENDING_LIMIT");
        const duplicate = await tx.payment.findUnique({
          where: { provider_operationCode: { provider: input.provider, operationCode: input.operationCode } },
          select: { id: true },
        });
        if (duplicate) throw new ManualOrderError("DUPLICATE_OPERATION");

        const stockAfter = await reserveStock(tx, cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })));
        const order = await tx.order.create({
          data: {
            number, userId, addressId: address.id, status: OrderStatus.PAYMENT_REVIEW,
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
              provider: input.provider, status: PaymentStatus.UNDER_REVIEW,
              amount: amounts.total, currency: "PEN", operationCode: input.operationCode,
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
        return order;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034") {
          if (attempt < 2) continue;
          throw new ManualOrderError("BUSY");
        }
        if (error.code === "P2002" && String(error.meta?.target).includes("operationCode")) {
          throw new ManualOrderError("DUPLICATE_OPERATION");
        }
      }
      throw error;
    }
  }
  throw new ManualOrderError("BUSY");
}
