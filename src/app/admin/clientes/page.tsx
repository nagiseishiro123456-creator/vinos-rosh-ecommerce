import { UserRole } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminCustomersPage({ searchParams }: Props) {
  await requireAdmin("/admin/clientes");
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 80);

  const customers = await prisma.user.findMany({
    where: {
      role: UserRole.CUSTOMER,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          orders: true,
          addresses: { where: { active: true } },
          reviews: true,
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { number: true, createdAt: true },
      },
    },
  });

  return (
    <main className="shell adminPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">CLIENTES</p>
          <h1>Directorio</h1>
          <p className="adminIntro">Consulta cuentas registradas, actividad de compra y datos de entrega desde una zona protegida.</p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin">Panel</Link>
        </div>
      </div>

      <form className="adminSearchBar" method="get">
        <input name="q" type="search" maxLength={80} defaultValue={params.q ?? ""} placeholder="Buscar por nombre, correo o celular" />
        <button className="button buttonDark" type="submit">Buscar</button>
        {query ? <Link className="button buttonGhostLight" href="/admin/clientes">Limpiar</Link> : null}
      </form>

      <section className="adminStatsGrid">
        <article><span>Resultados</span><strong>{customers.length}</strong></article>
        <article><span>Con pedidos</span><strong>{customers.filter((customer) => customer._count.orders > 0).length}</strong></article>
        <article><span>Con reseñas</span><strong>{customers.filter((customer) => customer._count.reviews > 0).length}</strong></article>
      </section>

      {customers.length === 0 ? (
        <section className="adminEmptyState">
          <strong>No encontramos clientes.</strong>
          <p>{query ? "Prueba con otro nombre, correo o celular." : "Las cuentas registradas aparecerán aquí."}</p>
        </section>
      ) : (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Celular</th>
                <th>Pedidos</th>
                <th>Direcciones</th>
                <th>Última compra</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.firstName} {customer.lastName}</strong>
                    <small>{customer.email}</small>
                  </td>
                  <td>{customer.phone ?? "—"}</td>
                  <td>{customer._count.orders}</td>
                  <td>{customer._count.addresses}</td>
                  <td>
                    {customer.orders[0]
                      ? `${customer.orders[0].createdAt.toLocaleDateString("es-PE")} · ${customer.orders[0].number}`
                      : "Sin pedidos"}
                  </td>
                  <td>
                    <Link className="adminTextButton" href={`/admin/clientes/${customer.id}`}>Ver ficha</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
