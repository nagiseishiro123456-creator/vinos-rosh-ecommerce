import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth-shell";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Iniciar sesión");
export default function LoginLayout({ children }: { children: ReactNode }) { return <AuthShell>{children}</AuthShell>; }
