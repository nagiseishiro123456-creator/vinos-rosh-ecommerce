import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { setProductActive } from "@/modules/admin/products/actions";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdmin("/admin/productos");

  const products = await prisma.product.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      stock: true,
      active: true,
      featured: true,
      category: { select: { name: true } },
    },
  });

  const activeCount = products.filter((product) => product.active).length;
  const lowStockCount = products.filter((product) => product.active && product.stock <= 5).length;

  return (
    <main className="shell adminPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">CATÁLOGO</p>
          <h1>Productos</h1>
          <p className="adminIntro">Administra el catálogo real sin modificar código.</p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin">Panel</Link>
          <Link className="button buttonPrimary" href="/admin/productos/nuevo">Nuevo producto</Link>
        </div>
      </div>

      <section className="adminStatsGrid">
        <article><span>Total</span><strong>{products.length}</strong></article>
        <article><span>Visibles</span><strong>{activeCount}</strong></article>
        <article><span>Stock bajo (≤ 5)</span><strong>{lowStockCount}</strong></article>
      </section>

      {products.length === 0 ? (
        <section className="adminEmptyState">
          <strong>No hay productos cargados.</strong>
          <p>Crea el primer producto real de Vinos ROSH. No usaremos productos ficticios en producción.</p>
          <Link className="button buttonPrimary" href="/admin/productos/nuevo">Crear primer producto</Link>
        </section>
      ) : (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const toggleAction = setProductActive.bind(null, product.id, !product.active);
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <small>{product.sku || product.slug}</small>
                    </td>
                    <td>{product.category?.name ?? "Sin categoría"}</td>
                    <td>{formatPrice(Number(product.price))}</td>
                    <td>
                      <span className={product.stock <= 5 ? "adminStock low" : "adminStock"}>{product.stock}</span>
                    </td>
                    <td>
                      <span className={product.active ? "adminBadge success" : "adminBadge muted"}>
                        {product.active ? "Visible" : "Oculto"}
                      </span>
                      {product.featured ? <span className="adminBadge gold">Destacado</span> : null}
                    </td>
                    <td>
                      <div className="adminRowActions">
                        <Link className="adminTextButton" href={`/admin/productos/${product.id}`}>Editar</Link>
                        <form action={toggleAction}>
                          <button className="adminTextButton" type="submit">
                            {product.active ? "Ocultar" : "Publicar"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
