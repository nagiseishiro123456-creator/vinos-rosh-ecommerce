import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Reseña de mi compra");
export default function ReviewLayout({ children }: { children: ReactNode }) { return children; }
