"use client";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/money";
import { normalizeLocation } from "@/modules/shipping/coverage";
import type { CheckoutShippingZone } from "@/modules/checkout/queries";
export function ShippingCoverageExplorer({ zones, hasReview = false }: { zones: CheckoutShippingZone[]; hasReview?: boolean }) {
  const [query, setQuery] = useState(""); const [limit, setLimit] = useState(24);
  const results = useMemo(() => { const tokens = normalizeLocation(query).split(/[,\s]+/).filter(Boolean);
    return zones.filter((zone) => tokens.every((token) => normalizeLocation([zone.department, zone.province, zone.district].join(" ")).includes(token)));
  }, [query, zones]);
  return <section className="shippingExplorer" aria-label="Consulta de cobertura"><div className="shippingSearch"><label htmlFor="coverage-search">Busca tu distrito, provincia o departamento</label><input id="coverage-search" type="search" maxLength={150} value={query} onChange={(event) => { setQuery(event.target.value); setLimit(24); }} placeholder="Ejemplo: San Isidro, Lima" autoComplete="off" /></div>
    <p role="status" aria-live="polite">{zones.length === 0 ? "No hay tarifas de envío publicadas por ahora." : `${results.length} zona${results.length === 1 ? "" : "s"} disponible${results.length === 1 ? "" : "s"}${results.length > limit ? `; mostrando ${limit}` : ""}.`}</p>
    {hasReview ? <p className="shippingCoverageNotice">Algunas tarifas necesitan revisión y no se muestran como disponibles.</p> : null}
    {zones.length > 0 && results.length === 0 ? <div className="shippingEmpty"><h2>No encontramos esa zona</h2><p>Prueba con el distrito o la provincia. Si no aparece, todavía no hay una tarifa de entrega habilitada para esa ubicación.</p></div> : null}
    <div className="shippingCoverageGrid">{results.slice(0, limit).map((zone) => <article key={zone.id}><div><h2>{zone.district}</h2><p>{zone.province}, {zone.department}</p></div><strong>{zone.price === "0.00" ? "Envío sin costo" : formatPrice(zone.price)}</strong><small>Tarifa por pedido para esta zona</small></article>)}</div>
    {results.length > limit ? <button className="button buttonDark" type="button" onClick={() => setLimit(limit + 24)}>Ver más zonas</button> : null}
    <p className="shippingCoverageNotice">La cobertura y el importe se validan nuevamente al confirmar el pedido. Esta consulta no reserva productos ni garantiza una fecha de entrega.</p>
  </section>;
}
