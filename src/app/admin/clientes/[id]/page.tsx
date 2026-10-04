import { UserRole } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: "Pendiente de pago",
    PAYMENT_REVIEW: "Pago en revisión",
    PAID: "Pagado",
    PREPARING: "Preparando",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    REFUNDED: "Reembolsado",
  };
  return labels[status] ?? status;
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  await requireAdmin("/admin/clientes");
  const { id } = await params;

  const customer = await prisma.user.findFirst({
    where: { id, role: UserRole.CUSTOMER },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      addresses: {
        where: { active: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          label: true,
          recipient: true,
          phone: true,
          addressLine1: true,
          district: true,
          province: true,
          department: true,
          reference: true,
          isDefault: true,
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          createdAt: true,
          items: { select: { id: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          rating: true,
          status: true,
          createdAt: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  if (!customer) notFound();

  const totalOrdered = customer.orders
    .filter((order) => order.status !== "CANCELLED" && order.status !== "REFUNDED")
    .reduce((sum, order) => sum + Number(order.total), 0);

  return (
    <main className="shell adminPage adminCustomerDetailPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">FICHA DE CLIENTE</p>
          <h1>{customer.firstName} {customer.lastName}</h1>
          <p className="adminIntro">Información visible únicamente para el administrador.</p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin/clientes">← Clientes</Link>
          <Link className="button buttonGhostLight" href="/admin">Panel</Link>
        </div>
      </div>

      <section className="adminStatsGrid">
        <article><span>Pedidos recientes</span><strong>{customer.orders.length}</strong></article>
        <article><span>Total registrado</span><strong>{formatPrice(totalOrdered)}</strong></article>
        <article><span>Reseñas</span><strong>{customer.reviews.length}</strong></article>
      </section>

      <div className="adminOrderGrid">
        <section className="adminCard">
          <p className="eyebrow wine">CONTACTO</p>
          <h2>Datos de cuenta</h2>
          <div className="adminOrderInfoList">
            <span><strong>Correo:</strong> {customer.email}</span>
            <span><strong>Celular:</strong> {customer.phone ?? "No registrado"}</span>
            <span><strong>Registro:</strong> {customer.createdAt.toLocaleString("es-PE")}</span>
          </div>
        </section>

        <section className="adminCard">
          <p className="eyebrow wine">ENTREGA</p>
          <h2>Direcciones activas</h2>
          {customer.addresses.length === 0 ? (
            <p className="adminIntro">No tiene direcciones activas.</p>
          ) : (
            <div className="adminCustomerAddressList">
              {customer.addresses.map((address) => (
                <article key={address.id}>
                  <strong>{address.label || "Dirección"}{address.isDefault ? " · Principal" : ""}</strong>
                  <span>{address.recipient} · {address.phone}</span>
                  <span>{address.addressLine1}</span>
                  <span>{address.district}, {address.province}, {address.department}</span>
                  {address.reference ? <small>Referencia: {address.reference}</small> : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="adminCard adminCustomerWideCard">
          <div className="accountSectionHeading compact">
            <div>
              <p className="eyebrow wine">PEDIDOS</p>
              <h2>Actividad reciente</h2>
            </div>
          </div>

          {customer.orders.length === 0 ? (
            <p className="adminIntro">Este cliente todavía no realizó pedidos.</p>
          ) : (
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead>
                  <tr><th>Pedido</th><th>Fecha</th><th>Productos</th><th>Estado</th><th>Total</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  {customer.orders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.number}</strong></td>
                      <td>{order.createdAt.toLocaleDateString("es-PE")}</td>
                      <td>{order.items.length}</td>
                      <td><span className={`adminBadge status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span></td>
                      <td>{formatPrice(Number(order.total))}</td>
                      <td><Link className="adminTextButton" href={`/admin/pedidos/${order.id}`}>Ver pedido</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adminCard adminCustomerWideCard">
          <p className="eyebrow wine">RESEÑAS</p>
          <h2>Opiniones registradas</h2>
          {customer.reviews.length === 0 ? (
            <p className="adminIntro">Aún no publicó reseñas.</p>
          ) : (
            <div className="adminCustomerReviewList">
              {customer.reviews.map((review) => (
                <article key={review.id}>
                  <strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</strong>
                  <span>{review.product.name}</span>
                  <small>{review.status} · {review.createdAt.toLocaleDateString("es-PE")}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
