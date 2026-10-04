import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { getPublicCategories, getPublicProducts, type CatalogFilters } from "@/modules/products/queries";

export const metadata: Metadata = {
  title: "Productos",
  description: "Catálogo de bebidas de uva sin alcohol de Vinos ROSH.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    stock?: string;
    orden?: string;
  }>;
};

function parseSort(value?: string): CatalogFilters["sort"] {
  if (value === "newest" || value === "price-asc" || value === "price-desc") return value;
  return "featured";
}

function categoryHref(slug: string | null, params: { q?: string; stock?: string; orden?: string }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (slug) search.set("categoria", slug);
  if (params.stock === "1") search.set("stock", "1");
  if (params.orden && params.orden !== "featured") search.set("orden", params.orden);
  const query = search.toString();
  return query ? `/productos?${query}` : "/productos";
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: CatalogFilters = {
    query: params.q,
    category: params.categoria,
    inStock: params.stock === "1",
    sort: parseSort(params.orden),
  };

  const [products, categories] = await Promise.all([
    getPublicProducts(filters),
    getPublicCategories(),
  ]);

  const hasFilters = Boolean(params.q || params.categoria || params.stock === "1" || (params.orden && params.orden !== "featured"));

  return (
    <main className="catalogPage">
      <div className="catalogHeaderWrap">
        <StoreHeader />
        <div className="catalogHero shell">
          <p className="eyebrow">CATÁLOGO ROSH</p>
          <h1>Productos</h1>
          <p>Explora la colección disponible de bebidas de uva sin alcohol.</p>
        </div>
      </div>

      <section className="storeSection shell">
        <div className="catalogTools">
          <form className="catalogFilterForm" method="get">
            <label className="catalogSearchField">
              <span>Buscar</span>
              <input name="q" type="search" maxLength={80} defaultValue={params.q ?? ""} placeholder="Nombre, descripción o SKU" />
            </label>

            <label className="catalogSelectField">
              <span>Ordenar</span>
              <select name="orden" defaultValue={filters.sort}>
                <option value="featured">Destacados</option>
                <option value="newest">Más recientes</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
              </select>
            </label>

            {params.categoria ? <input type="hidden" name="categoria" value={params.categoria} /> : null}

            <label className="catalogStockToggle">
              <input type="checkbox" name="stock" value="1" defaultChecked={params.stock === "1"} />
              <span>Solo disponibles</span>
            </label>

            <button className="button buttonDark" type="submit">Aplicar</button>
            {hasFilters ? <Link className="button buttonGhostLight" href="/productos">Limpiar</Link> : null}
          </form>

          {categories.length > 0 ? (
            <nav className="catalogCategoryBar" aria-label="Categorías de productos">
              <a className={!params.categoria ? "active" : ""} href={categoryHref(null, params)}>Todos</a>
              {categories.map((category) => (
                <a
                  className={params.categoria === category.slug ? "active" : ""}
                  href={categoryHref(category.slug, params)}
                  key={category.id}
                >
                  {category.name} <small>{category.productCount}</small>
                </a>
              ))}
            </nav>
          ) : null}

          <div className="catalogResultsMeta">
            <strong>{products.length} resultado{products.length === 1 ? "" : "s"}</strong>
            {params.q ? <span>para “{params.q.slice(0, 80)}”</span> : null}
          </div>
        </div>

        {products.length > 0 ? (
          <div className="productGrid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="emptyPanel">
            <strong>{hasFilters ? "No encontramos productos con esos filtros." : "El catálogo real todavía no ha sido publicado."}</strong>
            <p>{hasFilters ? "Prueba otra búsqueda o limpia los filtros del catálogo." : "El administrador podrá cargar productos, precios, stock e imágenes desde el panel."}</p>
            <Link className="button buttonDark" href={hasFilters ? "/productos" : "/"}>{hasFilters ? "Limpiar filtros" : "Volver al inicio"}</Link>
          </div>
        )}
      </section>

      <WhatsAppFab />
    </main>
  );
}
