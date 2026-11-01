import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Mi cuenta");
export default function AccountLayout({ children }: { children: ReactNode }) { return children; }
