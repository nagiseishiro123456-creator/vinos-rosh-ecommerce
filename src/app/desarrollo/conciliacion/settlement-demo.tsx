"use client";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { SettlementSummary } from "@/components/settlement-summary";
const scenarios = [
  { label: "Comisión desconocida", commission: null, deposited: null, consistent: true },
  { label: "Abono pendiente", commission: "2.50", deposited: null, consistent: true },
  { label: "Ver diferencia", commission: "2.50", deposited: "94.70", consistent: true },
  { label: "Ver conciliado", commission: "2.50", deposited: "95.70", consistent: true },
  { label: "Sin comisión", commission: "0.00", deposited: "98.20", consistent: true },
  { label: "Pedido reembolsado", commission: "2.50", deposited: "95.70", consistent: false },
];
export function SettlementDemo() {
  const [active, setActive] = useState(0); const scenario = scenarios[active];
  return <main className="shell adminPage settlementsPage"><p className="eyebrow wine">DEMOSTRACIÓN LOCAL · DATOS FICTICIOS</p><h1>Del pago confirmado al abono verificado.</h1>
    <p className="adminIntro">Ejemplo ROSH-DEMO-0001: pago de S/ 98.20. Cambia de escenario para ver cómo una comisión y un abono afectan la conciliación.</p>
    <div className="settlementDemoControls">{scenarios.map((item, index) => <button className={`button ${active === index ? "buttonDark" : ""}`} type="button" key={item.label} onClick={() => setActive(index)} aria-pressed={active === index}>{item.label}</button>)}</div>
    <div className="settlementGrid"><SettlementSummary gross="98.20" commission={scenario.commission} deposited={scenario.deposited} consistent={scenario.consistent} />
      <section className="adminCard"><h2>Cómo se usa en la tienda</h2><ol><li>Aprueba un pago manual después de comprobar su ingreso.</li><li>Abre Conciliación y registra la comisión del reporte.</li><li>Identifica el abono, su fecha y referencia.</li><li>Revisa la diferencia y explica cualquier corrección.</li></ol><p className="settlementNotice">Esta demostración no crea registros, modifica pedidos ni consulta cuentas bancarias. El panel real conserva el historial y comprueba los permisos administrativos.</p></section></div>
    <p><Link href={"/desarrollo/correos" as Route}>Ver demostración del correo</Link></p></main>;
}
