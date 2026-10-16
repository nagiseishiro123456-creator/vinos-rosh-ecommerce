import { formatPrice } from "@/lib/money";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PaymentForm } from "@/components/payment-form";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertOrderAmountFits, MoneyError } from "@/modules/checkout/pricing";
import { createCheckoutQuote } from "@/modules/checkout/quote";
import { loadCheckoutSnapshot, CheckoutUnavailableError } from "@/modules/checkout/snapshot";
import { getManualPaymentHoldMinutes } from "@/modules/orders/hold";
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
    return "El carrito, los precios o el envío cambiaron. Revisa el resumen actualizado antes de continuar. Si ya pagaste, contacta a la tienda para conciliar el importe y no pagues de nuevo.";
  }
  if (error === "pending-limit") return "Tienes pedidos pendientes de revisión. Consulta su estado antes de crear otro.";
  if (error === "busy") return "La compra se está actualizando. Revisa el resumen e inténtalo de nuevo.";
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
  const subtotal = amounts.subtotal.toFixed(2);
  const shippingAmount = amounts.shippingAmount.toFixed(2);
  const total = amounts.total.toFixed(2);
  const holdMinutes = getManualPaymentHoldMinutes();

  return (
    <main className="checkoutPage">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <section className="paymentLayout shell">
        <div className="paymentMain">
          <div className="checkoutHeading">
            <div>
              <p className="eyebrow wine">CHECKOUT · PASO 2</p>
              <h1>Pago y comprobante</h1>
              <p>El pago manual se registra como pendiente de revisión. El administrador confirma o rechaza la operación antes de preparar el pedido.</p>
            </div>
            <Link className="textLink" href={`/checkout?addressId=${address.id}`}>← Cambiar dirección</Link>
          </div>

          {params.error ? (
            <div className="checkoutError" role="alert">{errorMessage(params.error)}</div>
          ) : null}

          <div className="checkoutWarningPanel">
            <strong>Reserva temporal de stock: {holdMinutes} minutos.</strong>
            <p>
              Si el pago no es validado dentro de ese periodo, el sistema puede cancelar la reserva durante el mantenimiento y devolver las unidades al inventario.
            </p>
          </div>

          <PaymentForm
            addressId={address.id}
            total={total}
            checkoutQuote={checkoutQuote}
            yape={{
              enabled: commerce.yape.ready,
              phone: commerce.yape.phone,
              qrImageUrl: commerce.yape.qrImageUrl,
            }}
            transfer={{
              enabled: commerce.transfer.ready,
              label: commerce.transfer.label,
              accountNumber: commerce.transfer.accountNumber,
              holder: commerce.transfer.holder,
            }}
          />
        </div>

        <aside className="orderReviewCard">
          <p className="eyebrow wine">TU PEDIDO</p>
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
      </section>

      <WhatsAppFab />
    </main>
  );
}
