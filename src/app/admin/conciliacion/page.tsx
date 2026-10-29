import Link from "next/link";
import type { Route } from "next";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/modules/admin/auth";
import { listPaymentSettlements } from "@/modules/payments/settlement-service";
import { settlementCopy } from "@/modules/payments/settlement-contract";

export const dynamic = "force-dynamic";
export default async function SettlementsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requireAdmin("/admin/conciliacion");
  const query = await searchParams;
  const page = query.page && /^[1-9]\d{0,4}$/.test(query.page) ? Number(query.page) : 1;
  const payments = await listPaymentSettlements(session.user.id, page);
  return <main className="shell adminPage settlementsPage"><p className="eyebrow wine">CONTROL DEL INGRESO</p><h1>Conciliación de pagos</h1>
    <p className="adminIntro">Compara cada pago manual confirmado con su comisión y el abono recibido en la cuenta del negocio. Los datos se registran desde un reporte o extracto revisado.</p>
    <p className="settlementNotice">Una comisión vacía significa desconocida. Solo registra 0.00 cuando hayas comprobado que no hubo comisión. Este registro no ejecuta cobros, transferencias ni devoluciones.</p>
    {payments.items.length === 0 ? <section className="adminCard"><h2>No hay pagos en esta página</h2><p>Los pagos manuales aprobados aparecerán aquí para conciliar sus abonos.</p><Link href="/admin/pagos">Revisar pagos</Link></section> :
      <div className="settlementList">{payments.items.map((payment) => <article className="adminCard" key={payment.paymentId}><div className="settlementCardHeader"><h2>{payment.orderNumber}</h2><strong className={`settlementState settlementState-${payment.state.toLowerCase()}`}>{settlementCopy[payment.state].label}</strong></div>
        <p>{payment.provider === "YAPE_MANUAL" ? "Yape manual" : "Transferencia manual"} · Pago {formatPrice(payment.paymentAmount)}</p>
        <p>Neto: {payment.net === null ? "por determinar" : formatPrice(payment.net)} · Abono: {payment.depositedAmount === null ? "sin verificar" : formatPrice(payment.depositedAmount)}</p>
        <Link className="textLink" href={`/admin/conciliacion/${payment.paymentId}` as Route}>Revisar conciliación →</Link></article>)}</div>}
    <nav className="settlementPagination" aria-label="Páginas de conciliación">{page > 1 ? <Link href={`/admin/conciliacion?page=${page - 1}` as Route}>← Anterior</Link> : null}<span>Página {page} · Hasta 25 pagos por página</span>{payments.hasNext ? <Link href={`/admin/conciliacion?page=${page + 1}` as Route}>Siguiente →</Link> : null}</nav>
    <p className="adminBackLink"><Link href="/admin">Volver al panel</Link></p></main>;
}
