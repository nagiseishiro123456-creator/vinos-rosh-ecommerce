import { formatPrice } from "@/lib/money";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelPendingOrder } from "@/modules/orders/actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ number: string }>;
  searchParams: Promise<{
    created?: string;
    review?: string;
    cancel?: string;
    payment?: string;
  }>;
};


function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: "Pendiente de pago",
    PAYMENT_REVIEW: "Pago en revisión",
    PAID: "Pago confirmado",
    PREPARING: "En preparación",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    REFUNDED: "Reembolsado",
  };
  return labels[status] ?? status;
}

export default async function OrderPage({ params, searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const route = await params;
  const query = await searchParams;

  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(`/pedidos/${route.number}`)}`);
  }

  const order = await prisma.order.findFirst({
    where: {
      number: route.number,
      ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }),
    },
    select: {
      number: true,
      userId: true,
      status: true,
      stockReservedAt: true,
      stockReleasedAt: true,
      reservationExpiresAt: true,
      reservationExpiredAt: true,
      subtotal: true,
      shippingAmount: true,
      total: true,
      receiptType: true,
      createdAt: true,
      refundedAt: true,
      shippingRecipient: true,
      shippingPhone: true,
      shippingDistrict: true,
      shippingProvince: true,
      shippingAddress: true,
      shippingReference: true,
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
          review: {
            select: {
              rating: true,
              status: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          provider: true,
          status: true,
          operationCode: true,
          refundReference: true,
          refundedAt: true,
          reportedAt: true,
        },
      },
    },
  });

  if (!order) notFound();

  const payment = order.payments[0];
  const canCustomerCancel =
    session.user.role === "CUSTOMER" &&
    order.userId === session.user.id && order.status === "PENDING_PAYMENT" &&
    Boolean(order.stockReservedAt && !order.stockReleasedAt);
  const canContinuePayment = order.userId === session.user.id && order.status === "PENDING_PAYMENT";

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <section className="orderStatusShell shell">
        {query.created ? (
          <div className="orderCreatedBanner">
            <strong>Pedido recibido.</strong>
            <span>Consulta el estado y las instrucciones de tu pedido.</span>
          </div>
        ) : null}

        {query.payment === "sent" || query.payment === "already-sent" ? (
          <div className="orderCreatedBanner" role="status"><strong>Operación enviada a revisión.</strong><span>No pagues otra vez. La tienda verificará el abono y conservará la reserva mientras lo revisa.</span></div>
        ) : null}

        {order.reservationExpiredAt || query.payment === "expired" ? (
          <div className="checkoutWarningPanel" role="status"><strong>La reserva venció.</strong><p>Las unidades se liberaron. Si ya pagaste, contacta a la tienda para conciliar el abono y no pagues de nuevo.</p></div>
        ) : null}

        {query.payment === "unavailable" ? (
          <div className="checkoutWarningPanel" role="alert">El pedido cambió de estado. Revisa su estado actual; si ya pagaste, contacta a la tienda y no pagues otra vez.</div>
        ) : null}

        {query.cancel === "cancelled" ? (
          <div className="orderCancelledBanner">
            <strong>Pedido cancelado.</strong>
            <span>La reserva de stock fue liberada y el pago pendiente dejó de estar en revisión.</span>
          </div>
        ) : null}

        {query.cancel === "unavailable" ? (
          <div className="checkoutWarningPanel">
            El pedido cambió de estado y ya no puede cancelarse desde esta pantalla.
          </div>
        ) : null}

        {order.status === "REFUNDED" ? (
          <div className="orderCancelledBanner">
            <strong>Pedido reembolsado.</strong>
            <span>
              El negocio registró la devolución del dinero
              {order.refundedAt ? ` el ${order.refundedAt.toLocaleString("es-PE")}` : ""}.
            </span>
          </div>
        ) : null}

        {query.review === "sent" ? (
          <div className="orderCreatedBanner">
            <strong>Gracias por tu reseña.</strong>
            <span>La opinión quedó registrada y pasará por moderación antes de publicarse.</span>
          </div>
        ) : null}

        {query.review === "exists" ? (
          <div className="checkoutWarningPanel">Este producto ya tiene una reseña asociada a esta compra.</div>
        ) : null}

        <div className="orderStatusHeader">
          <div>
            <p className="eyebrow wine">PEDIDO {order.number}</p>
            <h1>{statusLabel(order.status)}</h1>
            <p>Creado el {order.createdAt.toLocaleString("es-PE", { timeZone: "America/Lima" })} (hora de Perú)</p>
            {order.status === "PENDING_PAYMENT" && order.reservationExpiresAt ? <p>Reserva hasta el {order.reservationExpiresAt.toLocaleString("es-PE", { timeZone: "America/Lima" })} (hora de Perú)</p> : null}
          </div>
          <span className={`orderStatusPill status-${order.status.toLowerCase()}`}>{statusLabel(order.status)}</span>
        </div>

        <div className="orderStatusGrid">
          <section className="adminCard">
            <p className="eyebrow wine">PRODUCTOS</p>
            <div className="orderReviewItems orderItemsWithReviews">
              {order.items.map((item) => (
                <div key={item.id}>
                  <span>
                    {item.quantity} × {item.productName}
                    {order.status === "DELIVERED" ? (
                      item.review ? (
                        <small>Reseña: {item.review.rating} ★ · {item.review.status}</small>
                      ) : (
                        <Link className="textLink" href={`/resenas/${item.id}`}>Escribir reseña verificada →</Link>
                      )
                    ) : null}
                  </span>
                  <strong>{formatPrice(item.subtotal.toFixed(2))}</strong>
                </div>
              ))}
            </div>
            <div className="summaryRow"><span>Subtotal</span><strong>{formatPrice(order.subtotal.toFixed(2))}</strong></div>
            <div className="summaryRow"><span>Envío</span><strong>{formatPrice(order.shippingAmount.toFixed(2))}</strong></div>
            <div className="summaryTotal"><span>Total</span><strong>{formatPrice(order.total.toFixed(2))}</strong></div>
          </section>

          <section className="adminCard">
            <p className="eyebrow wine">ENTREGA</p>
            <h2>{order.shippingRecipient}</h2>
            <p>{order.shippingAddress}</p>
            <p>{order.shippingDistrict}, {order.shippingProvince}</p>
            <p>{order.shippingPhone}</p>
            {order.shippingReference ? <p>Referencia: {order.shippingReference}</p> : null}
          </section>

          <section className="adminCard">
            <p className="eyebrow wine">PAGO</p>
            <h2>{payment?.provider === "YAPE_MANUAL" ? "Yape" : payment?.provider === "TRANSFER_MANUAL" ? "Transferencia" : "Pago"}</h2>
            <p>Estado: <strong>{({ PENDING: "Pendiente de pago", UNDER_REVIEW: "En revisión", PAID: "Confirmado", FAILED: "Fallido", REJECTED: "Rechazado", CANCELLED: "Cancelado", REFUNDED: "Reembolsado" } as Record<string, string>)[payment?.status ?? ""] ?? "Sin pago"}</strong></p>
            {payment?.operationCode ? <p>Operación: <strong>{payment.operationCode}</strong></p> : null}
            {payment?.reportedAt ? <p>Comunicado el {payment.reportedAt.toLocaleString("es-PE", { timeZone: "America/Lima" })} (hora de Perú)</p> : null}
            {payment?.refundReference ? <p>Referencia de reembolso: <strong>{payment.refundReference}</strong></p> : null}
            {payment?.refundedAt ? <p>Reembolsado: <strong>{payment.refundedAt.toLocaleString("es-PE")}</strong></p> : null}
            <p>Comprobante solicitado: <strong>{order.receiptType === "BOLETA" ? "Boleta" : "Factura"}</strong></p>
          </section>
        </div>

        {canCustomerCancel ? (
          <section className="orderCancellationPanel">
            <div>
              <strong>¿Necesitas cancelar?</strong>
              <span>
                Cancela únicamente si todavía no pagaste. Si ya realizaste el pago, comunica la operación o contacta a la tienda para conciliar el abono.
              </span>
            </div>
            <form action={cancelPendingOrder.bind(null, order.number)}>
              <button className="button buttonDanger" type="submit">Cancelar pedido</button>
            </form>
          </section>
        ) : null}

        {order.status === "PAYMENT_REVIEW" ? <div className="checkoutWarningPanel">El pago está en revisión y la reserva se mantiene. Para cancelar o conciliar el pago, contacta a la tienda.</div> : null}

        <div className="orderStatusActions">
          {canContinuePayment ? <Link className="button buttonPrimary" href={`/pedidos/${order.number}/pagar`}>Continuar al pago del pedido</Link> : null}
          <Link className="button buttonDark" href="/productos">Seguir comprando</Link>
          <Link className="button" href="/mi-cuenta">Ir a mi cuenta</Link>
        </div>
      </section>
    </main>
  );
}
