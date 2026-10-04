import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PaymentForm } from "@/components/payment-form";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const [address, cart] = await Promise.all([
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

  const yapeEnabled =
    process.env.PAYMENTS_YAPE_MANUAL_ENABLED === "true" &&
    Boolean(process.env.YAPE_PHONE || process.env.YAPE_QR_IMAGE_URL);
  const transferEnabled =
    process.env.PAYMENTS_TRANSFER_MANUAL_ENABLED === "true" &&
    Boolean(process.env.BANK_ACCOUNT_NUMBER);

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
            <div className="checkoutError">
              {params.error === "duplicate-operation"
                ? "Ese código de operación ya está registrado. Verifica el número antes de continuar."
                : params.error === "provider"
                  ? "El método seleccionado no está configurado actualmente."
                  : "Revisa los datos del pago y del comprobante."}
            </div>
          ) : null}

          <PaymentForm
            addressId={address.id}
            total={total}
            yape={{
              enabled: yapeEnabled,
              phone: process.env.YAPE_PHONE ?? null,
              qrImageUrl: process.env.YAPE_QR_IMAGE_URL ?? null,
            }}
            transfer={{
              enabled: transferEnabled,
              label: process.env.BANK_ACCOUNT_LABEL ?? null,
              accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? null,
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
