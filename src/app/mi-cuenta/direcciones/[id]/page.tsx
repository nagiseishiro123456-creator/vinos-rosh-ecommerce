import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateAddress } from "@/modules/addresses/actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function EditAddressPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/mi-cuenta/direcciones");
  }

  const { id } = await params;
  const [address, shippingZones] = await Promise.all([
    prisma.address.findFirst({
      where: { id, userId: session.user.id, active: true },
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
    }),
    prisma.shippingZone.findMany({
      where: { active: true },
      orderBy: [{ department: "asc" }, { province: "asc" }, { district: "asc" }],
      select: { id: true, department: true, province: true, district: true, price: true },
    }),
  ]);

  if (!address) notFound();

  const selectedZone = shippingZones.find(
    (zone) => zone.department === address.department && zone.province === address.province && zone.district === address.district,
  );
  const updateAction = updateAddress.bind(null, address.id);

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact"><StoreHeader /></div>

      <section className="shell accountToolShell narrow">
        <div className="accountToolHeading">
          <div>
            <p className="eyebrow wine">DIRECCIONES</p>
            <h1>Editar dirección</h1>
            <p>Actualiza los datos de entrega. Solo se pueden seleccionar zonas habilitadas por la tienda.</p>
          </div>
          <Link className="textLink" href="/mi-cuenta/direcciones">← Volver a direcciones</Link>
        </div>

        <section className="accountToolCard">
          <form className="accountToolForm" action={updateAction}>
            <label className="accountToolField">
              <span>Nombre de la dirección</span>
              <input name="label" maxLength={40} defaultValue={address.label ?? ""} placeholder="Casa, oficina..." />
            </label>

            <div className="accountToolFormGrid">
              <label className="accountToolField">
                <span>Persona que recibe</span>
                <input name="recipient" required maxLength={120} defaultValue={address.recipient} />
              </label>

              <label className="accountToolField">
                <span>Celular</span>
                <input name="phone" required inputMode="tel" maxLength={16} defaultValue={address.phone} />
              </label>
            </div>

            <label className="accountToolField">
              <span>Distrito / zona</span>
              <select name="shippingZoneId" required defaultValue={selectedZone?.id ?? ""}>
                {!selectedZone ? <option value="" disabled>Selecciona una zona activa</option> : null}
                {shippingZones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.district} · {zone.province} · {formatPrice(Number(zone.price))}
                  </option>
                ))}
              </select>
              {!selectedZone ? <small>La zona anterior ya no está activa; debes elegir una nueva.</small> : null}
            </label>

            <label className="accountToolField">
              <span>Dirección exacta</span>
              <input name="addressLine1" required maxLength={200} defaultValue={address.addressLine1} />
            </label>

            <label className="accountToolField">
              <span>Referencia</span>
              <textarea name="reference" maxLength={250} rows={3} defaultValue={address.reference ?? ""} />
            </label>

            <label className="accountCheckbox">
              <input type="checkbox" name="isDefault" defaultChecked={address.isDefault} />
              <span>Usar como dirección principal</span>
            </label>

            <div className="accountToolActions split">
              <Link className="button buttonGhostLight" href="/mi-cuenta/direcciones">Cancelar</Link>
              <button className="button buttonDark" type="submit">Guardar cambios</button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
