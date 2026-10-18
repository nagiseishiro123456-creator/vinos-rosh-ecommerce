import {
  InventoryMovementType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { releaseStock } from "@/modules/inventory/stock-service";
import { AdminOperationError, assertTransactionAdmin } from "@/modules/admin/transaction-auth";
import { refundReferenceSchema } from "@/modules/payments/reconciliation-service";

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
  refundReference = refundReference.trim();
  return prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    if (!refundReferenceSchema.safeParse(refundReference).success) throw new AdminOperationError("INVALID_INPUT");
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        stockReservedAt: true,
        stockReleasedAt: true,
        _count: { select: { payments: true } },
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
            currency: true,
            amount: true,
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
    if (order._count.payments !== 1 || manualPayments.length !== 1 || !order.stockReservedAt || order.stockReleasedAt ||
      manualPayments[0].currency !== "PEN" || !manualPayments[0].amount.equals(order.total)) throw new AdminOperationError("INCONSISTENT");

    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        status: order.status,
        stockReservedAt: { not: null },
        stockReleasedAt: null,
      },
      data: {
        status: OrderStatus.REFUNDED,
        refundedAt: now,
        stockReleasedAt: now,
      },
    });

    if (claimed.count !== 1) {
      throw new OrderRefundError("ORDER_NOT_REFUNDABLE");
    }

    const paymentClaim = await tx.payment.updateMany({
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
    if (paymentClaim.count !== 1) throw new AdminOperationError("STATE_CHANGED");

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
    await tx.orderEvent.create({ data: { orderId: order.id, actorUserId: adminId,
      kind: "PAYMENT_REFUNDED", note: `Devolución externa íntegra PEN ${order.total.toFixed(2)}; referencia ${refundReference.trim()}.`, createdAt: now,
    } });

    return {
      orderNumber: order.number,
      refundedAt: now,
    };
  });
}
