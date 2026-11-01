import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Recuperar contraseña");
export default function RecoveryLayout({ children }: { children: ReactNode }) { return children; }
