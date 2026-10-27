"use client";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { PaymentConfirmationPreview } from "@/components/payment-confirmation-preview";
import { outboxCopy, type OutboxState } from "@/modules/notifications/confirmation-contract";
import { demoConfirmation } from "@/modules/notifications/demo";

export function ConfirmationDemo() {
  const [state, setState] = useState<OutboxState>("QUEUED");
  return <main className="shell adminPage notificationsPage"><p className="eyebrow wine">DEMOSTRACIÓN LOCAL · DATOS FICTICIOS · SIN ENVÍOS</p>
    <h1>Tu pedido se conserva si el correo falla.</h1><p className="adminIntro">Recorre los estados del aviso de confirmación y revisa el contenido que recibirá el comprador. Esta simulación visual no cambia pedidos ni envía correos.</p>
    <div className="notificationDetailGrid"><section className="adminCard"><h2>Pago confirmado · ejemplo</h2><p>Pedido ROSH-DEMO-0001 · S/ 98.20</p>
      <div role="status" aria-live="polite"><span className={`notificationState notificationState-${state.toLowerCase()}`}>{outboxCopy[state].label}</span><p>{outboxCopy[state].message}</p></div>
      <div className="notificationDemoControls"><button className="button" type="button" onClick={() => setState("QUEUED")}>Ver aviso pendiente</button><button className="button" type="button" onClick={() => setState("RETRY")}>Simular fallo de correo</button><button className="button buttonDark" type="button" onClick={() => setState("SENT")}>Simular recuperación</button><button className="button" type="button" onClick={() => setState("REVIEW")}>Ver revisión necesaria</button></div>
      <p className="notificationNotice">En la función real, el administrador revisa los avisos desde Confirmaciones. Los envíos externos están apagados por defecto.</p>
      <p>El pago y el aviso se guardan juntos. Un reintento conserva la identidad y el contenido del mismo correo.</p>
    </section><PaymentConfirmationPreview snapshot={demoConfirmation} /></div>
    <p><Link href={"/desarrollo/sprint-3" as Route}>Volver al recorrido del Sprint 3</Link></p></main>;
}
