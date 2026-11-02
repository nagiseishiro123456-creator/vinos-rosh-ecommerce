"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, LoaderCircle, AlertCircle } from "lucide-react";

type Props = { status?: string };
export function ProductSaveControls({ status }: Props) {
  const { pending } = useFormStatus();
  const root = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [invalid, setInvalid] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const edited = () => { setDirty(true); setAttempted(false); setInvalid(""); };
    const submitted = () => { setDirty(true); setAttempted(true); setInvalid(""); };
    if (window.location.hash === "#product-save-feedback") document.getElementById("product-save-feedback")?.scrollIntoView({block:"center",behavior:"instant"});
    const rejected = (event: Event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
      const label = input.labels?.[0]?.textContent?.trim() || "el campo indicado";
      setInvalid(`No se guardó: revisa «${label}». ${input.validationMessage}`);
    };
    form.addEventListener("input", edited);
    form.addEventListener("change", edited);
    form.addEventListener("submit", submitted);
    form.addEventListener("invalid", rejected, true);
    return () => {
      form.removeEventListener("input", edited);
      form.removeEventListener("change", edited);
      form.removeEventListener("submit", submitted);
      form.removeEventListener("invalid", rejected, true);
    };
  }, []);

  const saved = !pending && !dirty && !invalid && (status === "updated" || status === "price-required");
  const error = !pending && (Boolean(invalid) || (!dirty && status === "invalid"));
  const message = pending ? "Guardando los cambios…"
    : invalid || (dirty ? attempted ? "No se ha confirmado el guardado. Comprueba la conexión y vuelve a intentarlo." : "Hay cambios sin guardar."
      : status === "updated" ? "Producto, stock y textos guardados correctamente."
      : status === "price-required" ? "Datos guardados en borrador. Confirma un precio mayor que cero para habilitar la compra."
      : status === "invalid" ? "No se guardó. Revisa el precio, el stock y los textos del formulario." : "");

  return <div ref={root}>
    <button className="button buttonPrimary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? <><LoaderCircle size={18} aria-hidden="true" /> Guardando…</> : "Guardar producto, stock y textos"}
    </button>
    <div id="product-save-feedback" data-testid="product-save-feedback" role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"} aria-atomic="true" hidden={!message}
      style={{ display: message ? "flex" : "none", gap: 10, alignItems: "flex-start", marginTop: 14, padding: 14, borderRadius: 12,
        background: saved ? "#eaf6ed" : error ? "#fff0ee" : "#f5efe6", color: saved ? "#21613b" : error ? "#8b2424" : "#594a39" }}>
      {saved ? <CheckCircle2 size={22} aria-hidden="true" style={{flexShrink:0}} /> : error ? <AlertCircle size={22} aria-hidden="true" style={{flexShrink:0}} /> : null}
      <span>{message}</span>
    </div>
  </div>;
}
