"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CheckoutAddress, CheckoutShippingZone } from "@/modules/checkout/queries";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es-PE");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

type Props = {
  addresses: CheckoutAddress[];
  shippingZones: CheckoutShippingZone[];
  subtotal: number;
  initialAddressId?: string;
  blocked?: boolean;
};

export function CheckoutAddressSelector({
  addresses,
  shippingZones,
  subtotal,
  initialAddressId,
  blocked = false,
}: Props) {
  const fallbackAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const [selectedAddressId, setSelectedAddressId] = useState(
    addresses.some((address) => address.id === initialAddressId)
      ? initialAddressId ?? ""
      : fallbackAddress?.id ?? "",
  );

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);

  const selectedZone = useMemo(() => {
    if (!selectedAddress) return undefined;

    return shippingZones.find(
      (zone) =>
        normalize(zone.department) === normalize(selectedAddress.department) &&
        normalize(zone.province) === normalize(selectedAddress.province) &&
        normalize(zone.district) === normalize(selectedAddress.district),
    );
  }, [selectedAddress, shippingZones]);

  const shipping = selectedZone?.price ?? 0;
  const total = subtotal + shipping;
  const canContinue = Boolean(selectedAddress && selectedZone && !blocked);

  return (
    <div className="checkoutSelector">
      <div className="checkoutAddressList" role="radiogroup" aria-label="Dirección de entrega">
        {addresses.map((address) => {
          const active = address.id === selectedAddressId;
          return (
            <button
              className={`checkoutAddressCard${active ? " active" : ""}`}
              key={address.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelectedAddressId(address.id)}
            >
              <span className="checkoutAddressTopline">
                <strong>{address.label || "Dirección"}</strong>
                {address.isDefault ? <small>Predeterminada</small> : null}
              </span>
              <span>{address.recipient}</span>
              <span>{address.addressLine1}</span>
              <span>{address.district}, {address.province}</span>
              <span>{address.phone}</span>
            </button>
          );
        })}
      </div>

      <aside className="checkoutSummaryCard">
        <p className="eyebrow wine">RESUMEN</p>
        <div className="summaryRow"><span>Productos</span><strong>{formatPrice(subtotal)}</strong></div>
        <div className="summaryRow">
          <span>Envío</span>
          <strong>{selectedZone ? formatPrice(shipping) : "Sin cobertura"}</strong>
        </div>
        <div className="summaryTotal"><span>Total</span><strong>{formatPrice(total)}</strong></div>

        {selectedAddress && !selectedZone ? (
          <p className="checkoutAlert">
            Esta dirección no tiene una tarifa activa. El administrador debe habilitar la zona antes de continuar.
          </p>
        ) : null}

        {blocked ? (
          <p className="checkoutAlert">Corrige el stock del carrito antes de continuar.</p>
        ) : null}

        {canContinue ? (
          <Link className="button buttonPrimary fullButton" href={`/checkout/pago?addressId=${selectedAddressId}`}>
            Continuar al pago
          </Link>
        ) : (
          <button className="button buttonDisabled fullButton" type="button" disabled>
            Continuar al pago
          </button>
        )}
        <small className="checkoutSecurityNote">El monto de envío se valida nuevamente en el servidor antes de crear el pedido.</small>
      </aside>
    </div>
  );
}
