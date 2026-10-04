import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { updateInventory } from "@/modules/admin/products/actions";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  await requireAdmin("/admin/inventario");

  const products = await prisma.product.findMany({
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      active: true,
    },
  });

  const outOfStock = products.filter((product) => product.stock === 0).length;
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);

  return (
    <main className="shell adminPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">OPERACIONES</p>
          <h1>Inventario</h1>
          <p className="adminIntro">Actualiza existencias reales y detecta productos con stock bajo.</p>
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
    </main>
  );
}
