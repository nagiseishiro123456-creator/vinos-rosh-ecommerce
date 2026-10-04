import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAYMENT_REVIEW: "Pago por revisar",
  PAID: "Pagado",
  PREPARING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requireAdmin("/admin/pedidos");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      createdAt: true,
      shippingDistrict: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, provider: true },
      },
    },
  });

  const pending = orders.filter((order) => ["PAYMENT_REVIEW", "PAID", "PREPARING"].includes(order.status)).length;
  const shipped = orders.filter((order) => order.status === "SHIPPED").length;
  const delivered = orders.filter((order) => order.status === "DELIVERED").length;

  return (
    <main className="shell adminPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">OPERACIONES</p>
          <h1>Pedidos</h1>
          <p className="adminIntro">Controla preparación, despacho y entrega desde un solo lugar.</p>
        </div>
        <Link className="button buttonGhostLight" href="/admin">Panel</Link>
      </div>

      <section className="adminStatsGrid">
        <article><span>En proceso</span><strong>{pending}</strong></article>
        <article><span>Enviados</span><strong>{shipped}</strong></article>
        <article><span>Entregados</span><strong>{delivered}</strong></article>
      </section>

      {orders.length === 0 ? (
        <section className="adminEmptyState">
          <strong>Aún no existen pedidos.</strong>
          <p>Los pedidos aparecerán aquí cuando los clientes completen el checkout.</p>
        </section>
      ) : (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Distrito</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Pago</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const payment = order.payments[0];
                return (
                  <tr key={order.id}>
                    <td><strong>{order.number}</strong></td>
                    <td>
                      <strong>{order.user.firstName} {order.user.lastName}</strong>
                      <small>{order.user.email}</small>
                    </td>
                    <td>{order.shippingDistrict}</td>
                    <td>{formatPrice(Number(order.total))}</td>
                    <td><span className={`adminBadge status-${order.status.toLowerCase()}`}>{statusLabels[order.status] ?? order.status}</span></td>
                    <td>
                      {payment ? (
                        <>
                          <span>{payment.status}</span>
                          <small>{payment.provider}</small>
                        </>
                      ) : "—"}
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td><Link className="adminTextButton" href={`/admin/pedidos/${order.id}`}>Ver</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
