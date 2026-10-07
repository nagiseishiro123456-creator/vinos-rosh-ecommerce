import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: "Pendiente de pago",
    PAYMENT_REVIEW: "Pago en revisión",
    PAID: "Pagado",
    PREPARING: "Preparando",
    SHIPPED: "Enviado",
    DELIVERED: "Entregado",
    CANCELLED: "Cancelado",
    REFUNDED: "Reembolsado",
  };
  return labels[status] ?? status;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/mi-cuenta");
  }

  const [user, orders, addressCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        addresses: {
          where: { active: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          take: 3,
          select: {
            id: true,
            label: true,
            addressLine1: true,
            district: true,
            province: true,
            isDefault: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productName: true,
            review: { select: { id: true, status: true } },
          },
        },
      },
    }),
    prisma.address.count({ where: { userId: session.user.id, active: true } }),
  ]);

  if (!user) redirect("/iniciar-sesion");

  const deliveredPendingReview = orders.reduce(
    (count, order) => count + (order.status === "DELIVERED" ? order.items.filter((item) => !item.review).length : 0),
    0,
  );

  return (
    <main className="orderPage">
      <div className="catalogHeaderWrap compact"><StoreHeader /></div>

      <section className="shell accountShell">
        <div className="accountHeading">
          <div>
            <p className="eyebrow wine">MI CUENTA</p>
            <h1>Hola, {user.firstName}</h1>
            <p>{user.email}</p>
          </div>
          <div className="accountHeadingActions">
            <Link className="button buttonGhostLight" href="/mi-cuenta/perfil">Editar perfil</Link>
            {session.user.role === "ADMIN" ? <Link className="button buttonPrimary" href="/admin">Ir al panel admin</Link> : null}
            <SignOutButton />
          </div>
        </div>

        <section className="accountStats">
          <article><span>Pedidos recientes</span><strong>{orders.length}</strong></article>
          <article><span>Direcciones</span><strong>{addressCount}</strong></article>
          <article><span>Reseñas disponibles</span><strong>{deliveredPendingReview}</strong></article>
        </section>

        <div className="accountGrid">
          <section className="adminPanel accountOrdersPanel">
            <div className="accountSectionHeading">
              <div>
                <p className="eyebrow wine">HISTORIAL</p>
                <h2>Mis pedidos</h2>
              </div>
              <Link className="textLink" href="/productos">Seguir comprando</Link>
            </div>

            {orders.length === 0 ? (
              <div className="adminEmptyState compact">
                <strong>Aún no realizaste pedidos.</strong>
                <Link className="button buttonDark" href="/productos">Ver productos</Link>
              </div>
            ) : (
              <div className="accountOrderList">
                {orders.map((order) => (
                  <Link className="accountOrderRow" href={`/pedidos/${order.number}`} key={order.id}>
                    <span>
                      <strong>{order.number}</strong>
                      <small>{order.createdAt.toLocaleDateString("es-PE")} · {order.items.length} producto(s)</small>
                    </span>
                    <span>
                      <strong>{formatPrice(Number(order.total))}</strong>
                      <small>{statusLabel(order.status)}</small>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="adminPanel">
            <div className="accountSectionHeading compact">
              <div>
                <p className="eyebrow wine">DIRECCIONES</p>
                <h2>Entrega</h2>
              </div>
              <Link className="textLink" href="/mi-cuenta/direcciones">Administrar</Link>
            </div>

            {user.addresses.length === 0 ? (
              <p className="accountMuted">Todavía no registraste una dirección. Puedes crearla desde tu cuenta o durante el checkout.</p>
            ) : (
              <div className="accountAddressList">
                {user.addresses.map((address) => (
                  <article key={address.id}>
                    <strong>{address.label || "Dirección"}{address.isDefault ? " · Principal" : ""}</strong>
                    <span>{address.addressLine1}</span>
                    <span>{address.district}, {address.province}</span>
                  </article>
                ))}
              </div>
            )}

            <div className="accountProfileInfo">
              <div className="accountSectionHeading compact">
                <p className="eyebrow wine">PERFIL</p>
                <Link className="textLink" href="/mi-cuenta/perfil">Editar</Link>
              </div>
              <strong>{user.firstName} {user.lastName}</strong>
              <span>{user.email}</span>
              {user.phone ? <span>{user.phone}</span> : <span>Celular no registrado</span>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
