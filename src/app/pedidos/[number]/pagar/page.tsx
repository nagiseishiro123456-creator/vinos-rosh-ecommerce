import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ManualPaymentInstructions } from "@/components/manual-payment-instructions";
import { StoreHeader } from "@/components/store-header";
import { SubmitButton } from "@/components/submit-button";
import { authOptions } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { communicateManualPayment } from "@/modules/orders/actions";
import { expireUnpaidReservation } from "@/modules/orders/reservation-service";
import { getCommerceSettings } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

export default async function ReservedPaymentPage({ params, searchParams }: {
  params: Promise<{ number: string }>; searchParams: Promise<{ reserved?: string; recovered?: string; error?: string }>;
}) {
  const { number } = await params;
  const query = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(`/pedidos/${number}/pagar`)}`);
  let order = await prisma.order.findFirst({ where: { number, userId: session.user.id }, include: { items: true, payments: true } });
  if (!order) notFound();
  if (order.reservationExpiresAt && order.reservationExpiresAt <= new Date() && order.status === "PENDING_PAYMENT") {
    await expireUnpaidReservation(order.id);
    order = await prisma.order.findFirstOrThrow({ where: { id: order.id, userId: session.user.id }, include: { items: true, payments: true } });
  }
  if (order.status !== "PENDING_PAYMENT") redirect(`/pedidos/${order.number}`);
  const payment = order.payments[0];
  const hasReservation = Boolean(order.stockReservedAt && !order.stockReleasedAt && order.reservationExpiresAt);
  const isManual = payment?.provider === "YAPE_MANUAL" || payment?.provider === "TRANSFER_MANUAL";
  const canReport = hasReservation && order.payments.length === 1 && isManual && payment.status === "PENDING" && payment.amount.equals(order.total);
  const settings = await getCommerceSettings();
  const configured = payment?.provider === "YAPE_MANUAL" ? settings.yape.ready : settings.transfer.ready;
  const expires = order.reservationExpiresAt?.toLocaleString("es-PE", { timeZone: "America/Lima" });
  const errors: Record<string, string> = {
    "duplicate-operation": "Ese código ya está registrado. Revisa tu operación; no realices otro pago. Si necesitas ayuda, contacta a la tienda.",
    invalid: "Ingresa un código de operación de entre 4 y 80 caracteres.",
    "too-many": "Se detectaron demasiados intentos. Espera unos minutos o contacta a la tienda si ya pagaste.",
  };
  return <main className="checkoutPage">
    <div className="catalogHeaderWrap compact"><StoreHeader /></div>
    <section className="paymentLayout shell">
      <div className="paymentMain">
        <div className="checkoutHeading"><div>
          <p className="eyebrow wine">PEDIDO {order.number} · PASO 3</p>
          <h1>Paga tu pedido reservado</h1>
          <p>El importe de este pedido ya está confirmado. Tu reserva no representa un pago recibido.</p>
        </div></div>
        {query.reserved && canReport ? <div className="orderCreatedBanner" role="status"><strong>Botellas reservadas.</strong><span>Ahora puedes pagar y comunicar la operación de este pedido.</span></div> : null}
        {query.recovered && canReport ? <div className="orderCreatedBanner" role="status"><strong>Recuperamos tu pedido existente.</strong><span>Es la misma reserva, con el mismo importe y plazo. Realiza un solo pago.</span></div> : null}
        {query.error ? <div className="checkoutError" role="alert">{errors[query.error] ?? errors.invalid}</div> : null}
        {canReport ? <>
          <div className="checkoutWarningPanel"><strong>Reserva hasta el {expires} (hora de Perú).</strong>
            <p>Paga y comunica la operación antes de ese plazo. Si vence después de pagar, contacta a la tienda para conciliar el abono y no pagues otra vez.</p>
          </div>
          <section className="paymentSection">
            <p className="eyebrow wine">{payment.provider === "YAPE_MANUAL" ? "YAPE" : "TRANSFERENCIA BANCARIA"}</p>
            {configured ? <ManualPaymentInstructions total={order.total.toFixed(2)}
              yape={payment.provider === "YAPE_MANUAL" ? settings.yape : undefined}
              transfer={payment.provider === "TRANSFER_MANUAL" ? settings.transfer : undefined} /> : <div className="checkoutWarningPanel">
                El medio de pago no está disponible. Contacta a la tienda antes de pagar. Si ya realizaste el pago, puedes comunicar su código para revisión.
              </div>}
            <form className="paymentReportForm" action={communicateManualPayment.bind(null, order.number)}>
              <div className="formField"><label htmlFor="operationCode">Número o código de operación</label>
                <input id="operationCode" name="operationCode" required minLength={4} maxLength={80} autoComplete="off" placeholder="Ej. 12345678" />
              </div>
              <SubmitButton pendingText="Comunicando…">Ya pagué: enviar operación a revisión</SubmitButton>
              <p className="checkoutSecurityNote">El administrador verificará el abono en la cuenta del negocio. Comunicar el código no confirma el pago.</p>
            </form>
          </section>
        </> : <div className="checkoutWarningPanel" role="alert">No podemos verificar una reserva válida para este pedido. Contacta a la tienda antes de pagar.</div>}
        <Link className="textLink" href={`/pedidos/${order.number}`}>Ver pedido y opciones de cancelación →</Link>
      </div>
      <aside className="orderReviewCard">
        <p className="eyebrow wine">TU PEDIDO RESERVADO</p>
        <div className="orderReviewAddress"><strong>{order.shippingRecipient}</strong><span>{order.shippingAddress}</span><span>{order.shippingDistrict}, {order.shippingProvince}</span></div>
        <div className="orderReviewItems">{order.items.map((item) => <div key={item.id}><span>{item.quantity} × {item.productName}</span><strong>{formatPrice(item.subtotal.toFixed(2))}</strong></div>)}</div>
        <div className="summaryRow"><span>Subtotal</span><strong>{formatPrice(order.subtotal.toFixed(2))}</strong></div>
        <div className="summaryRow"><span>Envío</span><strong>{formatPrice(order.shippingAmount.toFixed(2))}</strong></div>
        <div className="summaryTotal"><span>Total</span><strong>{formatPrice(order.total.toFixed(2))}</strong></div>
      </aside>
    </section>
  </main>;
}
