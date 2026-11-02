import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth-shell";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Restablecer contraseña");
export default function ResetLayout({ children }: { children: ReactNode }) { return <AuthShell>{children}</AuthShell>; }
