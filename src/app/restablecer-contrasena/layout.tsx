import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Restablecer contraseña");
export default function ResetLayout({ children }: { children: ReactNode }) { return children; }
