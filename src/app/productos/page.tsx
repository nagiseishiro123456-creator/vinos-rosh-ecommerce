import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { getPublicProducts } from "@/modules/products/queries";

export const metadata: Metadata = {
  title: "Productos",
  description: "Catálogo de bebidas de uva sin alcohol de Vinos ROSH.",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getPublicProducts();

  return (
    <main className="catalogPage">
      <div className="catalogHeaderWrap">
        <SiteHeader />
        <div className="catalogHero shell">
          <p className="eyebrow">CATÁLOGO ROSH</p>
          <h1>Productos</h1>
          <p>Explora la colección disponible de bebidas de uva sin alcohol.</p>
        </div>
      </div>

      <section className="storeSection shell">
        {products.length > 0 ? (
          <div className="productGrid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="emptyPanel">
            <strong>El catálogo real todavía no ha sido publicado.</strong>
            <p>El administrador podrá cargar productos, precios, stock e imágenes desde el panel.</p>
            <Link className="button buttonDark" href="/">Volver al inicio</Link>
          </div>
        )}
      </section>

      <WhatsAppFab />
    </main>
  );
}
