import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site";
import { removeCartItem, updateCartItem } from "@/modules/cart/actions";

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/carrito");
  }

  const cart = await prisma.cart.findUnique({
    where: { userId: session.user.id },
    select: {
      items: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          quantity: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              stock: true,
              active: true,
              images: {
                orderBy: { position: "asc" },
                take: 1,
                select: { url: true, alt: true },
              },
            },
          },
        },
      },
    },
  });

  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const hasInvalidItems = items.some(
    (item) => !item.product.active || item.product.stock < item.quantity,
  );

  return (
    <main className="cartPage">
      <div className="catalogHeaderWrap compact">
        <StoreHeader />
      </div>

      <section className="cartLayout shell">
        <div className="cartMain">
          <p className="eyebrow wine">TU COMPRA</p>
          <h1>Carrito</h1>

          {items.length === 0 ? (
            <div className="emptyPanel">
              <strong>Tu carrito está vacío.</strong>
              <p>Explora el catálogo y agrega los productos que quieras revisar antes de comprar.</p>
              <Link className="button buttonDark" href="/productos">Ver productos</Link>
            </div>
          ) : (
            <div className="cartItems">
              {items.map((item) => {
                const image = item.product.images[0];
                const updateAction = updateCartItem.bind(null, item.id);
                const removeAction = removeCartItem.bind(null, item.id);
                const lineTotal = Number(item.product.price) * item.quantity;

                return (
                  <article className="cartItem" key={item.id}>
                    <Link className="cartItemImage" href={`/productos/${item.product.slug}`}>
                      <Image
                        src={image?.url ?? `${siteConfig.prototypeAssetsBase}/products.jpg`}
                        alt={image?.alt ?? item.product.name}
                        fill
                        sizes="110px"
                      />
                    </Link>

                    <div className="cartItemInfo">
                      <Link href={`/productos/${item.product.slug}`}><strong>{item.product.name}</strong></Link>
                      <span>{formatPrice(Number(item.product.price))} c/u</span>
                      {!item.product.active || item.product.stock <= 0 ? (
                        <small className="cartWarning">Este producto ya no está disponible.</small>
                      ) : item.quantity > item.product.stock ? (
                        <small className="cartWarning">Solo quedan {item.product.stock} unidades disponibles.</small>
                      ) : null}
                    </div>

                    <form className="quantityForm" action={updateAction}>
                      <label htmlFor={`qty-${item.id}`}>Cantidad</label>
                      <div>
                        <input
                          id={`qty-${item.id}`}
                          name="quantity"
                          type="number"
                          min={1}
                          max={Math.max(1, item.product.stock)}
                          defaultValue={item.quantity}
                        />
                        <button type="submit">Actualizar</button>
                      </div>
                    </form>

                    <div className="cartItemTotal">
                      <strong>{formatPrice(lineTotal)}</strong>
                      <form action={removeAction}>
                        <button className="removeButton" type="submit">Eliminar</button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="cartSummary">
          <p className="eyebrow wine">RESUMEN</p>
          <div className="summaryRow"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
          <div className="summaryRow"><span>Envío</span><span>Se calcula por distrito</span></div>
          <div className="summaryTotal"><span>Total parcial</span><strong>{formatPrice(subtotal)}</strong></div>
          <p className="summaryNote">El costo de envío se confirmará antes del pago.</p>

          {items.length > 0 && !hasInvalidItems ? (
            <Link className="button buttonPrimary fullButton" href="/checkout">
              Continuar al checkout
            </Link>
          ) : (
            <button className="button buttonDisabled fullButton" type="button" disabled>
              {items.length === 0 ? "Agrega productos para continuar" : "Corrige el stock para continuar"}
            </button>
          )}
        </aside>
      </section>
    </main>
  );
}
