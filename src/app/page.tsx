import { Grape, Leaf, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { siteConfig } from "@/lib/site";
import { getFeaturedProducts } from "@/modules/products/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getFeaturedProducts();
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
        <SiteHeader />

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
          <div><strong>Compra segura</strong><small>Pago automático o validación manual</small></div>
        </article>
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
            <Link className="button buttonDark" href="/#contacto">Conocer más</Link>
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
        <div className="reviewEmptyState">
          <div className="stars" aria-hidden="true">★★★★★</div>
          <strong>Aquí aparecerán las primeras reseñas verificadas.</strong>
          <span>El sistema ya está preparado para calificaciones de 1 a 5 estrellas.</span>
        </div>
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
          </div>
          <div>
            <strong>Atención</strong>
            <span>WhatsApp configurable</span>
            <span>Envíos según cobertura</span>
            <span>Pagos seguros</span>
          </div>
          <div>
            <strong>Legal</strong>
            <span>Términos y condiciones · pendiente</span>
            <span>Privacidad · pendiente</span>
            <span>Libro de Reclamaciones · pendiente</span>
          </div>
        </div>
        <div className="footerBottom shell">© 2026 Vinos ROSH · E-commerce en construcción</div>
      </footer>

      <WhatsAppFab />
    </main>
  );
}
