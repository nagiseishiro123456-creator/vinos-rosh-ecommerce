import Link from "next/link";
import { requireAdmin } from "@/modules/admin/auth";
import { runMaintenanceFromAdmin } from "@/modules/admin/maintenance/actions";
import { getManualPaymentHoldMinutes } from "@/modules/orders/hold";
import { getLaunchSnapshot } from "@/modules/admin/launch/queries";
import { buildLaunchReport, launchStatusCopy, type LaunchCheck } from "@/modules/admin/launch/readiness";

export const dynamic = "force-dynamic";

function Checklist({ checks }: { checks: LaunchCheck[] }) {
  return <div className="launchChecklist">{checks.map((check) => (
    <article className={`launchCheck ${check.status}`} key={check.id} aria-label={check.title}>
      <div className="launchCheckIcon" aria-hidden="true">{check.status === "ready" ? "✓" : check.status === "unavailable" ? "?" : "!"}</div>
      <div>
        <div className="launchCheckTitleRow"><h3>{check.title}</h3><span className={`launchStatus ${check.status}`}>{launchStatusCopy[check.status]}</span></div>
        <p>{check.description}</p>
        <p className="launchNextStep"><strong>Siguiente paso:</strong> {check.nextStep}</p>
        <Link href={check.href}>{check.linkLabel} →</Link>
      </div>
    </article>
  ))}</div>;
}

export default async function LaunchReadinessPage() {
  await requireAdmin("/admin/lanzamiento");
  const report = buildLaunchReport(await getLaunchSnapshot(), process.env);
  const holdMinutes = getManualPaymentHoldMinutes();

  return <main className="shell adminPage launchReadinessPage">
    <div className="adminTopbar">
      <div><p className="eyebrow wine">PREPARACIÓN DE LA TIENDA</p><h1>Preparación para lanzamiento</h1>
        <p className="adminIntro">Revisa la configuración actual y los pasos que faltan con ROSH. Las comprobaciones locales no sustituyen la compra de prueba ni la validación de los servicios externos.</p></div>
      <div className="adminTopbarActions"><a className="button buttonGhostLight" href="/admin/lanzamiento">Actualizar comprobaciones</a><Link className="button buttonGhostLight" href="/admin">← Panel</Link></div>
    </div>
    <section className="launchSummary" aria-label="Resumen de comprobaciones locales">
      <div><span>Configuración local</span><strong>{report.readyCount}/{report.total}</strong></div>
      <div className={report.requiredPending > 0 ? "attention" : ""}><span>Requisitos locales por resolver</span><strong>{report.requiredPending}</strong></div>
      <div><span>Revisiones con ROSH</span><strong>{report.reviews.length}</strong></div>
    </section>
    <div className="launchProgress" role="progressbar" aria-label="Configuración local completa" aria-valuenow={report.readyCount} aria-valuemin={0} aria-valuemax={report.total} aria-valuetext={`${report.readyCount} de ${report.total} comprobaciones locales configuradas`}><span style={{ width: `${report.progress}%` }} /></div>
    <p className="launchScope">Este avance describe solo la configuración local. Los servicios externos y las revisiones del negocio se muestran por separado y permanecen pendientes hasta validarlos.</p>
    {report.unavailableCount > 0 ? <p className="adminAlert error" role="status">Hay {report.unavailableCount} comprobación(es) sin resultado. Actualiza la página; si continúa, solicita al responsable técnico revisar la conexión y las consultas.</p> : null}

    <section className="launchSection" aria-labelledby="comprobaciones-locales"><h2 id="comprobaciones-locales">Comprobaciones automáticas</h2><Checklist checks={report.checks} /></section>
    <section className="launchSection" aria-labelledby="servicios-externos"><h2 id="servicios-externos">Servicios externos</h2><p>Abrir este panel no consulta proveedores, envía correos ni realiza cobros. Izipay se prepara por separado de los medios manuales del checkout.</p><Checklist checks={report.integrations} /></section>
    <section className="launchSection" aria-labelledby="revision-rosh"><h2 id="revision-rosh">Revisión con ROSH</h2><p>Estos puntos necesitan evidencia y acuerdo del negocio. Este panel todavía no guarda su aceptación.</p><Checklist checks={report.reviews} /></section>

    <section className="adminCard launchSection" id="prueba-cliente" aria-labelledby="prueba-cliente-titulo">
      <p className="eyebrow wine">RECORRIDO GUIADO</p><h2 id="prueba-cliente-titulo">Compra de prueba con el cliente</h2>
      <p>Usa un entorno de prueba y datos ficticios. Mantén abierta la administración y realiza la compra con una cuenta de prueba en otra ventana privada. El recorrido puede reservar stock de prueba; no hagas transferencias reales.</p>
      <ol className="launchSteps">
        <li><strong>Preparar:</strong> revisa un <Link href="/admin/productos">producto de prueba</Link>, su stock y una <Link href="/admin/envios">zona de entrega</Link> configurada.</li>
        <li><strong>Comprar:</strong> abre el <Link href="/productos">catálogo</Link>, añade al carrito y entra con la cuenta de prueba.</li>
        <li><strong>Revisar y reservar:</strong> comprueba dirección, indicaciones, envío y total antes de confirmar. Conserva el número de pedido.</li>
        <li><strong>Gestionar:</strong> revisa el pedido en <Link href="/admin/pedidos">Pedidos</Link> y el estado en <Link href="/admin/pagos">Pagos</Link>. En una prueba aislada puedes simular la revisión; un pago real solo se aprueba después de comprobar el ingreso.</li>
        <li><strong>Comunicar:</strong> revisa la <Link href="/admin/notificaciones">vista previa del aviso</Link>. Comprueba recuperación de contraseña y entrega de correo cuando el servicio esté preparado y el destinatario autorizado.</li>
        <li><strong>Registrar:</strong> anota fecha, entorno, participantes, pedido de prueba, resultado y problemas encontrados. Acuerda con ROSH qué corregir y qué acepta.</li>
      </ol>
    </section>
    <section className="adminCard launchSection" id="revision-publicacion"><h2>Preparación de publicación</h2><p>El responsable técnico debe revisar el dominio HTTPS definitivo y el modo de vista previa, comprobar disponibilidad y recuperación, y acordar la publicación con ROSH. Esta pantalla muestra la configuración; no publica ni cambia el entorno.</p></section>
    <section className="adminCard launchSection" id="revision-proveedores"><h2>Preparación de Izipay</h2><p>ROSH debe obtener acceso al comercio y confirmar el producto contratado. Después, el responsable técnico completa las credenciales de prueba, el formulario, retorno e IPN y comprueba el recorrido de sandbox. Las claves se guardan en el entorno privado del servidor. La configuración local no acredita una integración productiva.</p></section>
    <section className="adminCard launchSection" id="revision-negocio"><h2>Información que debe validar ROSH</h2><p>Reúne con el responsable del negocio la denominación comercial del producto, los documentos públicos, datos de contacto y el proceso de emisión de comprobantes. Registra quién revisó cada punto y dónde se conserva la evidencia; después revisa el recorrido de compra con esos datos definitivos.</p></section>
    <section className="adminCard launchSection"><p className="eyebrow wine">MANTENIMIENTO</p><h2>Reservas de pago manual</h2><p>Las nuevas reservas sin pago comunicado duran {holdMinutes} minutos; cada pedido conserva su vencimiento original. El mantenimiento libera reservas pendientes vencidas, elimina tokens expirados y límites antiguos. Los pagos en revisión conservan su stock y requieren conciliación.</p>
      <form action={runMaintenanceFromAdmin}><button className="button buttonPrimary" type="submit">Ejecutar mantenimiento ahora</button></form>
    </section>
  </main>;
}
