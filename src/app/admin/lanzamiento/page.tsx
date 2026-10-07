import type { Route } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { runMaintenanceFromAdmin } from "@/modules/admin/maintenance/actions";
import { getManualPaymentHoldMinutes } from "@/modules/orders/hold";
import { getCommerceSettings } from "@/modules/settings/queries";

export const dynamic = "force-dynamic";

type Check = {
  title: string;
  description: string;
  ready: boolean;
  href?: Route;
  blocking?: boolean;
};

export default async function LaunchReadinessPage() {
  await requireAdmin("/admin/lanzamiento");

  const [activeProducts, inStockProducts, shippingZones, settings] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.count({ where: { active: true, stock: { gt: 0 } } }),
    prisma.shippingZone.count({ where: { active: true } }),
    getCommerceSettings(),
  ]);

  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  const productionUrlReady = publicUrl.startsWith("https://") && !publicUrl.includes("localhost");
  const paymentReady = settings.yape.ready || settings.transfer.ready;
  const holdMinutes = getManualPaymentHoldMinutes();

  const checks: Check[] = [
    {
      title: "Catálogo publicado",
      description: `${activeProducts} producto(s) visible(s); ${inStockProducts} con stock disponible.`,
      ready: activeProducts > 0 && inStockProducts > 0,
      href: "/admin/productos",
      blocking: true,
    },
    {
      title: "Cobertura de envío",
      description: `${shippingZones} zona(s) activa(s) con tarifa configurada.`,
      ready: shippingZones > 0,
      href: "/admin/envios",
      blocking: true,
    },
    {
      title: "Medio de pago operativo",
      description: paymentReady
        ? "Existe al menos un medio manual listo para el checkout."
        : "Configura Yape o transferencia antes de recibir pedidos.",
      ready: paymentReady,
      href: "/admin/configuracion",
      blocking: true,
    },
    {
      title: "Canal de atención",
      description: settings.whatsappPhone
        ? "WhatsApp público configurado."
        : "Falta configurar un número de WhatsApp para atención y consultas.",
      ready: Boolean(settings.whatsappPhone),
      href: "/admin/configuracion",
      blocking: true,
    },
    {
      title: "Correo comercial",
      description: settings.contactEmail
        ? "Correo público configurado."
        : "Conviene registrar un correo comercial antes del lanzamiento.",
      ready: Boolean(settings.contactEmail),
      href: "/admin/configuracion",
    },
    {
      title: "URL HTTPS de producción",
      description: productionUrlReady
        ? publicUrl
        : "NEXT_PUBLIC_APP_URL todavía no apunta a una URL HTTPS pública de producción.",
      ready: productionUrlReady,
      blocking: true,
    },
    {
      title: "Boleta / factura electrónica",
      description: "Pendiente confirmar cómo el negocio emitirá los comprobantes electrónicos y quién será responsable del flujo SUNAT.",
      ready: false,
      blocking: true,
    },
    {
      title: "Textos legales y Libro de Reclamaciones",
      description: "Pendiente validar con el responsable adulto del negocio los datos legales, privacidad, términos y mecanismo oficial de reclamaciones antes de publicar.",
      ready: false,
      blocking: true,
    },
    {
      title: "Clasificación comercial del producto",
      description: "Pendiente validar la denominación comercial/legal definitiva de la bebida sin alcohol antes de fijar etiquetas y afirmaciones públicas.",
      ready: false,
      blocking: true,
    },
  ];

  const readyCount = checks.filter((check) => check.ready).length;
  const blockingPending = checks.filter((check) => check.blocking && !check.ready).length;
  const progress = Math.round((readyCount / checks.length) * 100);

  return (
    <main className="shell adminPage launchReadinessPage">
      <div className="adminTopbar">
        <div>
          <p className="eyebrow wine">PREPRODUCCIÓN</p>
          <h1>Preparación para lanzamiento</h1>
          <p className="adminIntro">
            Esta pantalla separa lo que el software ya puede comprobar de las decisiones comerciales o legales que todavía requieren datos reales del negocio.
          </p>
        </div>
        <div className="adminTopbarActions">
          <Link className="button buttonGhostLight" href="/admin">← Panel</Link>
        </div>
      </div>

      <section className="launchSummary">
        <div>
          <span>Avance verificable</span>
          <strong>{progress}%</strong>
        </div>
        <div>
          <span>Listos</span>
          <strong>{readyCount}/{checks.length}</strong>
        </div>
        <div className={blockingPending > 0 ? "attention" : ""}>
          <span>Bloqueos de lanzamiento</span>
          <strong>{blockingPending}</strong>
        </div>
      </section>

      <div className="launchProgress" aria-label={`Preparación ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <section className="adminCard">
        <p className="eyebrow wine">MANTENIMIENTO</p>
        <h2>Reservas de pago manual</h2>
        <p>
          Los pedidos en revisión reservan stock durante {holdMinutes} minutos. Puedes ejecutar el mantenimiento sin servicios externos ni cron de pago para liberar reservas vencidas, tokens expirados y límites antiguos.
        </p>
        <form action={runMaintenanceFromAdmin}>
          <button className="button buttonPrimary" type="submit">
            Ejecutar mantenimiento ahora
          </button>
        </form>
      </section>

      <section className="launchChecklist">
        {checks.map((check) => (
          <article className={`launchCheck ${check.ready ? "ready" : "pending"}`} key={check.title}>
            <div className="launchCheckIcon" aria-hidden="true">{check.ready ? "✓" : "!"}</div>
            <div>
              <div className="launchCheckTitleRow">
                <strong>{check.title}</strong>
                {check.blocking && !check.ready ? <span>Bloquea producción</span> : null}
              </div>
              <p>{check.description}</p>
              {check.href ? <Link href={check.href}>Resolver / revisar →</Link> : null}
            </div>
          </article>
        ))}
      </section>

      <div className="launchNotice">
        <strong>No se publicará automáticamente.</strong>
        <span>
          Que el código compile no significa que el negocio esté listo para operar. Los puntos comerciales, legales y de comprobantes se mantendrán visibles hasta que el cliente entregue información definitiva.
        </span>
      </div>
    </main>
  );
}
