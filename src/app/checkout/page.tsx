import { randomUUID } from "node:crypto";
import { DeliveryAddressForm } from "@/components/delivery-address-form";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutAddressSelector } from "@/components/checkout-address-selector";
import { CartMergeBoundary } from "@/components/cart-merge-boundary";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { authOptions } from "@/lib/auth";
import { getCheckoutData } from "@/modules/checkout/queries";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    addressId?: string;
    error?: string;
  }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/checkout");
  }

  const params = await searchParams;
  const data = await getCheckoutData(session.user.id);

  if (data.items.length === 0) {
    redirect("/carrito");
  }

  return (
    <main className="checkoutPage purchaseFlow">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <CartMergeBoundary key={session.user.id} userId={session.user.id} renderId={randomUUID()} returnTo="/checkout"><section className="checkoutShell shell">
        <div className="checkoutHeading">
          <div>
            <p className="eyebrow wine">CHECKOUT · PASO 1</p>
            <h1>Entrega y envío</h1>
            <p>Selecciona una dirección guardada o registra una nueva. La tarifa se calcula automáticamente según la zona configurada.</p>
          </div>
          <Link className="textLink" href="/carrito">← Volver al carrito</Link>
        </div>

        {params.error ? (
          <div className="checkoutError">
            {params.error === "unsupported-zone"
              ? "La zona seleccionada ya no está disponible. Elige otra zona activa."
              : "Revisa los datos de la dirección e inténtalo nuevamente."}
          </div>
        ) : null}

        {data.shippingZones.length === 0 ? (
          <div className="checkoutWarningPanel">
            <strong>Aún no hay zonas de envío activas.</strong>
            <p>El administrador debe registrar las tarifas reales por distrito antes de que los clientes puedan continuar al pago.</p>
          </div>
        ) : null}

        <div className="checkoutContentGrid">
          <section className="checkoutBlock">
            <div className="checkoutBlockHeading">
              <div>
                <p className="eyebrow wine">DIRECCIONES</p>
                <h2>¿Dónde entregamos?</h2>
              </div>
              <span>{data.addresses.length} guardada{data.addresses.length === 1 ? "" : "s"}</span>
            </div>

            {data.addresses.length > 0 ? (
              <CheckoutAddressSelector
                addresses={data.addresses}
                shippingZones={data.shippingZones}
                subtotal={data.subtotal}
                initialAddressId={params.addressId}
                blocked={data.hasInvalidItems}
              />
            ) : (
              <div className="checkoutEmptyAddress">
                <strong>Todavía no tienes una dirección guardada.</strong>
                <p>Registra tu primera dirección usando una zona de entrega habilitada.</p>
              </div>
            )}
          </section>

          <section className="checkoutBlock newAddressBlock">
            <div className="checkoutBlockHeading">
              <div>
                <p className="eyebrow wine">NUEVA DIRECCIÓN</p>
                <h2>Agregar dirección</h2>
              </div>
            </div>

            <DeliveryAddressForm destination="checkout" zones={data.shippingZones} initial={{ recipient: session.user.name ?? "" }} />
          </section>
        </div>
      </section>

      <WhatsAppFab /></CartMergeBoundary>
    </main>
  );
}
