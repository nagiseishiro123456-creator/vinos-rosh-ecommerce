import { formatPrice } from "@/lib/money";
import { projectSettlement, settlementCopy } from "@/modules/payments/settlement-contract";

export function SettlementSummary({ gross, commission, deposited, consistent = true }: { gross: string; commission: string | null; deposited: string | null; consistent?: boolean }) {
  const result = projectSettlement(gross, commission, deposited, consistent);
  const difference = result.difference === null ? "Por determinar" : (result.difference.startsWith("-") ? "Falta " : result.difference === "0.00" ? "" : "Exceso ") + formatPrice(result.difference.replace("-", ""));
  return <section className="adminCard settlementSummary" aria-label="Resumen de conciliación">
    <h2>Pago y abono</h2><div role="status" aria-live="polite"><strong className={`settlementState settlementState-${result.state.toLowerCase()}`}>{settlementCopy[result.state].label}</strong><p>{settlementCopy[result.state].message}</p></div>
    <dl><div><dt>Pago bruto confirmado</dt><dd>{formatPrice(gross)}</dd></div><div><dt>Comisión verificada</dt><dd>{commission === null ? "Desconocida" : formatPrice(commission)}</dd></div>
      <div><dt>Neto esperado</dt><dd>{result.net === null ? "Por determinar" : formatPrice(result.net)}</dd></div><div><dt>Abono recibido</dt><dd>{deposited === null ? "Sin verificar" : formatPrice(deposited)}</dd></div>
      <div><dt>Diferencia (abono − neto)</dt><dd>{difference}</dd></div></dl>
  </section>;
}
