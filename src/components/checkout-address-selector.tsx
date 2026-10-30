"use client";

import { addMoney, formatPrice } from "@/lib/money";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CheckoutAddress, CheckoutShippingZone } from "@/modules/checkout/queries";
import { resolveShippingCoverage } from "@/modules/shipping/coverage";


type Props = {
  addresses: CheckoutAddress[];
  shippingZones: CheckoutShippingZone[];
  subtotal: string;
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

    const coverage = resolveShippingCoverage(selectedAddress, shippingZones);
    return coverage.kind === "available" ? coverage.zone : undefined;
  }, [selectedAddress, shippingZones]);

  const shipping = selectedZone?.price ?? "0.00";
  const total = addMoney(subtotal, shipping);
  const canContinue = Boolean(selectedAddress && selectedZone && !blocked);

  return (
    <div className="checkoutSelector">
      <fieldset className="checkoutAddressList">
        <legend className="sr-only">Dirección de entrega</legend>
        {addresses.map((address) => {
          const active = address.id === selectedAddressId;
          return (
            <label
              className={`checkoutAddressCard${active ? " active" : ""}`}
              key={address.id}
            >
              <input
                type="radio"
                name="deliveryAddress"
                value={address.id}
                checked={active}
                onChange={() => setSelectedAddressId(address.id)}
                aria-labelledby={`address-title-${address.id}`}
                aria-describedby={`address-details-${address.id}`}
              />
              <span className="checkoutAddressContent">
                <span className="checkoutAddressTopline" id={`address-title-${address.id}`}>
                  <strong>{address.label || "Dirección"}</strong>
                  {address.isDefault ? <small>Predeterminada</small> : null}
                </span>
                <span className="checkoutAddressDetails" id={`address-details-${address.id}`}>
                  <span>{address.recipient}</span>
                  <span>{address.addressLine1}</span>
                  <span>{address.district}, {address.province}</span>
                  <span>{address.phone}</span>
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <aside className="checkoutSummaryCard">
        <p className="eyebrow wine">RESUMEN</p>
        <div className="summaryRow"><span>Productos</span><strong>{formatPrice(subtotal)}</strong></div>
        <div className="summaryRow">
          <span>Envío</span>
          <strong>{selectedZone ? formatPrice(shipping) : "Sin cobertura"}</strong>
        </div>
        <div className="summaryTotal"><span>Total</span><strong>{selectedZone ? formatPrice(total) : "Por calcular"}</strong></div>

        {selectedAddress && !selectedZone ? (
          <p className="checkoutAlert">
            Esta dirección no tiene una tarifa activa. El administrador debe habilitar la zona antes de continuar.
            {" "}<Link href="/envios">Consultar cobertura de entrega</Link>
          </p>
        ) : null}

        {blocked ? (
          <p className="checkoutAlert">Corrige el stock del carrito antes de continuar.</p>
        ) : null}

        {canContinue ? (
          <Link className="button buttonPrimary fullButton" href={`/checkout/pago?addressId=${selectedAddressId}`}>
            Revisar pedido
          </Link>
        ) : (
          <button className="button buttonDisabled fullButton" type="button" disabled>
            Revisar pedido
          </button>
        )}
        <small className="checkoutSecurityNote">El monto de envío se valida nuevamente en el servidor antes de crear el pedido.</small>
      </aside>
    </div>
  );
}
