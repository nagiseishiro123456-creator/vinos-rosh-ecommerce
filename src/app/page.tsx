import { BadgeCheck, Grape, HeartHandshake, Leaf, ShieldCheck, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { siteConfig } from "@/lib/site";
import { getFeaturedProducts } from "@/modules/products/queries";
import { getFeaturedVerifiedReviews } from "@/modules/reviews/queries";
import { getCommerceSettings } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, commerce, verifiedReviews] = await Promise.all([
    getFeaturedProducts(),
    getCommerceSettings(),
    getFeaturedVerifiedReviews(3),
  ]);
  const showDemoCatalog = process.env.SHOW_DEMO_CATALOG === "true";

  return (
    <main>
      <section className="homeHero" id="inicio">
        <Image
          className="homeHeroImage"
          src={`${siteConfig.prototypeAssetsBase}/hero.jpg`}
          alt="Viñedo de Vinos ROSH al atardecer"
          fill
          priority
          sizes="100vw"
        />
        <div className="homeHeroOverlay" aria-hidden="true" />
        <StoreHeader />

        <div className="heroCopy shell">
          <p className="eyebrow">PRODUCCIÓN PROPIA · SIN ALCOHOL</p>
          <h1>De nuestro viñedo a tu mesa.</h1>
          <p className="heroLead">
            Una experiencia de uva elaborada con dedicación familiar, cuidando el origen,
            el proceso y cada detalle de la presentación.
          </p>
          <div className="heroActions">
            <a className="button buttonPrimary" href="#productos">
              Ver productos
            </a>
            <a className="button buttonGhost" href="#historia">
              Nuestra historia
            </a>
          </div>
        </div>

        <div className="heroScrollHint">Descubre ROSH <span>↓</span></div>
      </section>

      <section className="benefitStrip shell" aria-label="Beneficios principales">
        <article>
          <span className="benefitIcon"><Grape size={22} /></span>
          <div><strong>Producción propia</strong><small>Origen cuidado desde la uva</small></div>
        </article>
        <article>
          <span className="benefitIcon"><Leaf size={22} /></span>
          <div><strong>Sin alcohol</strong><small>Experiencia de uva para compartir</small></div>
        </article>
        <article>
          <span className="benefitIcon"><Truck size={22} /></span>
          <div><strong>Envíos por distrito</strong><small>Costo calculado antes de pagar</small></div>
        </article>
        <article>
          <span className="benefitIcon"><ShieldCheck size={22} /></span>
          <div><strong>Compra controlada</strong><small>Yape o transferencia con revisión</small></div>
        </article>
      </section>

      <section className="brandPromiseSection shell" aria-labelledby="promesa-rosh">
        <div className="brandPromiseIntro">
          <p className="eyebrow wine">LA EXPERIENCIA ROSH</p>
          <h2 id="promesa-rosh">Una compra cuidada desde el origen hasta la entrega.</h2>
          <p>
            La tienda está diseñada para mostrar información clara, conservar la trazabilidad
            del producto y acompañar cada pedido sin perder el carácter familiar de la marca.
          </p>
        </div>

        <div className="brandPromiseGrid">
          <article>
            <span><Sparkles size={20} aria-hidden="true" /></span>
            <strong>Origen cuidado</strong>
            <p>Producción propia y una historia ligada al cultivo de la uva.</p>
          </article>
          <article>
            <span><Leaf size={20} aria-hidden="true" /></span>
            <strong>Sin alcohol</strong>
            <p>Una propuesta de uva pensada para compartir y disfrutar.</p>
          </article>
          <article>
            <span><ShieldCheck size={20} aria-hidden="true" /></span>
            <strong>Compra transparente</strong>
            <p>Stock, envío y estado del pedido visibles antes y después de comprar.</p>
          </article>
          <article>
            <span><BadgeCheck size={20} aria-hidden="true" /></span>
            <strong>Opiniones verificadas</strong>
            <p>Las reseñas públicas nacen únicamente de pedidos realmente entregados.</p>
          </article>
        </div>
      </section>

      <section className="storeSection shell" id="productos">
        <div className="sectionHeading">
          <div>
            <p className="eyebrow wine">COLECCIÓN ROSH</p>
            <h2>Una selección nacida del viñedo.</h2>
          </div>
          {products.length > 0 ? (
            <Link className="textLink" href="/productos">Ver catálogo completo →</Link>
          ) : null}
        </div>

        {products.length > 0 ? (
          <div className="productGrid">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <div className="catalogPlaceholder">
            <div className="catalogPlaceholderImage">
              <Image
                src={`${siteConfig.prototypeAssetsBase}/products.jpg`}
                alt="Presentación visual de productos ROSH"
                fill
                sizes="(max-width: 800px) 92vw, 50vw"
              />
            </div>
            <div className="catalogPlaceholderCopy">
              <span className="statusDot" />
              <p className="eyebrow wine">CATÁLOGO EN CONFIGURACIÓN</p>
              <h3>La estructura comercial ya está lista.</h3>
              <p>
                Los productos, precios y stock reales se publicarán desde el panel administrativo.
                Así evitamos dejar datos demostrativos en producción.
              </p>
              {showDemoCatalog ? (
                <div className="demoNotice">
                  Modo desarrollo activo: el catálogo real se cargará en PostgreSQL desde administración.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <section className="storySection" id="historia">
        <div className="storyGrid shell">
          <div className="storyImages">
            <div className="storyImageLarge">
              <Image
                src={`${siteConfig.prototypeAssetsBase}/story.jpg`}
                alt="Uvas y viñedo de la historia ROSH"
                fill
                sizes="(max-width: 800px) 92vw, 48vw"
              />
            </div>
            <div className="storySeal">
              <span>ROSH</span>
              <small>Origen · Familia · Propósito</small>
            </div>
          </div>

          <div className="storyCopy">
            <p className="eyebrow wine">NUESTRA HISTORIA</p>
            <h2>Mucho más que un producto.</h2>
            <p>
              Vinos ROSH nace de una historia familiar vinculada a Víctor Rosh, al esfuerzo,
              al colportaje y a una pasión que fue tomando forma alrededor del cultivo de la uva.
            </p>
            <p>
              Esta sección se conectará con el relato definitivo validado por la familia para
              conservar una comunicación auténtica y coherente con el origen de la marca.
            </p>
            <Link className="button buttonDark" href="/nuestra-historia">Conocer más</Link>
          </div>
        </div>
      </section>


      <section className="homeCtaSection">
        <div className="homeCtaBackdrop" aria-hidden="true" />
        <div className="homeCtaInner shell">
          <div className="homeCtaIcon" aria-hidden="true">
            <HeartHandshake size={28} />
          </div>
          <div>
            <p className="eyebrow">DE LA FAMILIA A TU MESA</p>
            <h2>Conoce la propuesta ROSH y acompaña su siguiente etapa.</h2>
            <p>
              Estamos preparando el catálogo definitivo con fotografías, precios y stock reales.
              La experiencia de compra ya está lista para crecer con la marca.
            </p>
          </div>
          <div className="homeCtaActions">
            <Link className="button buttonLight" href="/productos">Explorar catálogo</Link>
            <Link className="button buttonGhost" href="/mi-cuenta">Mi cuenta</Link>
          </div>
        </div>
      </section>

      <section className="reviewsSection shell">
        <div className="sectionHeading centered">
          <div>
            <p className="eyebrow wine">COMPRA VERIFICADA</p>
            <h2>Opiniones reales, no inventadas.</h2>
            <p>
              Las reseñas solo se habilitarán después de una compra entregada. Cada valoración
              estará vinculada a un pedido real.
            </p>
          </div>
        </div>
        {verifiedReviews.length > 0 ? (
          <div className="verifiedReviewGrid">
            {verifiedReviews.map((review) => (
              <article className="verifiedReviewCard" key={review.id}>
                <div className="stars" aria-label={`${review.rating} de 5 estrellas`}>
                  {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                </div>
                <blockquote>“{review.comment}”</blockquote>
                <div>
                  <strong>{review.user.firstName}</strong>
                  <span>Compra verificada · {review.product.name}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="reviewEmptyState">
            <div className="stars" aria-hidden="true">★★★★★</div>
            <strong>Aquí aparecerán las primeras reseñas verificadas.</strong>
            <span>El sistema ya está preparado para calificaciones de 1 a 5 estrellas.</span>
          </div>
        )}
      </section>

      <footer className="siteFooter" id="contacto">
        <div className="footerGrid shell">
          <div>
            <div className="footerBrand">VINOS <strong>ROSH</strong></div>
            <p>Bebidas de uva sin alcohol de producción propia.</p>
          </div>
          <div>
            <strong>Navegación</strong>
            <a href="#productos">Productos</a>
            <a href="#historia">Nuestra historia</a>
            <Link href="/mi-cuenta">Mi cuenta</Link>
            <Link href="/preguntas-frecuentes">Preguntas frecuentes</Link>
          </div>
          <div>
            <strong>Atención</strong>
            {commerce.contactEmail ? <a href={`mailto:${commerce.contactEmail}`}>{commerce.contactEmail}</a> : <span>Correo pendiente de configurar</span>}
            {commerce.whatsappPhone ? <span>WhatsApp disponible</span> : <span>WhatsApp pendiente de configurar</span>}
            <Link href="/contacto">Formulario de contacto</Link>
            <span>Envíos según cobertura activa</span>
          </div>
          <div>
            <strong>Legal</strong>
            <span>Términos y condiciones · pendiente de validación</span>
            <span>Privacidad · pendiente de validación</span>
            <span>Libro de Reclamaciones · pendiente de implementación legal</span>
          </div>
        </div>
        <div className="footerBottom shell">© 2026 Vinos ROSH · E-commerce en preparación</div>
      </footer>

      <WhatsAppFab />
    </main>
  );
}
