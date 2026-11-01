import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Confirmar compra");
export default function CheckoutLayout({ children }: { children: ReactNode }) { return children; }
