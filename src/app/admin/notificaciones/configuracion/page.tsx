import Link from "next/link";
import { requireAdmin } from "@/modules/admin/auth";
import { inspectPaymentEmailSetup } from "@/modules/notifications/email-config";

export const dynamic = "force-dynamic";
export default async function EmailConfigurationPage() {
  await requireAdmin("/admin/notificaciones/configuracion");
  const setup = inspectPaymentEmailSetup(process.env);
  return <main className="shell adminPage notificationsPage">
    <p className="eyebrow wine">PREPARACIÓN DEL CORREO</p><h1>Configurar confirmaciones</h1>
    <p className="adminIntro">Este diagnóstico revisa la configuración local del servidor. Abrir esta página no contacta al proveedor ni envía mensajes.</p>
    <p className="notificationNotice" role="status">{setup.locallyReady ? "Configuración local completa. Falta comprobar el dominio, permisos y entrega con Resend." : "El correo necesita preparación. La cola de confirmaciones sigue disponible."}</p>
    <div className="notificationList">{setup.checks.map((check) => <section className="adminCard" key={check.id}><h2>{check.label}</h2><strong>{check.ok ? "Configurado localmente" : "Pendiente"}</strong><p>{check.detail}</p></section>)}</div>
    <section className="adminCard"><h2>Activación del negocio</h2><ol>
      <li>Preparar la cuenta de Resend y verificar un dominio propio, con sus registros DNS.</li>
      <li>Crear una credencial de envío restringida al dominio y guardarla en el entorno privado del servidor.</li>
      <li>Configurar el remitente y la URL de la tienda; conservar el envío desactivado mientras se prepara.</li>
      <li>Verificar los límites del plan gratuito. Habilitar el envío cuando estén listos y procesar un aviso de prueba con un destinatario autorizado.</li>
      <li>Comprobar el resultado en Resend y la recepción. Un estado de aceptación no acredita entrega en bandeja.</li>
    </ol><p>Las claves se administran fuera de este formulario. Este panel no muestra ni guarda secretos.</p>
    <p><a href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" rel="noreferrer">Dominios verificados de Resend</a> · <a href="https://resend.com/docs/dashboard/api-keys/introduction" target="_blank" rel="noreferrer">Credenciales de Resend</a></p></section>
    <p className="adminBackLink"><Link href="/admin/notificaciones">Volver a confirmaciones</Link></p>
  </main>;
}
