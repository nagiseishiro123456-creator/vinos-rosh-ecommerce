"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveShippingZone, type ShippingFormState } from "@/modules/shipping/actions";
export type ShippingFormInitial = { id: string; expectedUpdatedAt: string; department: string; province: string; district: string; price: string; active: boolean };
export function ShippingZoneForm({ initial }: { initial?: ShippingFormInitial }) {
  const [values, setValues] = useState({ department: initial?.department ?? "Lima", province: initial?.province ?? "Lima", district: initial?.district ?? "", price: initial?.price ?? "" });
  const [state, action, pending] = useActionState(saveShippingZone, {} as ShippingFormState);
  return <form className="adminCard checkoutForm deliveryAddressForm" action={action}><p className="eyebrow wine">{initial ? "EDITAR TARIFA" : "NUEVA ZONA"}</p><h2>Configurar zona</h2>
    {state.message ? <p className="checkoutError" role="alert">{state.message}</p> : null}
    {initial ? <><input type="hidden" name="id" value={initial.id} /><input type="hidden" name="expectedUpdatedAt" value={initial.expectedUpdatedAt} /><p>La ubicación se conserva para mantener las direcciones guardadas. Editar la tarifa mantiene la zona {initial.active ? "activa" : "pausada"}.</p></> : null}
    {(["department", "province", "district", "price"] as const).map((name) => <div className="formField" key={name}><label htmlFor={`zone-${name}`}>{({ department: "Departamento", province: "Provincia", district: "Distrito", price: "Tarifa de envío (S/)" })[name]}</label>
      <input id={`zone-${name}`} name={name} value={values[name]} onChange={(event) => setValues({ ...values, [name]: event.target.value })} readOnly={!!initial && name !== "price"} maxLength={name === "price" ? 9 : name === "district" ? 100 : 80} required inputMode={name === "price" ? "decimal" : "text"} placeholder={name === "price" ? "8.50" : undefined} aria-invalid={!!state.errors?.[name]} aria-describedby={`zone-${name}-error`} />
      <small className="deliveryFieldError" id={`zone-${name}-error`}>{state.errors?.[name]}</small></div>)}
    <small>Importe en soles, hasta dos decimales. 0.00 representa envío sin costo.</small>
    <button className="button buttonDark" type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar tarifa"}</button>{initial ? <Link href="/admin/envios">Cancelar edición</Link> : null}
  </form>;
}
