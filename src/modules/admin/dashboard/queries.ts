import { OrderStatus, PaymentStatus, Prisma, ReviewStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addMoney } from "@/lib/money";
import { ROSH_PRODUCT_SKU } from "@/modules/products/single-product";
import { completeDashboardDays, dashboardWindow, type DashboardDay } from "./period";

export const ORDER_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago", PAYMENT_REVIEW: "Pago por revisar", PAID: "Pagado",
  PREPARING: "Preparando", SHIPPED: "Enviado", DELIVERED: "Entregado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado",
};

/** Called after requireAdmin. One database snapshot; never cached across requests. */
export async function readAdminDashboard(period: unknown, now = new Date()) {
  const window = dashboardWindow(period, now);
  const [daily, orders, customers, product, paymentReview, fulfillment, reviews, contacts, latest] = await prisma.$transaction([
    // Prisma DateTime uses timestamp without time zone and stores UTC values.
    prisma.$queryRaw<DashboardDay[]>`SELECT to_char("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS "day", COUNT(*)::int AS "orders", SUM("total")::text AS "sales"
      FROM "Order" WHERE "status" IN ('PAID', 'PREPARING', 'SHIPPED', 'DELIVERED') AND "paidAt" >= ${window.start} AND "paidAt" < ${window.end}
      GROUP BY 1 ORDER BY 1`,
    prisma.order.count({ where: { createdAt: { gte: window.start, lt: window.end } } }),
    prisma.user.count({ where: { role: UserRole.CUSTOMER, createdAt: { gte: window.start, lt: window.end } } }),
    prisma.product.findUnique({ where: { sku: ROSH_PRODUCT_SKU }, select: { id: true, name: true, active: true, stock: true, price: true } }),
    prisma.payment.count({ where: { status: PaymentStatus.UNDER_REVIEW } }),
    prisma.order.count({ where: { status: { in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.SHIPPED] } } }),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.order.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 6, select: { id: true, number: true, status: true, total: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const series = completeDashboardDays(window.dates, daily);
  return {
    period: window.days, start: window.start, end: window.end, series,
    sales: addMoney(...series.map(day => day.sales)), confirmedOrders: series.reduce((sum, day) => sum + day.orders, 0),
    orders, customers, product: product ? { ...product, price: product.price.toFixed(2) } : null,
    pending: { paymentReview, fulfillment, reviews, contacts },
    latest: latest.map(order => ({ ...order, total: order.total.toFixed(2) })),
  };
}
