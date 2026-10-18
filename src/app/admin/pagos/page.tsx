import { formatPrice } from "@/lib/money";
import { PaymentStatus } from "@prisma/client";
import Link from "next/link";

import { requireAdmin } from "@/modules/admin/auth";
import { operationMessages } from "@/modules/admin/operation-feedback";
import { prisma } from "@/lib/prisma";
import { approveManualPayment, rejectManualPayment } from "@/modules/payments/actions";

export const dynamic = "force-dynamic";


function providerLabel(provider: string) {
  if (provider === "YAPE_MANUAL") return "Yape";
  if (provider === "TRANSFER_MANUAL") return "Transferencia";
  return provider;
}

export default async function PaymentsAdminPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  await requireAdmin("/admin/pagos");
  const { result } = await searchParams;

  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.UNDER_REVIEW },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      provider: true,
      currency: true,
      amount: true,
      operationCode: true,
      createdAt: true,
      reportedAt: true,
      order: {
        select: {
          number: true,
          id: true,
          total: true,
          shippingDistrict: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          items: {
            select: {
              productName: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  return (
    <main className="adminPage shell">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">ADMIN · PAGOS</p>
          <h1>Pagos por verificar</h1>
          <p>Aprueba únicamente después de confirmar la operación en la cuenta real del negocio. Rechazar libera el stock reservado.</p>
        </div>
        <Link className="textLink" href="/admin">← Panel principal</Link>
      </div>

      {result && Object.hasOwn(operationMessages, result) ? <p role="status" className="adminCard">{operationMessages[result]}</p> : null}

      {payments.length === 0 ? (
        <div className="adminCard emptyPanel">
          <strong>No hay pagos pendientes de revisión.</strong>
          <p>Los pagos manuales enviados por clientes aparecerán aquí.</p>
        </div>
      ) : (
        <div className="paymentReviewList">
          {payments.map((payment) => {
            const approveAction = approveManualPayment.bind(null, payment.id);
            const rejectAction = rejectManualPayment.bind(null, payment.id);

            return (
              <article className="paymentReviewCard" key={payment.id}>
                <div className="paymentReviewHeader">
                  <div>
                    <span>{providerLabel(payment.provider)}</span>
                    <strong>{payment.order.number}</strong>
                    <Link className="textLink" href={`/admin/pedidos/${payment.order.id}`}>Ver pedido y trazabilidad</Link>
                  </div>
                  <strong>{payment.currency === "PEN" ? formatPrice(payment.amount.toFixed(2)) : `${payment.currency} ${payment.amount.toFixed(2)}`}</strong>
                </div>

                <div className="paymentReviewGrid">
                  <div>
                    <small>Cliente</small>
                    <strong>{payment.order.user.firstName} {payment.order.user.lastName}</strong>
                    <span>{payment.order.user.email}</span>
                  </div>
                  <div>
                    <small>Operación</small>
                    <strong>{payment.operationCode ?? "Sin código"}</strong>
                    <span>{(payment.reportedAt ?? payment.createdAt).toLocaleString("es-PE", { timeZone: "America/Lima" })} (hora de Perú)</span>
                  </div>
                  <div>
                    <small>Entrega</small>
                    <strong>{payment.order.shippingDistrict}</strong>
                    <span>{payment.order.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}</span>
                  </div>
                </div>

                <div className="paymentReviewActions">
                  <form action={rejectAction} className="adminRefundForm">
                    <label>Motivo del rechazo<input name="reason" required minLength={4} maxLength={500} /></label>
                    <label className="adminConfirmCheck"><input type="checkbox" name="confirm" value="yes" required />Confirmo el rechazo y la liberación del stock.</label>
                    <button className="button adminRejectButton" type="submit">Rechazar y liberar stock</button>
                  </form>
                  <form action={approveAction} className="adminRefundForm">
                    <label className="adminConfirmCheck"><input type="checkbox" name="confirm" value="yes" required />Verifiqué la operación y el monto en la cuenta del negocio.</label>
                    <button className="button buttonDark" type="submit">Confirmar pago</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
