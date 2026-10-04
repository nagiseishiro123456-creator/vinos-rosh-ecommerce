import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { archiveAddress, createAddress, setDefaultAddress } from "@/modules/addresses/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ status?: string; error?: string }>;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function AddressesPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/mi-cuenta/direcciones");
  }

  const [params, user, shippingZones] = await Promise.all([
    searchParams,
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        addresses: {
          where: { active: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          select: {
            id: true,
            label: true,
            recipient: true,
            phone: true,
            department: true,
            province: true,
            district: true,
            addressLine1: true,
            reference: true,
            isDefault: true,
          },
        },
      },
    }),
    prisma.shippingZone.findMany({
      where: { active: true },
      orderBy: [{ department: "asc" }, { province: "asc" }, { district: "asc" }],
      select: { id: true, department: true, province: true, district: true, price: true },
    }),
  ]);

  if (!user) redirect("/iniciar-sesion");

  const createAccountAddress = createAddress.bind(null, "account");

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact"><StoreHeader /></div>

      <section className="shell accountToolShell">
        <div className="accountToolHeading">
          <div>
            <p className="eyebrow wine">MI CUENTA</p>
            <h1>Mis direcciones</h1>
            <p>Administra tus puntos de entrega y elige cuál debe aparecer primero durante el checkout.</p>
          </div>
          <Link className="textLink" href="/mi-cuenta">← Volver a mi cuenta</Link>
        </div>

        {params.status === "created" ? <div className="accountNotice success">Dirección guardada correctamente.</div> : null}
        {params.status === "updated" ? <div className="accountNotice success">Dirección actualizada correctamente.</div> : null}
        {params.error ? (
          <div className="accountNotice error">
            {params.error === "unsupported-zone"
              ? "La zona elegida ya no se encuentra disponible."
              : params.error === "not-found"
                ? "No encontramos esa dirección en tu cuenta."
                : "Revisa los datos de la dirección e inténtalo nuevamente."}
          </div>
        ) : null}

        <div className="accountToolGrid">
          <section className="accountToolCard">
            <div className="accountToolSectionHeading">
              <div>
                <p className="eyebrow wine">GUARDADAS</p>
                <h2>Direcciones activas</h2>
              </div>
              <span>{user.addresses.length}</span>
            </div>

            {user.addresses.length === 0 ? (
              <div className="accountEmptyState">
                <strong>Aún no tienes direcciones guardadas.</strong>
                <p>Registra la primera usando una zona de envío habilitada.</p>
              </div>
            ) : (
              <div className="accountAddressManagerList">
                {user.addresses.map((address) => {
                  const defaultAction = setDefaultAddress.bind(null, address.id);
                  const archiveAction = archiveAddress.bind(null, address.id);

                  return (
                    <article className="accountAddressManagerCard" key={address.id}>
                      <div className="accountAddressManagerTop">
                        <div>
                          <span className="accountAddressLabel">{address.label || "Dirección"}</span>
                          {address.isDefault ? <span className="accountDefaultBadge">Principal</span> : null}
                        </div>
                        <Link className="textLink" href={`/mi-cuenta/direcciones/${address.id}`}>Editar</Link>
                      </div>

                      <strong>{address.recipient}</strong>
                      <p>{address.addressLine1}</p>
                      <p>{address.district}, {address.province}, {address.department}</p>
                      <p>{address.phone}</p>
                      {address.reference ? <small>Referencia: {address.reference}</small> : null}

                      <div className="accountAddressManagerActions">
                        {!address.isDefault ? (
                          <form action={defaultAction}>
                            <button className="button buttonGhostLight" type="submit">Usar como principal</button>
                          </form>
                        ) : null}
                        <form action={archiveAction}>
                          <button className="button accountDangerButton" type="submit">Quitar dirección</button>
                        </form>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="accountToolCard">
            <div className="accountToolSectionHeading">
              <div>
                <p className="eyebrow wine">NUEVA</p>
                <h2>Agregar dirección</h2>
              </div>
            </div>

            {shippingZones.length === 0 ? (
              <div className="accountNotice warning">El administrador aún no configuró zonas de envío activas.</div>
            ) : (
              <form className="accountToolForm" action={createAccountAddress}>
                <label className="accountToolField">
                  <span>Nombre de la dirección</span>
                  <input name="label" maxLength={40} placeholder="Casa, oficina..." />
                </label>

                <div className="accountToolFormGrid">
                  <label className="accountToolField">
                    <span>Persona que recibe</span>
                    <input name="recipient" required maxLength={120} defaultValue={`${user.firstName} ${user.lastName}`} />
                  </label>

                  <label className="accountToolField">
                    <span>Celular</span>
                    <input name="phone" required inputMode="tel" maxLength={16} defaultValue={user.phone ?? ""} placeholder="987654321" />
                  </label>
                </div>

                <label className="accountToolField">
                  <span>Distrito / zona</span>
                  <select name="shippingZoneId" required defaultValue="">
                    <option value="" disabled>Selecciona una zona</option>
                    {shippingZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.district} · {zone.province} · {formatPrice(Number(zone.price))}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="accountToolField">
                  <span>Dirección exacta</span>
                  <input name="addressLine1" required maxLength={200} placeholder="Av., calle, número, urbanización" />
                </label>

                <label className="accountToolField">
                  <span>Referencia</span>
                  <textarea name="reference" maxLength={250} rows={3} placeholder="Frente a..., puerta de color..., etc." />
                </label>

                <label className="accountCheckbox">
                  <input type="checkbox" name="isDefault" />
                  <span>Usar como dirección principal</span>
                </label>

                <button className="button buttonDark" type="submit">Guardar dirección</button>
              </form>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
