import { formatPrice } from "@/lib/money";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { advanceOrderStatus, registerManualRefund, openReconciliation, closeReconciliation } from "@/modules/admin/orders/actions";
import { operationMessages } from "@/modules/admin/operation-feedback";

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


function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(value);
}

type AdminOrderDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string }>;
};

export default async function AdminOrderDetailPage({ params, searchParams }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const { result } = await searchParams;
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
      refundedAt: true,
      events: { orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { firstName: true, lastName: true } } } },
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
          refundedAt: true,
          refundReference: true,
          currency: true,
          reconciliation: true,
        },
      },
    },
  });

  if (!order) notFound();

  const advanceAction = advanceOrderStatus.bind(null, order.id, order.status);
  const nextLabel = nextActionLabels[order.status];
  const refundAction = registerManualRefund.bind(null, order.id);
  const canRefund = order.status === "PAID" || order.status === "PREPARING";

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

      {result && Object.hasOwn(operationMessages, result) ? <p role="status" className="adminCard">{operationMessages[result]}</p> : null}

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
                  <small>{formatPrice(item.unitPrice.toFixed(2))} c/u</small>
                  <strong>{formatPrice(item.subtotal.toFixed(2))}</strong>
                </span>
              </div>
            ))}
          </div>
          <div className="adminOrderTotals">
            <div><span>Subtotal</span><strong>{formatPrice(order.subtotal.toFixed(2))}</strong></div>
            <div><span>Envío</span><strong>{formatPrice(order.shippingAmount.toFixed(2))}</strong></div>
            <div className="total"><span>Total</span><strong>{formatPrice(order.total.toFixed(2))}</strong></div>
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
                <strong>{formatPrice(payment.amount.toFixed(2))}</strong>
                <small>{payment.status}</small>
                {payment.refundReference ? <small>Reembolso: {payment.refundReference}</small> : null}
              </span>
            </div>
          ))}
          {order.status === "PAYMENT_REVIEW" ? (
            <Link className="adminTextButton" href="/admin/pagos">Revisar pago →</Link>
          ) : null}
        </article>

        <article className="adminPanel">
          <p className="eyebrow wine">TRAZABILIDAD</p>
          <p>Fechas en hora de Perú. El historial incluye los eventos registrados a partir de esta actualización.</p>
          <div className="adminOrderTimeline">
            <span><strong>Creado</strong><small>{formatDate(order.createdAt)}</small></span>
            <span><strong>Pagado</strong><small>{formatDate(order.paidAt)}</small></span>
            <span><strong>Enviado</strong><small>{formatDate(order.shippedAt)}</small></span>
            <span><strong>Entregado</strong><small>{formatDate(order.deliveredAt)}</small></span>
            <span><strong>Reembolsado</strong><small>{formatDate(order.refundedAt)}</small></span>
          </div>
          {order.customerNotes ? <p className="adminOrderNote">Nota del cliente: {order.customerNotes}</p> : null}
          <ol className="adminEventList">
            {order.events.map((event) => <li key={event.id}>
              <strong>{({ PAYMENT_APPROVED: "Pago aprobado", PAYMENT_REJECTED: "Pago rechazado", PAYMENT_REFUNDED: "Reembolso registrado", ORDER_ADVANCED: "Estado actualizado", RECONCILIATION_OPENED: "Conciliación abierta", RECONCILIATION_REFUNDED: "Conciliación resuelta", RESERVATION_EXPIRED: "Reserva vencida", RESERVATION_CANCELLED: "Reserva cancelada", PAYMENT_REPORTED: "Pago comunicado" } as Record<string, string>)[event.kind] ?? event.kind}</strong>
              <p>{event.note}</p><small>{formatDate(event.createdAt)} · {event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : "Sistema / cuenta retirada"}</small>
            </li>)}
          </ol>
        </article>
        {order.status === "CANCELLED" ? order.payments.filter((p) => ["YAPE_MANUAL", "TRANSFER_MANUAL"].includes(p.provider) && ["CANCELLED", "REJECTED"].includes(p.status)).map((payment) => (
          <article className="adminPanel" key={`reconciliation-${payment.id}`}>
            <p className="eyebrow wine">CONCILIACIÓN MANUAL</p>
            <h2>{payment.reconciliation ? (payment.reconciliation.refundedAt ? "Conciliación resuelta" : "Ingreso pendiente de devolución") : "Registrar ingreso después del cierre"}</h2>
            <p>El pedido permanece cancelado. Esta gestión no reserva ni devuelve stock. Verifica el ingreso y, si corresponde, devuelve el dinero fuera de la plataforma.</p>
            {payment.reconciliation ? <>
              <p>Importe recibido: <strong>{formatPrice(payment.reconciliation.receivedAmount.toFixed(2))}</strong> · Operación: {payment.operationCode}</p>
              {payment.reconciliation.refundedAt ? <p>Devuelto {formatDate(payment.reconciliation.refundedAt)} · Referencia: {payment.reconciliation.refundReference}</p> :
                <form action={closeReconciliation.bind(null, order.id, payment.id)} className="adminRefundForm">
                  <label>Referencia de devolución<input name="refundReference" minLength={3} maxLength={120} required /></label>
                  <label className="adminConfirmCheck"><input name="confirm" type="checkbox" value="yes" required />Confirmo que devolví íntegramente el importe recibido.</label>
                  <button className="button buttonDark" type="submit">Registrar devolución de conciliación</button>
                </form>}
            </> : <form action={openReconciliation.bind(null, order.id, payment.id)} className="adminRefundForm">
              <label>Código de operación recibido<input name="operationCode" defaultValue={payment.operationCode ?? ""} readOnly={!!payment.operationCode} minLength={4} maxLength={80} required /></label>
              <label>Importe realmente recibido en PEN<input name="receivedAmount" type="text" inputMode="decimal" placeholder="98.20" pattern="(?:0|[1-9][0-9]{0,7})\.[0-9]{2}" required /></label>
              <label>Motivo de conciliación<input name="reason" minLength={4} maxLength={500} required /></label>
              <label className="adminConfirmCheck"><input name="confirm" type="checkbox" value="yes" required />Verifiqué este ingreso en la cuenta real del negocio.</label>
              <button className="button buttonDark" type="submit">Abrir conciliación</button>
            </form>}
          </article>
        )) : null}
        {canRefund ? (
          <article className="adminPanel">
            <p className="eyebrow wine">REEMBOLSO MANUAL</p>
            <h2>Registrar dinero ya devuelto</h2>
            <p>
              Usa esta acción solo después de devolver el dinero al cliente mediante Yape o transferencia. El sistema marcará el pedido como reembolsado y repondrá el stock porque todavía no fue despachado.
            </p>
            <form action={refundAction} className="adminRefundForm">
              <label>
                Referencia del reembolso
                <input
                  name="refundReference"
                  type="text"
                  minLength={3}
                  maxLength={120}
                  required
                  placeholder="Ej. Yape 12345678"
                />
              </label>
              <label className="adminConfirmCheck">
                <input name="confirm" type="checkbox" value="yes" required />
                Confirmo que el dinero ya fue devuelto al cliente.
              </label>
              <button className="button adminRejectButton" type="submit">
                Registrar reembolso y reponer stock
              </button>
            </form>
          </article>
        ) : null}
      </section>
    </main>
  );
}
