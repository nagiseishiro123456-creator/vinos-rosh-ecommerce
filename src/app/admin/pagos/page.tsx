import { PaymentStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveManualPayment, rejectManualPayment } from "@/modules/payments/actions";

export const dynamic = "force-dynamic";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function providerLabel(provider: string) {
  if (provider === "YAPE_MANUAL") return "Yape";
  if (provider === "TRANSFER_MANUAL") return "Transferencia";
  return provider;
}

export default async function PaymentsAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/admin/pagos");
  if (session.user.role !== "ADMIN") redirect("/mi-cuenta");

  const payments = await prisma.payment.findMany({
    where: { status: PaymentStatus.UNDER_REVIEW },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: {
      id: true,
      provider: true,
      amount: true,
      operationCode: true,
      createdAt: true,
      order: {
        select: {
          number: true,
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
                  </div>
                  <strong>{formatPrice(Number(payment.amount))}</strong>
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
                    <span>{payment.createdAt.toLocaleString("es-PE")}</span>
                  </div>
                  <div>
                    <small>Entrega</small>
                    <strong>{payment.order.shippingDistrict}</strong>
                    <span>{payment.order.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}</span>
                  </div>
                </div>

                <div className="paymentReviewActions">
                  <form action={rejectAction}>
                    <button className="button adminRejectButton" type="submit">Rechazar y liberar stock</button>
                  </form>
                  <form action={approveAction}>
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
