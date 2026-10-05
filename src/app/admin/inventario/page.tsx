import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { updateInventory } from "@/modules/admin/products/actions";

export const dynamic = "force-dynamic";

function movementLabel(type: string) {
  const labels: Record<string, string> = {
    INITIAL_STOCK: "Stock inicial",
    MANUAL_ADJUSTMENT: "Ajuste manual",
    ORDER_RESERVATION: "Reserva por pedido",
    ORDER_RELEASE: "Liberación de reserva",
  };
  return labels[type] ?? type;
}

export default async function AdminInventoryPage() {
  await requireAdmin("/admin/inventario");

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        active: true,
      },
    }),
    prisma.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        quantity: true,
        stockAfter: true,
        note: true,
        createdAt: true,
        product: { select: { name: true, sku: true } },
        order: { select: { number: true } },
        actor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const outOfStock = products.filter((product) => product.stock === 0).length;
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);

  return (
    <main className="shell adminPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">OPERACIONES</p>
          <h1>Inventario</h1>
          <p className="adminIntro">Actualiza existencias reales y revisa la trazabilidad de cada movimiento de stock.</p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin">Panel</Link>
          <Link className="button buttonDark" href="/admin/productos">Productos</Link>
        </div>
      </div>

      <section className="adminStatsGrid">
        <article><span>Unidades totales</span><strong>{totalUnits}</strong></article>
        <article><span>Stock bajo</span><strong>{lowStock}</strong></article>
        <article><span>Agotados</span><strong>{outOfStock}</strong></article>
      </section>

      {products.length === 0 ? (
        <section className="adminEmptyState">
          <strong>Aún no hay productos en inventario.</strong>
          <p>Crea productos primero para empezar a controlar existencias.</p>
          <Link className="button buttonPrimary" href="/admin/productos/nuevo">Crear producto</Link>
        </section>
      ) : (
        <div className="adminInventoryGrid">
          {products.map((product) => {
            const action = updateInventory.bind(null, product.id);
            const stockClass = product.stock === 0 ? "danger" : product.stock <= 5 ? "warning" : "success";

            return (
              <article className="adminInventoryCard" key={product.id}>
                <div>
                  <span className={`adminBadge ${stockClass}`}>
                    {product.stock === 0 ? "Agotado" : product.stock <= 5 ? "Stock bajo" : "Disponible"}
                  </span>
                  {!product.active ? <span className="adminBadge muted">Oculto</span> : null}
                </div>
                <h2>{product.name}</h2>
                <p>{product.sku || "Sin SKU"}</p>
                <form action={action} className="inventoryForm">
                  <label htmlFor={`stock-${product.id}`}>Stock actual</label>
                  <div>
                    <input id={`stock-${product.id}`} name="stock" type="number" min="0" step="1" defaultValue={product.stock} required />
                    <button className="button buttonPrimary" type="submit">Guardar</button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      )}

      <section className="adminCard" style={{ marginTop: 32 }}>
        <div className="accountSectionHeading compact">
          <div>
            <p className="eyebrow wine">TRAZABILIDAD</p>
            <h2>Últimos movimientos</h2>
          </div>
        </div>

        {movements.length === 0 ? (
          <p className="adminIntro">Todavía no hay movimientos registrados. Los próximos ajustes, reservas y liberaciones aparecerán aquí.</p>
        ) : (
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Movimiento</th>
                  <th>Cambio</th>
                  <th>Stock final</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{movement.createdAt.toLocaleString("es-PE")}</td>
                    <td>
                      <strong>{movement.product.name}</strong>
                      <br />
                      <small>{movement.product.sku || "Sin SKU"}</small>
                    </td>
                    <td>{movementLabel(movement.type)}</td>
                    <td>
                      <strong>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</strong>
                    </td>
                    <td>{movement.stockAfter}</td>
                    <td>
                      {movement.order ? `Pedido ${movement.order.number}` : movement.actor ? `${movement.actor.firstName} ${movement.actor.lastName}` : movement.note || "Sistema"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
