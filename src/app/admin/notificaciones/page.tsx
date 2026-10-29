import Link from "next/link";
import type { Route } from "next";
import { requireAdmin } from "@/modules/admin/auth";
import { listPaymentConfirmations } from "@/modules/notifications/outbox-service";
import { outboxCopy } from "@/modules/notifications/confirmation-contract";
import { readPaymentEmailConfig } from "@/modules/notifications/resend-transport";

export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  const session = await requireAdmin("/admin/notificaciones");
  const jobs = await listPaymentConfirmations(session.user.id);
  const enabled = Boolean(readPaymentEmailConfig(process.env));
  return <main className="shell adminPage notificationsPage"><p className="eyebrow wine">COMUNICACIÓN CON EL COMPRADOR</p><h1>Confirmaciones por correo</h1>
    <p className="adminIntro">Cada pago aprobado guarda un aviso junto con el pedido. Un problema de correo conserva el pago y permite revisar el envío.</p>
    <p className="notificationNotice" role="status">{enabled ? "Envío configurado. Cada aviso requiere una acción y confirmación del administrador." : "Envíos desactivados. Puedes revisar la cola y las vistas previas sin enviar correos."}</p>
    <p><Link className="textLink" href="/admin/notificaciones/configuracion">Revisar configuración del correo →</Link></p>
    <p>Se muestran los últimos 50 avisos. Los pagos históricos anteriores a esta función no generan correos retroactivos.</p>
    {jobs.length === 0 ? <section className="adminCard"><h2>Todavía no hay avisos</h2><p>Al aprobar un pago desde Pagos se guardará aquí su confirmación.</p><Link href="/admin/pagos">Ir a pagos por verificar</Link></section> :
      <div className="notificationList">{jobs.map((job) => <article className="adminCard" key={job.id}><div><h2>{job.orderNumber}</h2><span className={`notificationState notificationState-${job.status.toLowerCase()}`}>{outboxCopy[job.status].label}</span></div><p>{outboxCopy[job.status].message}</p><p>Intentos: {job.attempts}{job.lastErrorCode ? " · Requiere revisar el resultado del envío" : ""}</p><Link className="textLink" href={`/admin/notificaciones/${job.id}` as Route}>Ver aviso y contenido →</Link></article>)}</div>}
    <p className="adminBackLink"><Link href="/admin">Volver al panel</Link></p>
  </main>;
}
