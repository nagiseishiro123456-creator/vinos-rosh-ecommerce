import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth-shell";
import { privatePageMetadata } from "@/lib/seo";
export const metadata = privatePageMetadata("Crear cuenta");
export default function RegistrationLayout({ children }: { children: ReactNode }) { return <AuthShell>{children}</AuthShell>; }
