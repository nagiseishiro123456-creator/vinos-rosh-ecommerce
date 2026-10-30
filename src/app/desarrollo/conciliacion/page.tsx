import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SettlementDemo } from "./settlement-demo";
import "../../admin/conciliacion/settlements.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demostración de conciliación", robots: { index: false, follow: false } };
export default function SettlementDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <SettlementDemo />;
}
