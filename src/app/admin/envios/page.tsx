import { formatPrice } from "@/lib/money";
import Link from "next/link";

import { requireAdmin } from "@/modules/admin/auth";
import { prisma } from "@/lib/prisma";
import { toggleShippingZone } from "@/modules/shipping/actions";
import { ShippingZoneForm } from "./shipping-zone-form";
import { resolveShippingCoverage } from "@/modules/shipping/coverage";
import "@/components/delivery-address-form.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
};


export default async function ShippingAdminPage({ searchParams }: Props) {
  await requireAdmin("/admin/envios");

  const params = await searchParams;
  const zones = await prisma.shippingZone.findMany({
    orderBy: [{ active: "desc" }, { department: "asc" }, { province: "asc" }, { district: "asc" }],
  });
  const editing = params.edit ? zones.find((zone) => zone.id === params.edit) : undefined;
  const conflicts = new Set(zones.filter((zone) => zone.active && resolveShippingCoverage(zone, zones).kind === "ambiguous").map((zone) => zone.id));
  const feedback: Record<string, string> = { CONFLICT: "La zona cambió desde que abriste la página. Revisa su estado actual.", DUPLICATE: "Ya hay otra tarifa activa para esa ubicación. Revisa las zonas duplicadas antes de activarla.", NOT_FOUND: "La zona ya no está disponible.", INVALID: "Los datos de la zona no son válidos." };

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

      {params.saved ? <div className="adminSuccess" role="status">Zona guardada correctamente.</div> : null}
      {params.error ? <div className="checkoutError" role="alert">{Object.hasOwn(feedback, params.error) ? feedback[params.error] : "No pudimos modificar la zona. Revisa su estado y vuelve a intentarlo."}</div> : null}
      <p><Link className="textLink" href="/envios">Ver cobertura pública y tarifas →</Link></p>
      {conflicts.size ? <p className="checkoutError" role="alert">Hay tarifas activas duplicadas para una misma ubicación. Revisa sus importes y pausa las sobrantes; esa cobertura queda en revisión mientras haya más de una tarifa activa.</p> : null}

      <section className="adminSplit">
        <ShippingZoneForm key={editing?.id ?? "new"} initial={editing ? { id: editing.id, expectedUpdatedAt: editing.updatedAt.toISOString(), department: editing.department, province: editing.province, district: editing.district, price: editing.price.toFixed(2), active: editing.active } : undefined} />

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
                    const toggleAction = toggleShippingZone.bind(null, zone.id, zone.active, zone.updatedAt.toISOString());
                    return (
                      <tr key={zone.id}>
                        <td><strong>{zone.district}</strong><small>{zone.province}, {zone.department}</small>{conflicts.has(zone.id) ? <small>Cobertura en revisión</small> : null}</td>
                        <td>{formatPrice(zone.price.toFixed(2))}</td>
                        <td><span className={`statusPill ${zone.active ? "active" : "inactive"}`}>{zone.active ? "Activo" : "Pausado"}</span></td>
                        <td>
                          <Link className="textLink" href={`/admin/envios?edit=${zone.id}`}>Editar tarifa</Link>
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
