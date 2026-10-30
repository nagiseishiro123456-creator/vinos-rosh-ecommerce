"use client";
import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import { formatPrice } from "@/lib/money";
import { submitDeliveryAddress, type AddressDestination, type AddressFormState } from "@/modules/addresses/actions";
import { unambiguousShippingZones } from "@/modules/shipping/coverage";
import type { CheckoutShippingZone } from "@/modules/checkout/queries";
import "./delivery-address-form.css";
type Values = { label: string; recipient: string; phone: string; shippingZoneId: string; addressLine1: string; reference: string; isDefault: boolean };
export function DeliveryAddressForm({ destination, addressId = null, zones, initial = {} }: { destination: AddressDestination; addressId?: string | null; zones: CheckoutShippingZone[]; initial?: Partial<Values> }) {
  const [values, setValues] = useState<Values>({ label: "", recipient: "", phone: "", shippingZoneId: "", addressLine1: "", reference: "", isDefault: false, ...initial });
  const [state, action, pending] = useActionState(submitDeliveryAddress.bind(null, destination, addressId), {} as AddressFormState);
  const available = unambiguousShippingZones(zones);
  const selectedZone = available.find((zone) => zone.id === values.shippingZoneId);
  const field = (name: Exclude<keyof Values, "isDefault">) => ({ name, id: `delivery-${name}`, value: values[name], onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues({ ...values, [name]: event.target.value }), "aria-invalid": !!state.errors?.[name], "aria-describedby": `delivery-${name}-error` });
  const error = (name: string) => <small className="deliveryFieldError" id={`delivery-${name}-error`}>{state.errors?.[name]}</small>;
  return <form action={action} className="checkoutForm deliveryAddressForm">
    {state.message ? <p className="checkoutError" role="alert">{state.message}</p> : null}
    <div className="formField"><label htmlFor="delivery-label">Nombre de la dirección</label><input {...field("label")} maxLength={40} placeholder="Casa, oficina..." />{error("label")}</div>
    <div className="checkoutFormGrid"><div className="formField"><label htmlFor="delivery-recipient">Persona que recibe</label><input {...field("recipient")} required maxLength={120} autoComplete="name" />{error("recipient")}</div>
      <div className="formField"><label htmlFor="delivery-phone">Celular</label><input {...field("phone")} required inputMode="tel" maxLength={25} autoComplete="tel" placeholder="987654321" /><small>Celular peruano de 9 dígitos. También puedes escribir +51.</small>{error("phone")}</div></div>
    <div className="formField"><label htmlFor="delivery-shippingZoneId">{destination === "checkout" ? "Distrito / zona de entrega" : "Distrito / zona"}</label>
      <select {...field("shippingZoneId")} required disabled={!available.length}><option value="" disabled>Selecciona una zona activa</option>{available.map((zone) => <option value={zone.id} key={zone.id}>{zone.district} · {zone.province}, {zone.department} · {formatPrice(zone.price)}</option>)}</select>
      {error("shippingZoneId")}{selectedZone ? <small role="status">Envío configurado: {formatPrice(selectedZone.price)}. Se validará nuevamente al confirmar el pedido.</small> : <small>Consulta las zonas habilitadas antes de guardar. <Link href="/envios">Ver cobertura y tarifas</Link></small>}
      {!available.length ? <p className="checkoutAlert">No hay una tarifa disponible para seleccionar por ahora.</p> : null}</div>
    <div className="formField"><label htmlFor="delivery-addressLine1">Dirección exacta</label><input {...field("addressLine1")} required maxLength={200} autoComplete="street-address" placeholder="Av., calle, número, urbanización" />{error("addressLine1")}</div>
    <div className="formField"><label htmlFor="delivery-reference">Referencia</label><textarea {...field("reference")} maxLength={250} rows={3} placeholder="Frente a..., puerta de color..." />{error("reference")}</div>
    <label className="checkboxField"><input type="checkbox" name="isDefault" checked={values.isDefault} onChange={(event) => setValues({ ...values, isDefault: event.target.checked })} /><span>Usar como dirección principal</span></label>
    <small>Mientras tengas direcciones activas, una será la principal. Puedes elegir otra desde Mis direcciones.</small>
    <button className="button buttonDark" type="submit" disabled={pending || !available.length}>{pending ? "Guardando…" : addressId ? "Guardar cambios" : "Guardar dirección"}</button>
  </form>;
}
