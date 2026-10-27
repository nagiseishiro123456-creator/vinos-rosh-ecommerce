import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { PaymentConfirmationPreview } from "@/components/payment-confirmation-preview";
import { requireAdmin } from "@/modules/admin/auth";
import { readPaymentConfirmation } from "@/modules/notifications/outbox-service";
import { outboxCopy } from "@/modules/notifications/confirmation-contract";
import { readPaymentEmailConfig } from "@/modules/notifications/resend-transport";
import { processConfirmation } from "../actions";

export const dynamic = "force-dynamic";
const feedback: Record<string, string> = {
  SENT: "El proveedor aceptó el correo. La recepción en la bandeja aún no está verificada.",
  RETRY: "El envío quedó pendiente. El pago sigue confirmado; revisa la próxima fecha antes de reintentar.",
  REVIEW: "El aviso requiere revisión. No se enviará otra vez de forma automática.",
  CANCELLED: "El aviso se detuvo porque el pedido cambió de estado.", DISABLED: "El envío está desactivado o su configuración está incompleta.",
  BUSY: "Ya hay un intento en curso. Espera antes de consultar de nuevo.", WAIT: "Todavía no llega la fecha del siguiente intento.",
  UNCHANGED: "El aviso ya cambió. Se muestra el estado actual.", LIMITED: "Espera un minuto antes de realizar más intentos.",
  UNAVAILABLE: "No pudimos verificar el resultado. El aviso conserva su identidad para recuperarlo con seguridad.",
  FORBIDDEN: "Tu cuenta ya no tiene permisos de administración.",
};
const date = (value: Date) => value.toLocaleString("es-PE", { timeZone: "America/Lima", hour12: false });
export default async function NotificationDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }> }) {
  const session = await requireAdmin("/admin/notificaciones");
  const { id } = await params; const { result } = await searchParams;
  const job = await readPaymentConfirmation(session.user.id, id); if (!job) notFound();
  const enabled = Boolean(readPaymentEmailConfig(process.env));
  const actionable = ["QUEUED", "RETRY", "PROCESSING"].includes(job.status);
  return <main className="shell adminPage notificationsPage"><p className="eyebrow wine">AVISO DEL PEDIDO</p><h1>{job.payload.orderNumber}</h1>
    {result && feedback[result] ? <p role="status" className="notificationNotice">{feedback[result]}</p> : null}
    <div className="notificationDetailGrid"><section className="adminCard"><h2>Estado del aviso</h2><span className={`notificationState notificationState-${job.status.toLowerCase()}`}>{outboxCopy[job.status].label}</span><p>{outboxCopy[job.status].message}</p>
      <dl className="notificationFacts"><div><dt>Destinatario</dt><dd>{job.recipient}</dd></div><div><dt>Intentos</dt><dd>{job.attempts}</dd></div>
        {job.status === "RETRY" ? <div><dt>Próximo intento desde</dt><dd>{date(job.nextAttemptAt)} · Perú</dd></div> : null}
        {job.acceptedAt ? <div><dt>Aceptado por el proveedor</dt><dd>{date(job.acceptedAt)} · Perú</dd></div> : null}</dl>
      {!enabled ? <p className="notificationNotice">Envíos desactivados. Esta vista no envía correos.</p> : null}
      {actionable && enabled ? <form action={processConfirmation.bind(null, id)} className="notificationDispatch"><label><input type="checkbox" name="confirm" value="yes" required /> Confirmo el envío de este aviso al destinatario indicado.</label><button className="button buttonDark" type="submit">Procesar este aviso</button></form> : null}
      <p>Actualizar o abrir la vista previa no inicia un envío. Los avisos en revisión requieren comprobar la operación con el proveedor.</p>
      <Link className="textLink" href={`/pedidos/${job.payload.orderNumber}` as Route}>Consultar pedido →</Link>
    </section><PaymentConfirmationPreview snapshot={job.payload} /></div>
    <p className="adminBackLink"><Link href={"/admin/notificaciones" as Route}>Volver a confirmaciones</Link></p></main>;
}
