import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PaymentForm } from "@/components/payment-form";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManualPaymentHoldMinutes } from "@/modules/orders/hold";
import { getCommerceSettings } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    addressId?: string;
    error?: string;
  }>;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function errorMessage(error: string | undefined) {
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

  const [address, cart, commerce] = await Promise.all([
    prisma.address.findFirst({
      where: {
        id: parsedAddressId.data,
        userId: session.user.id,
        active: true,
      },
    }),
    prisma.cart.findUnique({
      where: { userId: session.user.id },
      select: {
        items: {
          select: {
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                active: true,
              },
            },
          },
        },
      },
    }),
    getCommerceSettings(),
  ]);

  if (!address || !cart || cart.items.length === 0) {
    redirect("/carrito");
  }

  const shippingZone = await prisma.shippingZone.findFirst({
    where: {
      active: true,
      department: address.department,
      province: address.province,
      district: address.district,
    },
  });

  if (!shippingZone) {
    redirect(`/checkout?addressId=${address.id}&error=unsupported-zone`);
  }

  if (cart.items.some((item) => !item.product.active || item.quantity > item.product.stock)) {
    redirect("/carrito?error=stock-changed");
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const shippingAmount = Number(shippingZone.price);
  const total = subtotal + shippingAmount;
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
            <div className="checkoutError">{errorMessage(params.error)}</div>
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
            {cart.items.map((item) => (
              <div key={item.product.id}>
                <span>{item.quantity} × {item.product.name}</span>
                <strong>{formatPrice(Number(item.product.price) * item.quantity)}</strong>
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
