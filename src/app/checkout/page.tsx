import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutAddressSelector } from "@/components/checkout-address-selector";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { authOptions } from "@/lib/auth";
import { createAddress } from "@/modules/addresses/actions";
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
  const createCheckoutAddress = createAddress.bind(null, "checkout");

  if (data.items.length === 0) {
    redirect("/carrito");
  }

  return (
    <main className="checkoutPage">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <section className="checkoutShell shell">
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

            <form className="checkoutForm" action={createCheckoutAddress}>
              <div className="formField">
                <label htmlFor="label">Nombre de la dirección</label>
                <input id="label" name="label" placeholder="Casa, oficina..." maxLength={40} />
              </div>

              <div className="checkoutFormGrid">
                <div className="formField">
                  <label htmlFor="recipient">Persona que recibe</label>
                  <input id="recipient" name="recipient" required maxLength={120} defaultValue={`${session.user.name ?? ""}`} />
                </div>
                <div className="formField">
                  <label htmlFor="phone">Celular</label>
                  <input id="phone" name="phone" required inputMode="tel" autoComplete="tel" placeholder="987654321" />
                </div>
              </div>

              <div className="formField">
                <label htmlFor="shippingZoneId">Distrito / zona de entrega</label>
                <select id="shippingZoneId" name="shippingZoneId" required disabled={data.shippingZones.length === 0} defaultValue="">
                  <option value="" disabled>Selecciona una zona</option>
                  {data.shippingZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.district} · {zone.province} · S/ {zone.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formField">
                <label htmlFor="addressLine1">Dirección exacta</label>
                <input id="addressLine1" name="addressLine1" required maxLength={200} autoComplete="street-address" placeholder="Av., calle, número, urbanización" />
              </div>

              <div className="formField">
                <label htmlFor="reference">Referencia</label>
                <textarea id="reference" name="reference" maxLength={250} rows={3} placeholder="Frente a..., puerta de color..., etc." />
              </div>

              <label className="checkboxField">
                <input type="checkbox" name="isDefault" />
                <span>Usar como dirección predeterminada</span>
              </label>

              <button className="button buttonDark" type="submit" disabled={data.shippingZones.length === 0}>
                Guardar dirección
              </button>
            </form>
          </section>
        </div>
      </section>

      <WhatsAppFab />
    </main>
  );
}
