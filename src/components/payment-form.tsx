"use client";

import { useState } from "react";

import { submitManualOrder } from "@/modules/orders/actions";

type Props = {
  addressId: string;
  total: number;
  yape: {
    enabled: boolean;
    phone: string | null;
    qrImageUrl: string | null;
  };
  transfer: {
    enabled: boolean;
    label: string | null;
    accountNumber: string | null;
    holder: string | null;
  };
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(value);
}

export function PaymentForm({ addressId, total, yape, transfer }: Props) {
  const firstProvider = yape.enabled ? "YAPE_MANUAL" : transfer.enabled ? "TRANSFER_MANUAL" : "";
  const [provider, setProvider] = useState(firstProvider);
  const [receiptType, setReceiptType] = useState("BOLETA");
  const hasProvider = Boolean(firstProvider);

  return (
    <form className="paymentForm" action={submitManualOrder}>
      <input type="hidden" name="addressId" value={addressId} />

      <section className="paymentSection">
        <p className="eyebrow wine">MÉTODO DE PAGO</p>
        <h2>¿Cómo deseas pagar?</h2>

        <div className="paymentOptions">
          {yape.enabled ? (
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

          {transfer.enabled ? (
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

        {provider === "YAPE_MANUAL" && yape.enabled ? (
          <div className="paymentInstructions">
            <div>
              <span>Paga exactamente</span>
              <strong>{formatPrice(total)}</strong>
              {yape.phone ? <p>Yape: <b>{yape.phone}</b></p> : null}
              <small>Después de pagar, ingresa el número/código de operación para enviar el pedido a revisión.</small>
            </div>
            {yape.qrImageUrl ? (
              <div className="paymentQr">
                {/* URL administrable: se usa img para no atar el QR a una lista fija de hosts de next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={yape.qrImageUrl}
                  alt="Código QR de Yape de Vinos ROSH"
                  width={190}
                  height={190}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {provider === "TRANSFER_MANUAL" && transfer.enabled ? (
          <div className="paymentInstructions">
            <div>
              <span>Transfiere exactamente</span>
              <strong>{formatPrice(total)}</strong>
              {transfer.label ? <p>{transfer.label}</p> : null}
              {transfer.holder ? <p>Titular: <b>{transfer.holder}</b></p> : null}
              {transfer.accountNumber ? <p>Cuenta / CCI: <b>{transfer.accountNumber}</b></p> : null}
              <small>Luego registra el código de la operación para que el administrador pueda verificarla.</small>
            </div>
          </div>
        ) : null}

        <div className="formField">
          <label htmlFor="operationCode">Número o código de operación</label>
          <input
            id="operationCode"
            name="operationCode"
            required
            minLength={4}
            maxLength={80}
            autoComplete="off"
            placeholder="Ej. 12345678"
            disabled={!hasProvider}
          />
        </div>
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

        <button className="button buttonPrimary fullButton" type="submit" disabled={!hasProvider}>
          Enviar pedido para validar pago
        </button>
        <p className="checkoutSecurityNote">
          El pedido queda en revisión. El stock se reserva al enviarlo y se libera automáticamente si el administrador rechaza el pago.
        </p>
      </section>
    </form>
  );
}
