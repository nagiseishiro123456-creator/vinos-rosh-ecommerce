"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PaymentFormSession, type FormPorts, type FormPhase, type FormView } from "@/modules/payments/izipay/form-session";
import { createBrowserFormPorts } from "@/modules/payments/izipay/form-browser";
import type { PaymentStatusSnapshot } from "@/modules/payments/izipay/status-contract";

const copy: Record<FormPhase, [string, string]> = {
  idle: ["Prepara tu pago de prueba", "El importe corresponde a tu pedido reservado. Abre el formulario una sola vez."],
  starting: ["Preparando el formulario…", "Estamos comprobando la reserva y preparando el mismo intento. No cierres ni actualices esta pantalla."],
  form: ["Formulario de prueba de Izipay", "Introduce únicamente datos de prueba autorizados por Izipay. El resultado se confirmará desde el servidor."],
  waiting: ["Verificando el resultado", "Todavía no hay una confirmación del servidor. Consulta el estado y no realices otro pago."],
  recovery: ["Conservamos tu intento", "No podemos confirmar el resultado ni reabrir el formulario. Consulta el estado o contacta a la tienda con tu número de pedido. No pagues otra vez."],
  session: ["La sesión cambió", "Vuelve a ingresar con la cuenta del pedido para consultar su estado. Esta pantalla no iniciará otro pago."],
  expired: ["La reserva venció", "El formulario se cerró. Si habías enviado el pago, contacta a la tienda antes de comprar nuevamente."],
  confirmed: ["Pago confirmado por el servidor", "La confirmación está registrada en el pedido. Puedes consultar su preparación y entrega."],
  test_confirmed: ["Prueba aprobada", "El servidor verificó el resultado de sandbox. No acredita dinero recibido, no envía un correo de compra y no habilita el despacho."],
  closed: ["El pedido está cerrado", "Consulta el pedido o contacta a la tienda si tienes una operación pendiente de revisar."],
};

export function IzipayTestForm({ initial, expectedUserId, portsFactory, mode = "TEST" }: {
  initial: PaymentStatusSnapshot; expectedUserId: string; portsFactory?: (host: HTMLElement) => FormPorts; mode?: "TEST" | "PRODUCTION";
}) {
  const host = useRef<HTMLDivElement>(null), session = useRef<PaymentFormSession | null>(null);
  const [view, setView] = useState<FormView>(() => {
    const unused = { status: async () => initial, initiate: async () => null, mount: async () => {}, clear: () => {} };
    return new PaymentFormSession(initial, unused, () => {}).current();
  });
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    try {
      const ports = portsFactory ? portsFactory(host.current!) : createBrowserFormPorts(initial.orderId, expectedUserId, host.current!);
      const current = new PaymentFormSession(initial, ports, setView);
      session.current = current;
      const hide = () => current.dispose();
      const show = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
      window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
      return () => { window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show); session.current = null; current.dispose(); };
    } catch {
      // Notify on an event instead of opening another SDK/session during a remount.
      session.current = null;
    }
  }, [initial, expectedUserId, portsFactory]);
  useEffect(() => {
    if (view.phase !== "form") return;
    const check = () => { if (document.visibilityState === "visible") void session.current?.refresh(); };
    const timer = setInterval(check, 15000);
    window.addEventListener("focus", check); document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [view.phase]);
  const liveCopy: Partial<Record<FormPhase, [string,string]>> = { idle: ["Prepara tu pago", "El importe corresponde a tu pedido reservado. Abre el formulario una sola vez."], form: ["Formulario de Izipay", "Ingresa tus datos en el formulario del proveedor. El resultado se confirmará desde el servidor."] };
  const phase = unavailable ? "recovery" : view.phase;
  const [title, description] = mode === "PRODUCTION" && liveCopy[phase] ? liveCopy[phase]! : copy[phase];
  return <section className="izipayTestCard" aria-label={mode === "TEST" ? "Pago de prueba Izipay" : "Pago Izipay"}>
    <p className="izipayTestBadge">{mode === "TEST" ? "PRUEBAS · SIN VENTA HABILITADA" : "IZIPAY · PAGO DEL PEDIDO"}</p>
    <dl className="izipayTestFacts"><div><dt>Pedido</dt><dd>{initial.orderNumber}</dd></div><div><dt>Total reservado</dt><dd>S/ {initial.total}</dd></div></dl>
    <div role="status" aria-live="polite"><h2>{title}</h2><p>{description}</p></div>
    <div ref={host} className="izipayTestHost" hidden={view.phase !== "starting" && view.phase !== "form"} />
    <div className="izipayTestActions">
      {unavailable && initial.state === "reserved" ? <button type="button" className="button" onClick={() => window.location.reload()}>Recargar pantalla y consultar el pedido</button> : null}
      {view.phase === "idle" && !unavailable ? <button type="button" className="button buttonDark" onClick={() => {
        if (session.current) void session.current.start(); else setUnavailable(true);
      }}>{mode === "TEST" ? "Abrir formulario de prueba" : "Abrir formulario de pago"}</button> : null}
      {!["starting", "form", "session"].includes(view.phase) ? <button type="button" className="button" disabled={view.busy} onClick={() => {
        if (session.current) void session.current.refresh(); else setUnavailable(true);
      }}>{view.busy ? "Consultando…" : "Consultar estado sin repetir el pago"}</button> : null}
      {view.phase === "session" ? <Link className="button" href="/iniciar-sesion">Volver a ingresar</Link> : null}
      <Link href="/contacto" className="textLink">Contactar a la tienda</Link>
    </div>
    <p className="izipayTestNote">La consulta no realiza cobros. Si cierras o recargas esta pantalla, el intento se conserva y puede necesitar revisión.</p>
  </section>;
}
