"use client";

import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { PaymentProgressPanel } from "@/components/payment-progress-panel";
import { PaymentStatusCard } from "@/components/payment-status-card";
import type { PaymentProgressState, PaymentStatusSnapshot } from "@/modules/payments/izipay/status-contract";

const scenes = [
  { id: "reserved", label: "01 · Reserva" },
  { id: "prepared", label: "02 · Formulario" },
  { id: "initiating", label: "03 · Espera" },
  { id: "uncertain", label: "04 · Recuperación" },
  { id: "confirmed", label: "05 · Confirmación" },
  { id: "expired", label: "06 · Vencimiento" },
  { id: "query", label: "Consulta de estado" },
] as const;
type Scene = typeof scenes[number]["id"];

function example(state: PaymentProgressState): PaymentStatusSnapshot {
  return { orderId: "cm123456789012345678901234", orderNumber: "ROSH-DEMO-0001", state,
    orderStatus: state === "confirmed" ? "PAID" : "PENDING_PAYMENT", total: "98.20", currency: "PEN",
    reservationExpiresAt: "2026-10-23T20:15:00.000Z", observedAt: "2026-10-23T20:00:00.000Z",
    confirmedAt: state === "confirmed" ? "2026-10-23T20:00:00.000Z" : null };
}

export function SprintPaymentPreview() {
  const [scene, setScene] = useState<Scene>("reserved");
  const index = scenes.findIndex((item) => item.id === scene);
  return (
    <main className="sprintPreview">
      <div className="sprintDemoBanner"><span>DEMOSTRACIÓN LOCAL</span> Datos de ejemplo · No realiza cobros</div>
      <header className="sprintPreviewHeader"><Link href="/" aria-label="ROSH, volver a la tienda">ROSH<span>DE NUESTRO VIÑEDO A TU MESA</span></Link><p><LockKeyhole size={15} aria-hidden="true" /> Recorrido de compra · Sprint 3</p></header>
      <div className="sprintPreviewWrap">
        <div className="sprintPreviewIntro"><p className="sprintKicker">PAGOS Y COMUNICACIÓN</p><h1>Una compra clara,<br />de principio a fin.</h1><p>Explora las pantallas previstas para el pago de tu pedido. Los resultados que ves aquí son simulados.</p></div>
        <nav className="sprintSceneNav" aria-label="Escenarios del Sprint 3">{scenes.map((item) => <button type="button" key={item.id} aria-pressed={scene === item.id} onClick={() => setScene(item.id)}>{item.label}</button>)}</nav>
        <div className="sprintPreviewGrid">
          <section className="sprintFlow" aria-label="Vista del recorrido">
            <p className="sprintSceneLabel">VISTA DE EJEMPLO · {scenes[index].label.toUpperCase()}</p>
            {scene === "query" ? <>
              <p className="sprintQueryNotice">Este panel usa la consulta implementada. El pedido es ficticio: sin una sesión y un pedido propios, la consulta no devolverá su estado.</p>
              <PaymentStatusCard initialStatus={example("reserved")} expectedUserId="cm123456789012345678901235" />
            </> : <PaymentProgressPanel snapshot={example(scene)} />}
            {scene === "reserved" ? <div className="sprintNextAction"><p>Cuando el formulario oficial esté integrado, podrás continuar desde tu reserva sin crear otro pedido.</p><button type="button" className="button buttonDark" onClick={() => setScene("prepared")}>Ver formulario de ejemplo <ArrowRight size={16} aria-hidden="true" /></button></div> : null}
            {scene === "prepared" ? <div className="sprintProviderSlot"><LockKeyhole size={24} aria-hidden="true" /><h3>Aquí irá el formulario oficial</h3><p>Integración pendiente con el producto habilitado por Izipay. Esta vista no solicita datos de tarjetas ni inicia un pago.</p><span>PENDIENTE · SANDBOX DEL PROVEEDOR</span></div> : null}
            {scene === "initiating" ? <div className="sprintNextAction"><p>La siguiente pantalla se habilitará al verificar el resultado. Un tiempo de espera no debe provocar otro cobro.</p><button type="button" className="button buttonDark" onClick={() => setScene("uncertain")}>Ver caso de recuperación <ArrowRight size={16} aria-hidden="true" /></button></div> : null}
            {scene === "uncertain" || scene === "expired" ? <div className="sprintNextAction"><p>Se conservará la referencia del pedido para revisar la operación con la tienda. No se propondrá pagar de nuevo mientras el resultado sea incierto.</p><button type="button" className="button buttonDark" onClick={() => setScene("confirmed")}>Ver confirmación simulada <ArrowRight size={16} aria-hidden="true" /></button></div> : null}
            {scene === "confirmed" ? <div className="sprintMailPreview"><Mail size={23} aria-hidden="true" /><div><h3>La confirmación también llegará por correo</h3><p>Próximo desarrollo: envío recuperable con el resumen del pedido. Si el correo falla, el pedido conservará su confirmación.</p><span>VISTA PREVISTA · ENVÍO AÚN PENDIENTE</span></div></div> : null}
            <div className="sprintSceneControls"><button type="button" disabled={index === 0} onClick={() => setScene(scenes[index - 1].id)}><ArrowLeft size={16} aria-hidden="true" /> Anterior</button><span>{index + 1} / {scenes.length}</span><button type="button" disabled={index === scenes.length - 1} onClick={() => setScene(scenes[index + 1].id)}>Siguiente <ArrowRight size={16} aria-hidden="true" /></button></div>
          </section>
          <aside className="sprintOrderSummary" aria-label="Resumen de ejemplo"><p className="sprintKicker">TU PEDIDO DE EJEMPLO</p><div className="sprintProduct"><Image src="/media/rosh/home/botella-uvas.webp" width={100} height={120} alt="Botella ROSH entre uvas, fotografía del cliente" /><div><h3>ROSH · Bebida de uva</h3><p>3 botellas · S/ 29.90 c/u</p><span>Producto y precio ilustrativos</span></div></div><dl><div><dt>Productos</dt><dd>S/ 89.70</dd></div><div><dt>Envío de ejemplo</dt><dd>S/ 8.50</dd></div><div className="sprintTotal"><dt>Total</dt><dd>S/ 98.20</dd></div></dl><p className="sprintOrderSafety"><ShieldCheck size={20} aria-hidden="true" /><span>La confirmación real dependerá de la verificación del servidor y del proveedor.</span></p></aside>
        </div>
        <section className="sprintRoadmap" aria-labelledby="sprint-roadmap-title"><p className="sprintKicker">LO QUE SIGUE EN ESTE SPRINT</p><h2 id="sprint-roadmap-title">Del pedido reservado a la confirmación.</h2><div className="sprintRoadmapGrid">
          {[{ code: "S3-02", title: "Reserva y consulta", text: "Implementadas con sesión y pedido propios. Falta conectar el formulario oficial.", ready: true },
            { code: "S3-03", title: "Confirmación auténtica", text: "Verificar notificaciones y aplicar el resultado una sola vez, incluso si se repite.", ready: false },
            { code: "S3-04", title: "Revisión de operaciones", text: "Comparar el pago, las comisiones y el abono para detectar diferencias.", ready: false },
            { code: "S3-05", title: "Correo recuperable", text: "Guardar la notificación y reintentar su envío sin duplicar el pedido.", ready: false }].map((item) => <article key={item.code}><span>{item.ready ? <Check size={15} aria-hidden="true" /> : null}{item.code} · {item.ready ? "AVANCE PARCIAL" : "PENDIENTE"}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div></section>
        <footer className="sprintPreviewFooter">Solo desarrollo local · Sin claves, datos de tarjetas ni cobros reales · Diseño de la tienda pendiente de revisión</footer>
      </div>
    </main>
  );
}
