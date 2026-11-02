import { BarChart3 } from "lucide-react";
import { formatPrice } from "@/lib/money";
import type { DashboardDay } from "@/modules/admin/dashboard/period";

const dateLabel = (day: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "America/Lima" }).format(new Date(`${day}T12:00:00Z`));
export function OrderChart({ days }: { days: DashboardDay[] }) {
  const max = Math.max(1, ...days.map(d => d.orders));
  const ceiling = Math.max(4, Math.ceil(max / 4) * 4);
  const points = days.map((d, i) => ({ x: 42 + i * (686 / (days.length - 1)), y: 209 - (d.orders / ceiling) * 176 }));
  const line = points.map(p => `${p.x},${p.y}`).join(" ");
  const indexes = [...new Set([0, Math.floor((days.length - 1) / 3), Math.floor(2 * (days.length - 1) / 3), days.length - 1])];
  return <>
    {days.some(d => d.orders > 0) ? <figure className="adminOrderChart">
      <svg viewBox="0 0 760 250" role="img" aria-label="Pedidos confirmados por día. Los valores exactos están disponibles en Ver datos por día.">
        {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="42" x2="728" y1={209 - i * 44} y2={209 - i * 44} stroke="#ece8f1" strokeDasharray="4 5" /><text x="28" y={213 - i * 44} textAnchor="end">{ceiling * i / 4}</text></g>)}
        <polygon points={`42,209 ${line} 728,209`} fill="#eee5f7" />
        <polyline points={line} fill="none" stroke="#75459b" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={days[i].day} cx={p.x} cy={p.y} r={days.length <= 7 ? 4 : 2} fill="#75459b"><title>{dateLabel(days[i].day)}: {days[i].orders} pedidos · {formatPrice(days[i].sales)}</title></circle>)}
        {indexes.map(i => <text key={i} x={points[i].x} y="241" textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}>{dateLabel(days[i].day)}</text>)}
      </svg>
    </figure> : <div className="adminChartEmpty"><span><BarChart3 size={28} strokeWidth={1.5} aria-hidden="true" /></span><strong>Aún no hay ventas confirmadas en este período</strong><p>El gráfico se actualizará cuando los pedidos tengan su pago confirmado.</p></div>}
    <details className="adminChartData"><summary>Ver datos por día</summary><div className="adminTableWrap"><table className="adminTable"><caption className="sr-only">Pedidos confirmados e importe por día, hora de Perú</caption><thead><tr><th>Fecha</th><th>Pedidos confirmados</th><th>Importe</th></tr></thead><tbody>{days.map(d => <tr key={d.day}><td>{dateLabel(d.day)}</td><td>{d.orders}</td><td>{formatPrice(d.sales)}</td></tr>)}</tbody></table></div></details>
  </>;
}
