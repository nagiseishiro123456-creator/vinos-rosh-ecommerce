"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { paymentStatusSchema, type PaymentStatusSnapshot } from "@/modules/payments/izipay/status-contract";
import { PaymentProgressPanel } from "./payment-progress-panel";

export function PaymentStatusCard({ initialStatus, expectedUserId }: { initialStatus: PaymentStatusSnapshot; expectedUserId: string }) {
  const [snapshot, setSnapshot] = useState<PaymentStatusSnapshot | null>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => {
    const controller = active.current;
    active.current = null;
    controller?.abort();
  }, []);

  async function refresh() {
    if (active.current || !snapshot) return;
    const controller = new AbortController();
    active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams({ orderId: initialStatus.orderId, expectedUserId });
      const response = await fetch(`/api/payment/status?${query}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.status === 401 || response.status === 409) {
        setSnapshot(null); setError("La sesión cambió. Vuelve a ingresar para consultar este pedido."); return;
      }
      if (!response.ok) {
        setError(response.status === 429 ? "Espera un momento antes de volver a consultar." : "No pudimos actualizar el estado. Mostramos la última consulta guardada."); return;
      }
      const result = paymentStatusSchema.safeParse(await response.json());
      if (controller.signal.aborted) return;
      if (!result.success || result.data.orderId !== initialStatus.orderId) {
        setError("No pudimos verificar la respuesta. Mostramos la última consulta guardada."); return;
      }
      setSnapshot(result.data);
    } catch {
      if (active.current === controller) setError("No hay respuesta de la tienda. Conservamos la última consulta; actualizar no realiza un cobro.");
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }

  return (
    <div className="automaticPaymentCard">
      {snapshot ? <PaymentProgressPanel snapshot={snapshot} /> : null}
      {error ? <p className="automaticPaymentError" role="alert">{error}</p> : null}
      <div className="automaticPaymentActions">
        {snapshot ? <button type="button" className="button buttonDark" disabled={busy} onClick={refresh}><RefreshCw size={17} aria-hidden="true" />{busy ? "Consultando…" : "Actualizar estado"}</button>
          : <Link className="button buttonDark" href="/iniciar-sesion">Volver a ingresar</Link>}
        <Link className="textLink" href="/contacto">Contactar a la tienda</Link>
      </div>
      <p className="automaticPaymentNote">La consulta muestra información guardada por el servidor. Actualizar no inicia ni repite un pago.</p>
    </div>
  );
}
