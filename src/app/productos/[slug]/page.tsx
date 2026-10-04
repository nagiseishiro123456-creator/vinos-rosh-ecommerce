import { BadgeCheck, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { siteConfig } from "@/lib/site";
import { addToCart } from "@/modules/cart/actions";
import { getProductBySlug } from "@/modules/products/queries";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatReviewDate(value: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Producto no encontrado" };

  return {
    title: product.name,
    description: product.shortDescription ?? product.description.slice(0, 150),
  };
}

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const imageUrl =
    product.images[0]?.url ?? `${siteConfig.prototypeAssetsBase}/products.jpg`;
  const addAction = addToCart.bind(null, product.id, product.slug);

  return (
    <main className="productPage">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <div className="productDetail shell">
        <div className="productGallery">
          <div className="productMainImage">
            <Image
              src={imageUrl}
              alt={product.images[0]?.alt ?? product.name}
              fill
              priority
              sizes="(max-width: 850px) 92vw, 50vw"
            />
          </div>
        </div>

        <section className="productInfo">
          <Link className="backLink" href="/productos">← Volver al catálogo</Link>
          <p className="eyebrow wine">PRODUCTO ROSH</p>
          <h1>{product.name}</h1>

          <div className="productRating detailRating">
            <Star size={16} fill="currentColor" />
            <span>{product.rating ? product.rating.toFixed(1) : "Nuevo"}</span>
            {product.reviewCount > 0 ? <small>({product.reviewCount} reseñas verificadas)</small> : null}
          </div>

          <strong className="productPrice">{formatPrice(product.price)}</strong>
          <p className="productShortCopy">
            {product.shortDescription ?? "Bebida de uva sin alcohol de producción propia."}
          </p>
          <div className="productDescription">{product.description}</div>

          <div className={`stockLine${product.stock > 0 ? " inStock" : " outOfStock"}`}>
            <span />
            {product.stock > 0 ? `${product.stock} unidades disponibles` : "Producto agotado"}
          </div>

          {product.stock > 0 ? (
            <form action={addAction}>
              <button className="button buttonDark productAddButton" type="submit">
                Agregar al carrito
              </button>
            </form>
          ) : (
            <button className="button buttonDisabled productAddButton" type="button" disabled>
              Sin stock
            </button>
          )}

          <div className="productTrust">
            <span>✓ Producto sin alcohol</span>
            <span>✓ Stock verificado antes de comprar</span>
            <span>✓ Envío calculado antes del pago</span>
          </div>
        </section>
      </div>

      <section className="productReviewsSection shell" id="resenas">
        <div className="productReviewsHeading">
          <div>
            <p className="eyebrow wine">OPINIONES REALES</p>
            <h2>Reseñas verificadas</h2>
          </div>
          <div className="productReviewsScore">
            <Star size={21} fill="currentColor" />
            <strong>{product.rating ? product.rating.toFixed(1) : "—"}</strong>
            <span>{product.reviewCount} reseña(s)</span>
          </div>
        </div>

        {product.publicReviews.length === 0 ? (
          <div className="reviewEmptyState">
            <span className="stars">★★★★★</span>
            <strong>Aún no hay reseñas publicadas.</strong>
            <span>Solo clientes con una compra entregada pueden dejar una opinión.</span>
          </div>
        ) : (
          <div className="publicReviewGrid">
            {product.publicReviews.map((review) => (
              <article className="publicReviewCard" key={review.id}>
                <div className="publicReviewTop">
                  <span className="stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  <span className="verifiedPurchase"><BadgeCheck size={15} /> Compra verificada</span>
                </div>
                <p>{review.comment || "El cliente dejó una valoración sin comentario."}</p>
                <footer>
                  <strong>{review.firstName}</strong>
                  <span>{formatReviewDate(review.createdAt)}</span>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>

      <WhatsAppFab />
    </main>
  );
}
