import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmationDemo } from "./confirmation-demo";
import "../../admin/notificaciones/notifications.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demostración de confirmaciones", robots: { index: false, follow: false } };
export default function ConfirmationDemoPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ConfirmationDemo />;
}
