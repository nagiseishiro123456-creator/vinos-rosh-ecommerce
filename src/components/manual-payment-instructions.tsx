import { formatPrice } from "@/lib/money";

type Props = {
  total: string;
  yape?: { phone: string | null; qrImageUrl: string | null };
  transfer?: { label: string | null; holder: string | null; accountNumber: string | null };
};

// Rendered only inside the authenticated, already-reserved order route.
export function ManualPaymentInstructions({ total, yape, transfer }: Props) {
  return <div className="paymentInstructions">
    <div>
      <span>{yape ? "Paga exactamente" : "Transfiere exactamente"}</span>
      <strong>{formatPrice(total)}</strong>
      {yape?.phone ? <p>Yape: <b>{yape.phone}</b></p> : null}
      {transfer?.label ? <p>{transfer.label}</p> : null}
      {transfer?.holder ? <p>Titular: <b>{transfer.holder}</b></p> : null}
      {transfer?.accountNumber ? <p>Cuenta / CCI: <b>{transfer.accountNumber}</b></p> : null}
      <small>Realiza un solo pago. Después comunica el código de operación de este pedido para su revisión.</small>
    </div>
    {yape?.qrImageUrl ? <div className="paymentQr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={yape.qrImageUrl} alt="Código QR de Yape de Vinos ROSH" width={190} height={190} loading="lazy" referrerPolicy="no-referrer" />
    </div> : null}
  </div>;
}
