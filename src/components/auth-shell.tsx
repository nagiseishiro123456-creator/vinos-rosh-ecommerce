import type { ReactNode } from "react";
import { StoreHeader } from "@/components/store-header";
import "@/app/auth-brand.css";

export function AuthShell({ children }: { children: ReactNode }) {
  return <div className="authRoute"><StoreHeader />{children}</div>;
}
