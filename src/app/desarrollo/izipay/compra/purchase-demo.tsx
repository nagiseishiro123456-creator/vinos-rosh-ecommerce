"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/money";

const steps = ["Botella", "Carrito", "Entrega", "Pago", "Resultado"];
const UNIT_CENTS = 2990;
const SHIPPING_CENTS = 850;
const MAX_QUANTITY = 12;
const price = (value: number) => formatPrice((value / 100).toFixed(2));
type Outcome = "approved" | "rejected" | "pending";
type Address = { recipient: string; phone: string; street: string };

/** Local component state only: no cart APIs, payment SDK, persistence or server actions. */
export function CustomerPurchaseDemo() {
  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartQuantity, setCartQuantity] = useState(0);
  const [address, setAddress] = useState<Address>({ recipient: "Cliente de prueba", phone: "999999999", street: "Calle de ejemplo 123" });
  const [outcome, setOutcome] = useState<Outcome>("approved");
  const [result, setResult] = useState<Outcome | null>(null);
  const [consulted, setConsulted] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const total = cartQuantity * UNIT_CENTS + SHIPPING_CENTS;

  useEffect(() => { heading.current?.focus(); }, [step]);

  function advance(next: number) {
    setStep(next);
  }
  function deliver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    advance(3);
  }
  function pay() {
    if (result) return;
    setResult(outcome);
    advance(4);
  }
  function restart() {
    setCartQuantity(0); setQuantity(1); setOutcome("approved"); setResult(null); setConsulted(0);
    setAddress({ recipient: "Cliente de prueba", phone: "999999999", street: "Calle de ejemplo 123" });
    advance(0);
  }
  function quantityControl(value: number, change: (quantity: number) => void, minimum = 1) {
    return <div className="customerDemoQuantity" aria-label="Cantidad de botellas">
      <button type="button" aria-label="Quitar una botella" disabled={value <= minimum} onClick={() => change(value - 1)}>−</button>
      <output aria-label="Botellas seleccionadas" aria-live="polite">{value}</output>
      <button type="button" aria-label="Agregar una botella" disabled={value >= MAX_QUANTITY} onClick={() => change(value + 1)}>+</button>
    </div>;
  }

  return <section className="shell customerDemoShell">
    <div className="customerDemoNotice"><strong>COMPRA SIMULADA · SIN COBROS</strong>
      <p>Prueba como cliente con datos de ejemplo. No usa Izipay, no crea pedidos, no guarda direcciones y no modifica tu carrito ni el stock de la tienda.</p>
      <p>El precio de {price(UNIT_CENTS)}, el envío y la disponibilidad son ilustrativos. Al recargar se reinicia esta demostración.</p>
    </div>
    <nav aria-label="Pasos de la compra simulada"><ol className="customerDemoSteps">{steps.map((label, index) =>
      <li key={label} aria-current={step === index ? "step" : undefined} className={index <= step ? "active" : ""}><span>{index + 1}</span>{label}</li>)}</ol></nav>
    <div className="checkoutHeading"><div><p className="eyebrow wine">TU RECORRIDO COMO CLIENTE</p>
      <h1 ref={heading} tabIndex={-1}>{["Una botella para compartir", "Tu carrito de prueba", "¿Dónde te lo entregamos?", "Revisa y simula tu pago", "Resultado de la simulación"][step]}</h1>
    </div></div>
    <div className="customerDemoGrid">
      <div className="customerDemoMain">
        {step === 0 ? <section className="checkoutBlock customerDemoProduct" aria-label="Botella de ejemplo">
          <Image src="/media/rosh/landing/bottle.png" alt="Botella ROSH de 750 ml" width={570} height={810} sizes="(max-width: 600px) 55vw, 230px" priority />
          <div><p className="eyebrow wine">ROSH · 750 ML</p><h2>Vino de uvas sin alcohol</h2>
            <p>Un único producto. Elige cuántas botellas quieres para esta prueba.</p>
            <p className="customerDemoPrice">{price(UNIT_CENTS)} <small>por botella · ejemplo</small></p>
            {quantityControl(quantity, setQuantity)}
            <button type="button" className="button buttonDark" onClick={() => { setCartQuantity(quantity); advance(1); }}>Añadir al carrito de prueba</button>
          </div>
        </section> : null}
        {step === 1 ? <section className="checkoutBlock" aria-label="Carrito simulado">
          {cartQuantity ? <><h2>ROSH · 750 ml</h2><p>{price(UNIT_CENTS)} por botella · precio de ejemplo</p>
            {quantityControl(cartQuantity, setCartQuantity)}
            <button type="button" className="textLink" onClick={() => setCartQuantity(0)}>Eliminar del carrito de prueba</button>
            <div className="customerDemoActions"><button type="button" className="button buttonDark" onClick={() => advance(2)}>Continuar con la entrega</button></div>
          </> : <><h2>Tu carrito de prueba está vacío</h2><p>Elige una botella para continuar.</p></>}
          <button type="button" className="textLink" onClick={() => { setQuantity(cartQuantity || 1); advance(0); }}>Volver a la botella</button>
        </section> : null}
        {step === 2 ? <form className="checkoutBlock checkoutForm" onSubmit={deliver}>
          <h2>Datos de entrega de ejemplo</h2><p>No necesitas iniciar sesión. Usa los datos ficticios precargados; solo permanecen en esta pantalla.</p>
          <div className="formField"><label htmlFor="demo-recipient">Nombre de quien recibe</label><input id="demo-recipient" required minLength={2} maxLength={80} autoComplete="off" value={address.recipient} onChange={event => setAddress({ ...address, recipient: event.target.value })} /></div>
          <div className="formField"><label htmlFor="demo-phone">Celular de ejemplo</label><input id="demo-phone" required pattern="[0-9]{9}" title="Usa exactamente 9 números, por ejemplo 999999999." inputMode="numeric" maxLength={9} autoComplete="off" aria-describedby="demo-phone-hint" value={address.phone} onChange={event => setAddress({ ...address, phone: event.target.value })} /><small id="demo-phone-hint">Debe tener 9 números. Puedes dejar 999999999.</small></div>
          <div className="formField"><label htmlFor="demo-street">Dirección de ejemplo</label><input id="demo-street" required minLength={5} maxLength={120} autoComplete="off" value={address.street} onChange={event => setAddress({ ...address, street: event.target.value })} /></div>
          <div className="formField"><label htmlFor="demo-zone">Zona de entrega</label><select id="demo-zone" defaultValue="example"><option value="example">Zona de ejemplo · {price(SHIPPING_CENTS)}</option></select><small>Esta zona y su tarifa no son condiciones comerciales de ROSH.</small></div>
          <div className="customerDemoActions"><button className="button buttonDark" type="submit">Continuar al pago simulado</button><button type="button" className="textLink" onClick={() => advance(1)}>Volver al carrito</button></div>
        </form> : null}
        {step === 3 ? <section className="checkoutBlock" aria-label="Pago simulado">
          <h2>Izipay · demostración</h2><p>En la compra real, aquí abrirás el formulario del proveedor. Hoy puedes ensayar el resultado sin tarjetas, claves ni QR de cobro.</p>
          <fieldset className="customerDemoOutcomes"><legend>Elige el resultado para esta prueba</legend>
            {([['approved', 'Aprobación simulada'], ['rejected', 'Rechazo simulado'], ['pending', 'Sin respuesta definitiva']] as const).map(([value, label]) => <label key={value}><input type="radio" name="demo-outcome" value={value} checked={outcome === value} onChange={() => setOutcome(value)} />{label}</label>)}
          </fieldset>
          <div className="customerDemoActions"><button type="button" className="button buttonDark" onClick={pay}>Simular pago de {price(total)}</button><button type="button" className="textLink" onClick={() => advance(2)}>Editar entrega</button></div>
        </section> : null}
        {step === 4 ? <section className="checkoutBlock" aria-label="Resultado de compra simulada">
          <div role="status" aria-live="polite">
            <p className="eyebrow wine">REFERENCIA FICTICIA · ROSH-DEMO</p>
            <h2>{result === "approved" ? "Compra simulada aprobada" : result === "rejected" ? "Pago simulado rechazado" : "Conservamos tu intento simulado"}</h2>
            <p>{result === "approved" ? "Terminaste el recorrido como cliente. Este resultado es ficticio: no acredita dinero, no envía correo ni habilita una entrega." : result === "rejected" ? "La demostración terminó sin aprobación. No se cobró nada. Puedes iniciar otra demostración con un resultado diferente." : "No hay un resultado definitivo. La compra real conservaría el intento para revisarlo antes de permitir otro pago."}</p>
          </div>
          {result === "pending" ? <><button type="button" className="button" onClick={() => setConsulted(value => value + 1)}>Consultar estado sin repetir el pago</button><p role="status">{consulted ? `Consulta ${consulted} completada: sigue pendiente. No se inició otro pago.` : "Puedes consultar sin abrir otro intento."}</p></> : null}
          <div className="customerDemoActions"><button type="button" className="button buttonDark" onClick={restart}>Reiniciar demostración</button></div>
          <p><small>Reiniciar solo borra esta simulación local; no representa un reintento de cobro.</small></p>
        </section> : null}
      </div>
      <aside className="orderReviewCard" aria-labelledby="demo-summary-title">
        <p className="eyebrow wine">RESUMEN DE EJEMPLO</p><h2 id="demo-summary-title">Tu compra simulada</h2>
        <p>{step === 0 ? quantity : cartQuantity} × ROSH · 750 ml</p>
        <div className="summaryRow"><span>Botellas</span><strong>{price((step === 0 ? quantity : cartQuantity) * UNIT_CENTS)}</strong></div>
        <div className="summaryRow"><span>Envío ilustrativo</span><strong>{step >= 2 ? price(SHIPPING_CENTS) : "Por elegir"}</strong></div>
        <div className="summaryTotal"><span>{step < 2 ? "Subtotal" : "Total de ejemplo"}</span><strong>{price(step === 0 ? quantity * UNIT_CENTS : step === 1 ? cartQuantity * UNIT_CENTS : total)}</strong></div>
        {step >= 3 ? <div className="orderReviewAddress"><strong>{address.recipient}</strong><span>{address.street}</span><span>Zona de ejemplo</span><span>{address.phone}</span></div> : null}
        <p className="customerDemoNote">No es un pedido registrado ni un comprobante de pago.</p>
      </aside>
    </div>
    <footer className="customerDemoFooter"><Link href="/desarrollo/izipay">Volver a las pruebas de errores de Izipay</Link><Link href="/">Salir a la tienda real</Link></footer>
  </section>;
}
