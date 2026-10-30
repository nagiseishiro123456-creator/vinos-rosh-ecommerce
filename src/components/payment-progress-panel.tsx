import { AlertCircle, CheckCircle2, Clock3, Package } from "lucide-react";

import { paymentProgressCopy, type PaymentStatusSnapshot } from "@/modules/payments/izipay/status-contract";

const time = (value: string) => new Date(value).toLocaleString("es-PE", {
  timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function PaymentProgressPanel({ snapshot }: { snapshot: PaymentStatusSnapshot }) {
  const copy = paymentProgressCopy[snapshot.state];
  const Icon = copy.tone === "success" ? CheckCircle2 : copy.tone === "warning" ? AlertCircle : copy.tone === "waiting" ? Clock3 : Package;
  const step = snapshot.state === "confirmed" ? 2 : ["reserved", "expired", "closed"].includes(snapshot.state) ? 0 : 1;
  return (
    <section className={`automaticPaymentPanel paymentTone-${copy.tone}`} aria-label="Estado de pago automático">
      <ol className="automaticPaymentSteps" aria-label="Progreso del pago">
        {["Reserva", "Pago", "Confirmación"].map((label, index) => (
          <li key={label} className={index <= step ? "paymentStepActive" : ""} aria-current={index === step ? "step" : undefined}>
            <span>{index < step ? <CheckCircle2 size={15} aria-hidden="true" /> : index + 1}</span>{label}
          </li>
        ))}
      </ol>
      <div className="automaticPaymentState" role="status" aria-live="polite">
        <div className="automaticPaymentIcon"><Icon size={28} aria-hidden="true" /></div>
        <div><p className="automaticPaymentEyebrow">ESTADO DEL PEDIDO</p><h2>{copy.title}</h2><p>{copy.message}</p></div>
      </div>
      <dl className="automaticPaymentFacts">
        <div><dt>Pedido</dt><dd>{snapshot.orderNumber}</dd></div>
        {snapshot.reservationExpiresAt && snapshot.state === "reserved" ? <div><dt>Reserva hasta</dt><dd>{time(snapshot.reservationExpiresAt)} · Perú</dd></div> : null}
        <div><dt>Última consulta</dt><dd>{time(snapshot.observedAt)} · Perú</dd></div>
      </dl>
    </section>
  );
}
