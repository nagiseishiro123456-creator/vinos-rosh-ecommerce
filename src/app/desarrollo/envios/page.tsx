import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShippingCoverageExplorer } from "@/components/shipping-coverage-explorer";
import "../../envios/shipping-coverage.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demostración de cobertura", robots: { index: false, follow: false } };
export default function CoverageDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const zones = [{ id: "demo-1", department: "Lima", province: "Lima", district: "San Isidro", price: "8.50" }, { id: "demo-2", department: "Lima", province: "Lima", district: "Miraflores", price: "10.00" }, { id: "demo-3", department: "Lima", province: "Huaral", district: "Santa Rosa", price: "0.00" }];
  return <main><section className="shell shippingCoveragePage"><p className="eyebrow wine">DEMOSTRACIÓN LOCAL · TARIFAS FICTICIAS</p><h1>Consulta tu zona antes de comprar.</h1><p>Busca «san isidro», «HUARAL» o una ubicación no incluida. Estos ejemplos no representan la cobertura ni los precios reales de ROSH.</p><ShippingCoverageExplorer zones={zones} /></section></main>;
}
