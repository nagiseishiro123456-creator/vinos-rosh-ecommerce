import { randomUUID } from "node:crypto";
import { formatPrice } from "@/lib/money";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ReservationForm } from "@/components/reservation-form";
import { CartMergeBoundary } from "@/components/cart-merge-boundary";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrderAmountFits, MoneyError } from "@/modules/checkout/pricing";
import { createCheckoutQuote } from "@/modules/checkout/quote";
import { createCheckoutKey } from "@/modules/checkout/idempotency";
import { loadCheckoutSnapshot, CheckoutUnavailableError } from "@/modules/checkout/snapshot";
import { getCommerceSettings } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    addressId?: string;
    error?: string;
  }>;
};


function errorMessage(error: string | undefined) {
  if (error === "quote-changed") {
    return "El carrito, los precios o el envío cambiaron. Revisa el resumen actualizado antes de continuar. Todavía no se creó una reserva ni se realizó un cobro.";
  }
  if (error === "pending-limit") return "Tienes tres reservas o pagos en revisión. Consulta tus pedidos antes de crear otro.";
  if (error === "busy") return "La compra se está actualizando. Revisa el resumen e inténtalo de nuevo.";
  if (error === "invalid-confirmation") return "La confirmación ya no es válida. Revisa este resumen actualizado antes de continuar.";
  if (error === "duplicate-operation") {
    return "Ese código de operación ya está registrado. Verifica el número antes de continuar.";
  }
  if (error === "provider") {
    return "El método seleccionado no está configurado actualmente.";
  }
  if (error === "too-many") {
    return "Se detectaron demasiados intentos seguidos. Espera unos minutos antes de volver a enviar el pedido.";
  }
  return "Revisa los datos del pago y del comprobante.";
}

export default async function PaymentPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/checkout");
  }

  const params = await searchParams;
  const parsedAddressId = z.string().cuid().safeParse(params.addressId);
  if (!parsedAddressId.success) {
    redirect("/checkout");
  }

  let snapshot;
  try {
    snapshot = await loadCheckoutSnapshot(prisma, session.user.id, parsedAddressId.data);
    assertOrderAmountFits(snapshot.amounts.total);
  } catch (error) {
    if (error instanceof CheckoutUnavailableError) {
      if (error.code === "UNSUPPORTED_ZONE") redirect(`/checkout?addressId=${parsedAddressId.data}&error=unsupported-zone`);
      redirect("/carrito?error=stock-changed");
    }
    if (error instanceof MoneyError) redirect("/carrito?error=amount-invalid");
    throw error;
  }
  const { address, cart, shippingZone, amounts } = snapshot;
  const commerce = await getCommerceSettings();
  const checkoutQuote = createCheckoutQuote({ ...snapshot, userId: session.user.id });
  const checkoutKey = createCheckoutKey(session.user.id, checkoutQuote);
  const subtotal = amounts.subtotal.toFixed(2);
  const shippingAmount = amounts.shippingAmount.toFixed(2);
  const total = amounts.total.toFixed(2);

  return (
    <main className="checkoutPage purchaseFlow">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <CartMergeBoundary key={session.user.id} userId={session.user.id} renderId={randomUUID()} returnTo={`/checkout/pago?addressId=${address.id}`}><section className="paymentLayout paymentConfirmationLayout shell">
        <div className="paymentConfirmationHeading">
          <div className="checkoutHeading">
            <div>
              <p className="eyebrow wine">CHECKOUT · PASO 2</p>
              <h1>Confirma tu reserva</h1>
              <p>Revisa la entrega, el importe y el comprobante. Al confirmar reservaremos las botellas; después podrás pagar.</p>
            </div>
            <Link className="textLink" href={`/checkout?addressId=${address.id}`}>← Cambiar dirección</Link>
          </div>

          {params.error ? (
            <div className="checkoutError" role="alert">{errorMessage(params.error)}</div>
          ) : null}

        </div>

        <aside className="orderReviewCard" aria-labelledby="order-review-heading">
          <p className="eyebrow wine">ANTES DE CONFIRMAR</p>
          <h2 id="order-review-heading">Tu pedido</h2>
          <div className="orderReviewAddress">
            <strong>{address.recipient}</strong>
            <span>{address.addressLine1}</span>
            <span>{address.district}, {address.province}</span>
            <span>{address.phone}</span>
          </div>

          <div className="orderReviewItems">
            {cart.items.map((item, index) => (
              <div key={item.product.id}>
                <span>{item.quantity} × {item.product.name}</span>
                <strong>{formatPrice(amounts.lines[index].subtotal.toFixed(2))}</strong>
              </div>
            ))}
          </div>

          <div className="summaryRow"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
          <div className="summaryRow"><span>Envío a {shippingZone.district}</span><strong>{formatPrice(shippingAmount)}</strong></div>
          <div className="summaryTotal"><span>Total</span><strong>{formatPrice(total)}</strong></div>
        </aside>

        <div className="paymentMain">
          <ReservationForm
            addressId={address.id}
            total={total}
            checkoutQuote={checkoutQuote}
            checkoutKey={checkoutKey}
            yapeEnabled={commerce.yape.ready}
            transferEnabled={commerce.transfer.ready}
          />
        </div>
      </section>

      <WhatsAppFab /></CartMergeBoundary>
    </main>
  );
}
