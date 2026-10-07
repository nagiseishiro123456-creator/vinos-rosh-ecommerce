import { OrderStatus, ReviewStatus, UserRole } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin("/admin");

  const [activeProducts, customers, paymentReviewOrders, fulfillmentOrders, pendingReviews, newContacts] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
    prisma.order.count({ where: { status: OrderStatus.PAYMENT_REVIEW } }),
    prisma.order.count({ where: { status: { in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.SHIPPED] } } }),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  const modules = [
    { title: "Productos", description: "Catálogo, precio, imágenes y visibilidad.", href: "/admin/productos" },
    { title: "Categorías", description: "Organización del catálogo y filtros públicos.", href: "/admin/categorias" },
    { title: "Inventario", description: "Stock real y alertas de disponibilidad.", href: "/admin/inventario" },
    { title: "Pedidos", description: "Preparación, envío y confirmación de entrega.", href: "/admin/pedidos" },
    { title: "Clientes", description: "Cuentas registradas, pedidos, direcciones y reseñas.", href: "/admin/clientes" },
    { title: "Pagos", description: "Revisión manual de Yape/transferencias y, luego, Culqi opcional.", href: "/admin/pagos" },
    { title: "Envíos", description: "Tarifas administrables por distrito usadas por el checkout.", href: "/admin/envios" },
    { title: "Reseñas", description: "Moderación de opiniones de compras entregadas y verificadas.", href: "/admin/resenas" },
    { title: "Contactos", description: "Consultas recibidas desde el formulario público sin servicios externos.", href: "/admin/contactos" },
    { title: "Configuración", description: "Yape, transferencia, WhatsApp y datos públicos sin tocar código.", href: "/admin/configuracion" },
    { title: "Lanzamiento", description: "Checklist de producción y bloqueos comerciales o legales pendientes.", href: "/admin/lanzamiento" },
    { title: "Respaldo", description: "Exportación manual de datos comerciales para no depender del hosting gratuito.", href: "/admin/respaldo" },
  ] as const;

  return (
    <main className="shell adminPage">
      <span className="eyebrow wine">ADMINISTRACIÓN</span>
      <h1>Panel Vinos ROSH</h1>
      <p className="adminIntro">
        Sesión administrativa verificada. Los módulos operativos se habilitan de forma incremental sin exponer funciones internas al storefront público.
      </p>

      <div className="adminFreeMode">
        <strong>Modo sin costos activado</strong>
        <span>El desarrollo prioriza herramientas open source y planes gratuitos. Culqi permanece opcional y desactivado hasta que el cliente decida usarlo.</span>
      </div>

      <section className="adminDashboardStats">
        <article><span>Productos visibles</span><strong>{activeProducts}</strong></article>
        <article><span>Clientes</span><strong>{customers}</strong></article>
        <article className={paymentReviewOrders > 0 ? "attention" : ""}><span>Pagos por revisar</span><strong>{paymentReviewOrders}</strong></article>
        <article className={fulfillmentOrders > 0 ? "attention" : ""}><span>Pedidos en proceso</span><strong>{fulfillmentOrders}</strong></article>
        <article className={pendingReviews > 0 ? "attention" : ""}><span>Reseñas pendientes</span><strong>{pendingReviews}</strong></article>
        <article className={newContacts > 0 ? "attention" : ""}><span>Mensajes nuevos</span><strong>{newContacts}</strong></article>
      </section>

      <section className="adminModuleGrid">
        {modules.map((module) => (
          <Link className="adminModuleCard active" href={module.href} key={module.title}>
            <strong>{module.title}</strong>
            <p>{module.description}</p>
            <small>Abrir módulo →</small>
          </Link>
        ))}
      </section>

      <p className="adminBackLink">
        <Link className="button buttonDark" href="/">
          Ver tienda
        </Link>
      </p>
    </main>
  );
}
