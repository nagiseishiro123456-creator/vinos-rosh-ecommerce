import type { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import { ShippingCoverageExplorer } from "@/components/shipping-coverage-explorer";
import { getPublicShippingCoverage } from "@/modules/shipping/queries";
import "./shipping-coverage.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cobertura y tarifas de envío", description: "Consulta las zonas de entrega y tarifas configuradas por Vinos ROSH antes de comprar." };
export default async function ShippingCoveragePage() {
  const coverage = await getPublicShippingCoverage();
  return <main className="orderPage"><div className="catalogHeaderWrap compact"><StoreHeader /></div><section className="shell shippingCoveragePage"><p className="eyebrow wine">ENTREGA ROSH</p><h1>Cobertura y tarifas de envío</h1><p>Consulta si tu zona tiene una tarifa habilitada antes de continuar con la compra. Los importes provienen de la configuración actual de la tienda.</p>
    <ShippingCoverageExplorer {...coverage} /><p><Link className="textLink" href="/productos">Ver productos →</Link></p></section></main>;
}
