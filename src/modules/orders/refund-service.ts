import {
  InventoryMovementType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { releaseStock } from "@/modules/inventory/stock-service";

const REFUNDABLE_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.PAID,
  OrderStatus.PREPARING,
]);

const MANUAL_PROVIDERS = new Set<PaymentProvider>([
  PaymentProvider.YAPE_MANUAL,
  PaymentProvider.TRANSFER_MANUAL,
]);

export class OrderRefundError extends Error {
  constructor(message: "ORDER_NOT_REFUNDABLE" | "PAID_PAYMENT_NOT_FOUND") {
    super(message);
    this.name = "OrderRefundError";
  }
}

type RefundPaidOrderInput = {
  orderId: string;
  adminId: string;
  refundReference: string;
  now?: Date;
};

export async function refundPaidOrder({
  orderId,
  adminId,
  refundReference,
  now = new Date(),
}: RefundPaidOrderInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
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
        payments: {
          where: { status: PaymentStatus.PAID },
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });

    if (!order || !REFUNDABLE_ORDER_STATUSES.has(order.status)) {
      throw new OrderRefundError("ORDER_NOT_REFUNDABLE");
    }

    const manualPayments = order.payments.filter((payment) =>
      MANUAL_PROVIDERS.has(payment.provider),
    );

    if (manualPayments.length === 0) {
      throw new OrderRefundError("PAID_PAYMENT_NOT_FOUND");
    }

    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
      },
      data: {
        status: OrderStatus.REFUNDED,
        refundedAt: now,
      },
    });

    if (claimed.count !== 1) {
      throw new OrderRefundError("ORDER_NOT_REFUNDABLE");
    }

    await tx.payment.updateMany({
      where: {
        id: { in: manualPayments.map((payment) => payment.id) },
        status: PaymentStatus.PAID,
      },
      data: {
        status: PaymentStatus.REFUNDED,
        refundReference,
        refundedAt: now,
        reviewedById: adminId,
        reviewedAt: now,
        notes: "Reembolso manual registrado por el administrador.",
      },
    });

    const stockAfterByProduct = await releaseStock(tx, order.items);

    await tx.inventoryMovement.createMany({
      data: order.items.map((item) => ({
        productId: item.productId,
        orderId: order.id,
        actorUserId: adminId,
        type: InventoryMovementType.ORDER_RELEASE,
        quantity: item.quantity,
        stockAfter: stockAfterByProduct.get(item.productId) ?? 0,
        note: `Reposición por reembolso del pedido ${order.number}`,
      })),
    });

    return {
      orderNumber: order.number,
      refundedAt: now,
    };
  });
}
