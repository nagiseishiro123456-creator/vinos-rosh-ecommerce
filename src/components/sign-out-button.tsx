"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

type SignOutButtonProps = {
  className?: string;
};

export function SignOutButton({ className = "button buttonGhostLight" }: SignOutButtonProps) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    if (pending) return;

    setPending(true);
    setFailed(false);

    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`signOutButton ${className}`}
        onClick={handleSignOut}
        disabled={pending}
        aria-busy={pending}
        aria-label={failed ? "Reintentar cerrar sesión" : undefined}
        title={failed ? "No se pudo cerrar sesión. Inténtalo de nuevo." : undefined}
      >
        <LogOut size={18} aria-hidden="true" />
        <span>{pending ? "Cerrando…" : failed ? "Reintentar" : "Cerrar sesión"}</span>
      </button>
      {failed ? <span className="sr-only" role="alert">No se pudo cerrar sesión. Inténtalo de nuevo.</span> : null}
    </>
  );
}
