import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveShippingZone, toggleShippingZone } from "@/modules/shipping/actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export default async function ShippingAdminPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/iniciar-sesion?callbackUrl=/admin/envios");
  if (session.user.role !== "ADMIN") redirect("/mi-cuenta");

  const params = await searchParams;
  const zones = await prisma.shippingZone.findMany({
    orderBy: [{ active: "desc" }, { department: "asc" }, { province: "asc" }, { district: "asc" }],
  });

  return (
    <main className="adminPage shell">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">ADMIN · ENVÍOS</p>
          <h1>Tarifas por distrito</h1>
          <p>Estas tarifas se usan en tiempo real durante el checkout. No hay precios ficticios cargados por defecto.</p>
        </div>
        <Link className="textLink" href="/admin">← Panel principal</Link>
      </div>

      {params.saved ? <div className="adminSuccess">Zona guardada correctamente.</div> : null}
      {params.error ? <div className="checkoutError">Revisa el distrito y la tarifa ingresada.</div> : null}

      <section className="adminSplit">
        <form className="adminCard checkoutForm" action={saveShippingZone}>
          <p className="eyebrow wine">NUEVA / ACTUALIZAR</p>
          <h2>Configurar zona</h2>

          <div className="checkoutFormGrid">
            <div className="formField">
              <label htmlFor="department">Departamento</label>
              <input id="department" name="department" defaultValue="Lima" required />
            </div>
            <div className="formField">
              <label htmlFor="province">Provincia</label>
              <input id="province" name="province" defaultValue="Lima" required />
            </div>
          </div>

          <div className="formField">
            <label htmlFor="district">Distrito</label>
            <input id="district" name="district" placeholder="Ej. Miraflores" required />
          </div>

          <div className="formField">
            <label htmlFor="price">Tarifa de envío (S/)</label>
            <input id="price" name="price" type="number" min="0.01" max="10000" step="0.01" placeholder="12.00" required />
          </div>

          <button className="button buttonDark" type="submit">Guardar tarifa</button>
        </form>

        <section className="adminCard adminWideCard">
          <p className="eyebrow wine">COBERTURA</p>
          <h2>Zonas configuradas</h2>

          {zones.length === 0 ? (
            <div className="emptyPanel">
              <strong>No hay zonas todavía.</strong>
              <p>Registra el primer distrito para habilitar el cálculo de envío del checkout.</p>
            </div>
          ) : (
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Zona</th>
                    <th>Tarifa</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => {
                    const toggleAction = toggleShippingZone.bind(null, zone.id);
                    return (
                      <tr key={zone.id}>
                        <td><strong>{zone.district}</strong><small>{zone.province}, {zone.department}</small></td>
                        <td>{formatPrice(Number(zone.price))}</td>
                        <td><span className={`statusPill ${zone.active ? "active" : "inactive"}`}>{zone.active ? "Activo" : "Pausado"}</span></td>
                        <td>
                          <form action={toggleAction}>
                            <button className="adminTextButton" type="submit">{zone.active ? "Pausar" : "Activar"}</button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
