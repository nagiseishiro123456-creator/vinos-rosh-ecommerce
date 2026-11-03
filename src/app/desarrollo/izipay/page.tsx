import { notFound } from "next/navigation";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import { privatePageMetadata } from "@/lib/seo";
import { IzipayFormPreview } from "./preview";
import "../../pedidos/[number]/tarjeta/test-form.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata("Prueba visual de Izipay");
export default function IzipayPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className="orderPage purchaseFlow"><div className="catalogHeaderWrap compact"><StoreHeader /></div>
    <section className="shell izipayTestPage"><h1>Izipay: recorrido de prueba</h1>
      <p>SIMULACIÓN LOCAL. No contacta a Izipay, no crea pedidos, no modifica stock y no acepta tarjetas ni dinero.</p>
      <p><Link href="/desarrollo/izipay/compra" className="button buttonDark">Simular una compra completa como cliente</Link></p>
      <IzipayFormPreview />
    </section></main>;
}
