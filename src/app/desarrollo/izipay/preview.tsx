"use client";

import { useCallback, useState } from "react";
import { IzipayTestForm } from "@/components/izipay-test-form";
import { FormSessionChanged, type FormPorts } from "@/modules/payments/izipay/form-session";
import type { PaymentStatusSnapshot } from "@/modules/payments/izipay/status-contract";

const scenarios = { normal: "Formulario y espera", lost: "Respuesta perdida", prepared: "Formulario cerrado", session: "Cambio de sesión", expired: "Reserva vencida" };
type Scenario = keyof typeof scenarios;
function example(scenario: Scenario): PaymentStatusSnapshot {
  return { orderId: "cm123456789012345678901234", orderNumber: "ROSH-SIMULACION", orderStatus: "PENDING_PAYMENT",
    total: "98.20", currency: "PEN", confirmedAt: null, observedAt: new Date().toISOString(),
    reservationExpiresAt: new Date(Date.now() + (scenario === "expired" ? -60000 : 900000)).toISOString(),
    state: scenario === "expired" ? "expired" : scenario === "prepared" ? "prepared" : "reserved" };
}
function PreviewScene({ scenario }: { scenario: Scenario }) {
  const [initial] = useState(() => example(scenario));
  const factory = useCallback((host: HTMLElement): FormPorts => {
    let requested = false;
    return {
      status: async () => { if (scenario === "session") throw new FormSessionChanged(); return { ...initial, state: requested ? "prepared" : initial.state }; },
      initiate: async () => {
        requested = true;
        if (scenario === "lost") throw new Error("SIMULATED_INTERRUPTION");
        return { kind: "token_ready", attemptId: "cm223456789012345678901234", formToken: "SIMULATED-NOT-A-TOKEN", publicKey: "SIMULATED-NOT-A-KEY" };
      },
      mount: async (_token, _key, submitted) => {
        const panel = document.createElement("p"); panel.textContent = "Formulario simulado. No introduzcas datos de tarjeta.";
        const button = document.createElement("button"); button.type = "button"; button.className = "button";
        button.textContent = "Simular retorno del formulario"; button.onclick = () => { submitted(); };
        host.replaceChildren(panel, button);
      },
      clear: () => host.replaceChildren(),
    };
  }, [initial, scenario]);
  return <IzipayTestForm initial={initial} expectedUserId="cm323456789012345678901234" portsFactory={factory} />;
}
export function IzipayFormPreview() {
  const [scenario, setScenario] = useState<Scenario>("normal");
  return <><nav className="izipayTestScenarios" aria-label="Escenarios de simulación">{Object.entries(scenarios).map(([id, label]) =>
    <button key={id} type="button" aria-pressed={scenario === id} onClick={() => setScenario(id as Scenario)}>{label}</button>)}</nav>
    <PreviewScene key={scenario} scenario={scenario} /></>;
}
