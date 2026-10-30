import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SprintPaymentPreview } from "./sprint-payment-preview";
import "./sprint-preview.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sprint 3 · Recorrido de prueba",
  robots: { index: false, follow: false, noarchive: true },
};

export default function Sprint3PreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <SprintPaymentPreview />;
}
