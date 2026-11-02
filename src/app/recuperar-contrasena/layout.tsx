import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth-shell";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Recuperar contraseña");
export default function RecoveryLayout({ children }: { children: ReactNode }) { return <AuthShell>{children}</AuthShell>; }
