import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { advanceOrderStatus } from "@/modules/admin/orders/actions";

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

const nextActionLabels: Partial<Record<string, string>> = {
  PAID: "Comenzar preparación",
  PREPARING: "Marcar como enviado",
  SHIPPED: "Marcar como entregado",
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  await requireAdmin(`/admin/pedidos/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
      subtotal: true,
      shippingAmount: true,
      total: true,
      receiptType: true,
      documentNumber: true,
      businessName: true,
      taxAddress: true,
      customerNotes: true,
      shippingRecipient: true,
      shippingPhone: true,
      shippingDepartment: true,
      shippingProvince: true,
      shippingDistrict: true,
      shippingAddress: true,
      shippingReference: true,
      createdAt: true,
      paidAt: true,
      shippedAt: true,
      deliveredAt: true,
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productName: true,
          productSku: true,
          unitPrice: true,
          quantity: true,
          subtotal: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          status: true,
          operationCode: true,
          amount: true,
          reviewedAt: true,
          paidAt: true,
        },
      },
    },
  });

  if (!order) notFound();

  const advanceAction = advanceOrderStatus.bind(null, order.id);
  const nextLabel = nextActionLabels[order.status];

  return (
    <main className="shell adminPage adminOrderDetailPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">PEDIDO</p>
          <h1>{order.number}</h1>
          <p className="adminIntro">Creado {formatDate(order.createdAt)}</p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin/pedidos">Volver a pedidos</Link>
          <Link className="button buttonDark" href={`/pedidos/${order.number}`}>Vista cliente</Link>
        </div>
      </div>

      <div className="adminOrderStatusBar">
        <span className={`adminBadge status-${order.status.toLowerCase()}`}>{statusLabels[order.status] ?? order.status}</span>
        {nextLabel ? (
          <form action={advanceAction}>
            <button className="button buttonPrimary" type="submit">{nextLabel}</button>
          </form>
        ) : null}
      </div>

      <section className="adminOrderGrid">
        <article className="adminPanel">
          <p className="eyebrow wine">PRODUCTOS</p>
          <div className="adminOrderItems">
            {order.items.map((item) => (
              <div key={item.id}>
                <span>
                  <strong>{item.productName}</strong>
                  <small>{item.productSku || "Sin SKU"} · {item.quantity} unidad(es)</small>
                </span>
                <span>
                  <small>{formatPrice(Number(item.unitPrice))} c/u</small>
                  <strong>{formatPrice(Number(item.subtotal))}</strong>
                </span>
              </div>
            ))}
          </div>
          <div className="adminOrderTotals">
            <div><span>Subtotal</span><strong>{formatPrice(Number(order.subtotal))}</strong></div>
            <div><span>Envío</span><strong>{formatPrice(Number(order.shippingAmount))}</strong></div>
            <div className="total"><span>Total</span><strong>{formatPrice(Number(order.total))}</strong></div>
          </div>
        </article>

        <article className="adminPanel">
          <p className="eyebrow wine">ENTREGA</p>
          <div className="adminOrderInfoList">
            <strong>{order.shippingRecipient}</strong>
            <span>{order.shippingPhone}</span>
            <span>{order.shippingAddress}</span>
            {order.shippingReference ? <span>Ref.: {order.shippingReference}</span> : null}
            <span>{order.shippingDistrict}, {order.shippingProvince}, {order.shippingDepartment}</span>
          </div>
        </article>

        <article className="adminPanel">
          <p className="eyebrow wine">CLIENTE</p>
          <div className="adminOrderInfoList">
            <strong>{order.user.firstName} {order.user.lastName}</strong>
            <span>{order.user.email}</span>
            {order.user.phone ? <span>{order.user.phone}</span> : null}
          </div>
        </article>

        <article className="adminPanel">
          <p className="eyebrow wine">COMPROBANTE</p>
          <div className="adminOrderInfoList">
            <strong>{order.receiptType}</strong>
            {order.documentNumber ? <span>Documento: {order.documentNumber}</span> : null}
            {order.businessName ? <span>{order.businessName}</span> : null}
            {order.taxAddress ? <span>{order.taxAddress}</span> : null}
          </div>
        </article>

        <article className="adminPanel adminOrderPayments">
          <p className="eyebrow wine">PAGOS</p>
          {order.payments.length === 0 ? <p>Sin pagos registrados.</p> : order.payments.map((payment) => (
            <div className="adminPaymentLine" key={payment.id}>
              <span>
                <strong>{payment.provider}</strong>
                <small>{payment.operationCode ? `Operación: ${payment.operationCode}` : "Sin código de operación"}</small>
              </span>
              <span>
                <strong>{formatPrice(Number(payment.amount))}</strong>
                <small>{payment.status}</small>
              </span>
            </div>
          ))}
          {order.status === "PAYMENT_REVIEW" ? (
            <Link className="adminTextButton" href="/admin/pagos">Revisar pago →</Link>
          ) : null}
        </article>

        <article className="adminPanel">
          <p className="eyebrow wine">TRAZABILIDAD</p>
          <div className="adminOrderTimeline">
            <span><strong>Creado</strong><small>{formatDate(order.createdAt)}</small></span>
            <span><strong>Pagado</strong><small>{formatDate(order.paidAt)}</small></span>
            <span><strong>Enviado</strong><small>{formatDate(order.shippedAt)}</small></span>
            <span><strong>Entregado</strong><small>{formatDate(order.deliveredAt)}</small></span>
          </div>
          {order.customerNotes ? <p className="adminOrderNote">Nota del cliente: {order.customerNotes}</p> : null}
        </article>
      </section>
    </main>
  );
}
