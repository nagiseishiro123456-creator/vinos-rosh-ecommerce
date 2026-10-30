import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/admin/auth";
import { readPaymentSettlement } from "@/modules/payments/settlement-service";
import { SettlementSummary } from "@/components/settlement-summary";
import { SettlementForm } from "./settlement-form";

export const dynamic = "force-dynamic";
export default async function SettlementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const session = await requireAdmin("/admin/conciliacion");
  const { id } = await params; const { saved } = await searchParams;
  const payment = await readPaymentSettlement(session.user.id, id); if (!payment) notFound();
  return <main className="shell adminPage settlementsPage"><p className="eyebrow wine">CONCILIACIÓN MANUAL</p><h1>{payment.orderNumber}</h1>
    <p>El pago confirmado y el abono bancario se comprueban por separado. Este registro no cambia pedidos, inventario ni pagos.</p>
    {saved === "1" ? <p className="settlementNotice" role="status">Conciliación guardada. Revisa el resumen y el historial.</p> : null}
    <div className="settlementGrid"><div><SettlementSummary gross={payment.grossAmount ?? payment.paymentAmount} commission={payment.commissionAmount} deposited={payment.depositedAmount} consistent={payment.editable} />
      {payment.recordId ? <section className="adminCard settlementEvidence"><h2>Fuente registrada</h2><p>Reporte: {payment.sourceReference}</p><p>Referencia del abono: {payment.depositReference ?? "Sin verificar"}</p><p>Fecha del abono: {payment.depositDate ?? "Sin verificar"}</p><p>Versión {payment.revision} · {payment.updatedAt?.toLocaleString("es-PE", { timeZone: "America/Lima" })}</p></section> : null}</div>
      {payment.editable ? <SettlementForm key={`${payment.paymentId}-${payment.revision ?? 0}`} paymentId={payment.paymentId} revision={payment.revision ?? 0} initial={{ commissionAmount: payment.commissionAmount ?? "", depositedAmount: payment.depositedAmount ?? "", depositReference: payment.depositReference ?? "", depositDate: payment.depositDate ?? "", sourceReference: payment.sourceReference ?? "" }} /> : <section className="adminCard"><h2>Registro conservado para revisión</h2><p>El pago o el pedido dejó de cumplir las condiciones para editar esta conciliación. Consulta su estado y el historial.</p></section>}
    </div><section className="adminCard settlementHistory"><h2>Historial de correcciones</h2><p>Hasta los últimos 20 registros de este pago; el historial completo se conserva en el pedido.</p>
      {payment.history.length === 0 ? <p>Todavía no hay registros.</p> : <ol>{payment.history.map((event) => <li key={event.id}><strong>{event.createdAt.toLocaleString("es-PE", { timeZone: "America/Lima" })} · {event.actor ? `${event.actor.firstName} ${event.actor.lastName}` : "Administrador anterior"}</strong><p>{event.note}</p></li>)}</ol>}
    </section><p><Link href={`/admin/pedidos/${payment.orderId}` as Route}>Ver pedido e historial completo</Link></p><p className="adminBackLink"><Link href="/admin/conciliacion">Volver a conciliación</Link></p></main>;
}
