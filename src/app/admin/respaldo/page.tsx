import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  await requireAdmin("/admin/respaldo");

  const [
    products,
    orders,
    customers,
    contacts,
    reviews,
    zones,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.contactMessage.count(),
    prisma.review.count(),
    prisma.shippingZone.count(),
  ]);

  return (
    <main className="shell adminPage backupPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">PORTABILIDAD</p>
          <h1>Respaldo de datos</h1>
          <p className="adminIntro">
            Exporta la información comercial en JSON para conservar una copia independiente del hosting.
          </p>
        </div>
        <Link className="button buttonGhostLight" href="/admin">← Panel</Link>
      </div>

      <section className="backupSummaryGrid">
        <article><span>Productos</span><strong>{products}</strong></article>
        <article><span>Pedidos</span><strong>{orders}</strong></article>
        <article><span>Clientes</span><strong>{customers}</strong></article>
        <article><span>Contactos</span><strong>{contacts}</strong></article>
        <article><span>Reseñas</span><strong>{reviews}</strong></article>
        <article><span>Zonas de envío</span><strong>{zones}</strong></article>
      </section>

      <section className="backupCard">
        <div>
          <p className="eyebrow wine">COPIA MANUAL</p>
          <h2>Descargar datos del negocio</h2>
          <p>
            El archivo incluye catálogo, imágenes referenciadas, zonas, pedidos, pagos,
            reseñas, movimientos de inventario, configuración pública y mensajes de contacto.
          </p>
          <p>
            Por seguridad no exportamos contraseñas, tokens de recuperación, límites de acceso
            ni secretos del servidor.
          </p>
        </div>

        <a className="button buttonPrimary" href="/api/admin/backup">
          Descargar respaldo JSON
        </a>
      </section>

      <section className="backupWarning">
        <strong>Importante para el preview gratuito</strong>
        <p>
          Este respaldo es una copia de los datos comerciales de la aplicación. No sustituye
          un backup completo de PostgreSQL, pero permite conservar la información esencial si
          el entorno gratuito se reinicia o se reemplaza.
        </p>
      </section>
    </main>
  );
}
