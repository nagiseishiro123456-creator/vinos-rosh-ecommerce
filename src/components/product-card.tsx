import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { PublicProductCard } from "@/modules/products/queries";

const FALLBACK_IMAGE =
  "https://nagiseishiro123456-creator.github.io/vinos-rosh-prototype/assets/products.jpg";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export function ProductCard({ product }: { product: PublicProductCard }) {
  return (
    <article className="productCard">
      <Link className="productImageWrap" href={`/productos/${product.slug}`}>
        <Image
          className="productImage"
          src={product.imageUrl ?? FALLBACK_IMAGE}
          alt={product.name}
          fill
          sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 360px"
        />
        {product.stock <= 0 ? <span className="stockBadge">Agotado</span> : null}
      </Link>

      <div className="productCardBody">
        <div className="productRating" aria-label={product.rating ? `${product.rating.toFixed(1)} de 5 estrellas` : "Sin reseñas"}>
          <Star size={15} fill="currentColor" />
          <span>{product.rating ? product.rating.toFixed(1) : "Nuevo"}</span>
          {product.reviewCount > 0 ? <small>({product.reviewCount})</small> : null}
        </div>

        <Link href={`/productos/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>

        <p>{product.shortDescription ?? "Bebida de uva sin alcohol de producción propia."}</p>

        <div className="productCardFooter">
          <strong>{formatPrice(product.price)}</strong>
          <Link className="textLink" href={`/productos/${product.slug}`}>
            Ver producto
          </Link>
        </div>
      </div>
    </article>
  );
}
