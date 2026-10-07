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
  }>;
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
      status: true,
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
        },
      },
    },
  });

  if (!order) notFound();

  const payment = order.payments[0];
  const canCustomerCancel =
    session.user.role === "CUSTOMER" &&
    (order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_REVIEW");

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <section className="orderStatusShell shell">
        {query.created ? (
          <div className="orderCreatedBanner">
            <strong>Pedido recibido.</strong>
            <span>Reservamos el stock y enviamos el pago a revisión.</span>
          </div>
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
            <p>Creado el {order.createdAt.toLocaleString("es-PE")}</p>
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
                  <strong>{formatPrice(Number(item.subtotal))}</strong>
                </div>
              ))}
            </div>
            <div className="summaryRow"><span>Subtotal</span><strong>{formatPrice(Number(order.subtotal))}</strong></div>
            <div className="summaryRow"><span>Envío</span><strong>{formatPrice(Number(order.shippingAmount))}</strong></div>
            <div className="summaryTotal"><span>Total</span><strong>{formatPrice(Number(order.total))}</strong></div>
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
            <p>Estado: <strong>{payment?.status ?? "Sin pago"}</strong></p>
            {payment?.operationCode ? <p>Operación: <strong>{payment.operationCode}</strong></p> : null}
            {payment?.refundReference ? <p>Referencia de reembolso: <strong>{payment.refundReference}</strong></p> : null}
            {payment?.refundedAt ? <p>Reembolsado: <strong>{payment.refundedAt.toLocaleString("es-PE")}</strong></p> : null}
            <p>Comprobante solicitado: <strong>{order.receiptType}</strong></p>
          </section>
        </div>

        {canCustomerCancel ? (
          <section className="orderCancellationPanel">
            <div>
              <strong>¿Necesitas cancelar?</strong>
              <span>
                Solo puedes hacerlo mientras el pago siga pendiente o en revisión. Si el pago ya fue aprobado, la cancelación y un posible reembolso deben resolverse con el negocio.
              </span>
            </div>
            <form action={cancelPendingOrder.bind(null, order.number)}>
              <button className="button buttonDanger" type="submit">Cancelar pedido</button>
            </form>
          </section>
        ) : null}

        <div className="orderStatusActions">
          <Link className="button buttonDark" href="/productos">Seguir comprando</Link>
          <Link className="button" href="/mi-cuenta">Ir a mi cuenta</Link>
        </div>
      </section>
    </main>
  );
}
