"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText, disabled = false, busy = false }: {
  children: ReactNode; pendingText: string; disabled?: boolean; busy?: boolean;
}) {
  const status = useFormStatus();
  const pending = status.pending || busy;
  return <button className="button buttonPrimary fullButton" type="submit" disabled={disabled || pending} aria-busy={pending}>
    {pending ? pendingText : children}
  </button>;
}
