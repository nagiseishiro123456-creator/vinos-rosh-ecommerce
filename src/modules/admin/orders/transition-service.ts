import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AdminOperationError, assertTransactionAdmin } from "@/modules/admin/transaction-auth";

const next: Partial<Record<OrderStatus, OrderStatus>> = { PAID: "PREPARING", PREPARING: "SHIPPED", SHIPPED: "DELIVERED" };

export async function advanceOrder(adminId: string, orderId: string, expected: OrderStatus) {
  if (!next[expected]) throw new AdminOperationError("INVALID_INPUT");
  return prisma.$transaction(async (tx) => {
    await assertTransactionAdmin(tx, adminId);
    const now = new Date();
    const updated = await tx.order.updateMany({ where: { id: orderId, status: expected,
      stockReservedAt: { not: null }, stockReleasedAt: null,
      payments: { some: { status: "PAID" } },
    }, data: { status: next[expected], ...(expected === "PREPARING" ? { shippedAt: now } : {}),
      ...(expected === "SHIPPED" ? { deliveredAt: now } : {}),
    } });
    if (updated.count !== 1) return { changed: false };
    await tx.orderEvent.create({ data: { orderId, actorUserId: adminId, kind: "ORDER_ADVANCED",
      note: `${expected} → ${next[expected]}`, createdAt: now,
    } });
    return { changed: true };
  });
}
