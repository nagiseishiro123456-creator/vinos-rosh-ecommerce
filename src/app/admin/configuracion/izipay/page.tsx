import Link from "next/link";
import { requireAdmin } from "@/modules/admin/auth";
import { gatewaySettingsSummary, gatewayPaymentEvents } from "@/modules/payments/izipay/gateway-settings";
import { SubmitButton } from "@/components/submit-button";
import { saveIzipayConfiguration } from "./actions";

export const dynamic = "force-dynamic";
export default async function IzipayConfiguration({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin("/admin/configuracion/izipay");
  const [summary, query, events] = await Promise.all([gatewaySettingsSummary(), searchParams, gatewayPaymentEvents()]);
  return <main className="shell adminPage adminSettingsPage">
    <div className="adminTopbar"><div><p className="eyebrow wine">PAGOS</p><h1>Configuración de Pagos Izipay</h1>
      <p>Mi Cuenta Web V4 / Krypton. Las claves privadas se cifran en el servidor y no se vuelven a mostrar.</p></div>
      <Link href="/admin/configuracion" className="button buttonGhostLight">Datos comerciales</Link></div>
    {query.saved ? <p className="adminSettingsSuccess" role="status">✓ Configuración guardada. Revisa el modo y la activación antes de probar.</p> : null}
    {query.error ? <p className="checkoutError" role="alert">{query.error === "limit" ? "Espera antes de volver a guardar." : "No se guardó. Revisa la contraseña de administrador, las cinco credenciales, el modo y si otro administrador cambió la configuración. La anterior sigue vigente."}</p> : null}
    <section className="adminCard"><h2>Estado actual</h2><p>Fuente: {summary.source === "database" ? "Configuración del administrador" : "Variables de entorno"}.</p>
      <p>Comercio: {summary.merchantId || "Sin configurar"}. Modo guardado: {summary.mode === "PRODUCTION" ? "Producción" : "Sandbox"}.</p>
      <p>Las tarjetas y el QR disponibles los decide Izipay para la cuenta. Guardar claves no demuestra habilitación ni valida pagos.</p>
      <p>Notificación del proveedor: <code>/api/payment/webhook</code>. Configura la URL HTTPS completa en el panel de Izipay cuando esté disponible.</p></section>
    <form className="adminSettingsForm" action={saveIzipayConfiguration} autoComplete="off">
      <input type="hidden" name="revision" value={summary.revision} />
      <section className="adminCard adminSettingsCard"><h2>Credenciales del comercio</h2>
        <p>Introduce el conjunto completo al guardar. No mezcles claves de pruebas con producción. Las casillas quedan vacías por seguridad.</p>
        <div className="formField"><label htmlFor="gateway-mode">Modo</label><select id="gateway-mode" name="mode" defaultValue={summary.mode}><option value="SANDBOX">SANDBOX · pruebas</option><option value="PRODUCTION">PRODUCCIÓN · cobros reales</option></select></div>
        <div className="formField"><label htmlFor="merchant-id">Usuario / identificador de tienda</label><input id="merchant-id" name="merchantId" required pattern="[0-9]{8}" maxLength={8} inputMode="numeric" defaultValue={summary.merchantId} /></div>
        {[['apiPassword','Contraseña API'],['publicKey','Clave pública'],['hmacKey','Clave HMAC-SHA256']].map(([name,label]) => <div key={name} className="formField"><label htmlFor={name}>{label}</label><input id={name} name={name} type="password" required minLength={8} maxLength={8192} autoComplete="new-password" spellCheck={false} /></div>)}
        <label><input type="checkbox" name="enabled" value="yes" defaultChecked={summary.enabled} /> Habilitar la pasarela en el modo elegido.</label>
        <div className="formField"><label htmlFor="production-confirmation">Solo para habilitar producción: escribe ACTIVAR PRODUCCION</label><input id="production-confirmation" name="productionConfirmation" autoComplete="off" maxLength={32} /><small>Producción requiere cuenta propia, medios habilitados y pruebas del comercio terminadas. Sandbox queda limitado al desarrollo local.</small></div>
        <div className="formField"><label htmlFor="admin-password">Tu contraseña actual de administrador</label><input id="admin-password" name="adminPassword" type="password" required maxLength={1024} autoComplete="current-password" /></div>
        <SubmitButton pendingText="Guardando de forma segura…">Guardar configuración de Izipay</SubmitButton>
      </section>
    </form>
    <section className="adminCard"><h2>Resultados recientes de Izipay</h2>
      <p>Las pruebas no representan ingresos. Revisa los resultados que requieren conciliación antes de repetir cobros o despachar.</p>
      {events.length ? events.map(event => <p key={event.id}><Link href={`/admin/pedidos/${event.orderId}`}>{event.orderNumber}</Link> · {event.mode === "TEST" ? "PRUEBA" : "Producción"} · {({TEST_APPROVED:"Prueba aprobada",APPROVED:"Pago confirmado",REVIEW:"Requiere conciliación",NONFINAL:"Sin resultado final"} as Record<string,string>)[event.outcome]} · {event.currency} {(Number(event.amountMinor)/100).toFixed(2)} · Referencia: <code>{event.transactionUuid}</code></p>) : <p>Aún no hay resultados registrados.</p>}
    </section>
  </main>;
}
