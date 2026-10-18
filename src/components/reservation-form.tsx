"use client";

import { formatPrice } from "@/lib/money";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

import { reserveOrder } from "@/modules/orders/actions";

type Props = {
  addressId: string;
  total: string;
  checkoutQuote: string;
  yapeEnabled: boolean;
  transferEnabled: boolean;
};


export function ReservationForm({ addressId, total, checkoutQuote, yapeEnabled, transferEnabled }: Props) {
  const firstProvider = yapeEnabled ? "YAPE_MANUAL" : transferEnabled ? "TRANSFER_MANUAL" : "";
  const [provider, setProvider] = useState(firstProvider);
  const [receiptType, setReceiptType] = useState("BOLETA");
  const hasProvider = Boolean(firstProvider);

  return (
    <form className="paymentForm" action={reserveOrder}>
      <input type="hidden" name="addressId" value={addressId} />
      <input type="hidden" name="checkoutQuote" value={checkoutQuote} />

      <section className="paymentSection">
        <p className="eyebrow wine">MÉTODO DE PAGO</p>
        <h2>¿Cómo deseas pagar?</h2>

        <div className="paymentOptions">
          {yapeEnabled ? (
            <label className={`paymentOption${provider === "YAPE_MANUAL" ? " active" : ""}`}>
              <input
                type="radio"
                name="provider"
                value="YAPE_MANUAL"
                checked={provider === "YAPE_MANUAL"}
                onChange={() => setProvider("YAPE_MANUAL")}
              />
              <span>
                <strong>Yape</strong>
                <small>Pago directo al negocio · validación por administrador</small>
              </span>
            </label>
          ) : null}

          {transferEnabled ? (
            <label className={`paymentOption${provider === "TRANSFER_MANUAL" ? " active" : ""}`}>
              <input
                type="radio"
                name="provider"
                value="TRANSFER_MANUAL"
                checked={provider === "TRANSFER_MANUAL"}
                onChange={() => setProvider("TRANSFER_MANUAL")}
              />
              <span>
                <strong>Transferencia bancaria</strong>
                <small>Transferencia directa · validación por administrador</small>
              </span>
            </label>
          ) : null}
        </div>

        {!hasProvider ? (
          <div className="checkoutWarningPanel">
            <strong>Los medios de pago manual aún no tienen datos reales configurados.</strong>
            <p>El administrador debe registrar el QR/número de Yape o la cuenta bancaria antes de recibir pedidos.</p>
          </div>
        ) : null}

        <p className="checkoutSecurityNote">Primero confirmaremos el pedido y reservaremos las botellas. Después verás las instrucciones para pagar.</p>
      </section>

      <section className="paymentSection">
        <p className="eyebrow wine">COMPROBANTE</p>
        <h2>Boleta o factura</h2>

        <div className="receiptOptions">
          <label className={receiptType === "BOLETA" ? "active" : ""}>
            <input type="radio" name="receiptType" value="BOLETA" checked={receiptType === "BOLETA"} onChange={() => setReceiptType("BOLETA")} />
            <span><strong>Boleta</strong><small>Compra personal</small></span>
          </label>
          <label className={receiptType === "FACTURA" ? "active" : ""}>
            <input type="radio" name="receiptType" value="FACTURA" checked={receiptType === "FACTURA"} onChange={() => setReceiptType("FACTURA")} />
            <span><strong>Factura</strong><small>Compra con RUC</small></span>
          </label>
        </div>

        {receiptType === "FACTURA" ? (
          <div className="checkoutFormGrid invoiceFields">
            <div className="formField">
              <label htmlFor="documentNumber">RUC</label>
              <input id="documentNumber" name="documentNumber" inputMode="numeric" pattern="[0-9]{11}" maxLength={11} required />
            </div>
            <div className="formField">
              <label htmlFor="businessName">Razón social</label>
              <input id="businessName" name="businessName" maxLength={180} required />
            </div>
            <div className="formField full">
              <label htmlFor="taxAddress">Dirección fiscal</label>
              <input id="taxAddress" name="taxAddress" maxLength={220} required />
            </div>
          </div>
        ) : null}
      </section>

      <section className="paymentSection">
        <div className="formField">
          <label htmlFor="customerNotes">Indicaciones del pedido (opcional)</label>
          <textarea id="customerNotes" name="customerNotes" rows={3} maxLength={500} placeholder="Horario, indicación de entrega, etc." />
        </div>

        <SubmitButton disabled={!hasProvider} pendingText="Reservando…">
          Confirmar y reservar por {formatPrice(total)}
        </SubmitButton>
        <p className="checkoutSecurityNote">
          No se realiza ningún cobro al confirmar. Tendrás un plazo indicado en el pedido para pagar y comunicar la operación.
        </p>
      </section>
    </form>
  );
}
