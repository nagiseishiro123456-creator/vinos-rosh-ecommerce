import { notFound } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { privatePageMetadata } from "@/lib/seo";
import { CustomerPurchaseDemo } from "./purchase-demo";
import "./purchase-demo.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata("Compra simulada como cliente");

export default function CustomerPurchasePreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className="checkoutPage purchaseFlow customerDemo">
    <div className="catalogHeaderWrap compact"><StoreHeader /></div>
    <CustomerPurchaseDemo />
  </main>;
}
