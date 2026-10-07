import { ChevronRight, CircleHelp } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre compras, pagos, envíos, pedidos y reseñas en Vinos ROSH.",
};

const faqs = [
  {
    q: "¿Necesito una cuenta para comprar?",
    a: "Sí. La cuenta permite guardar direcciones, revisar pedidos y habilitar reseñas verificadas después de la entrega.",
  },
  {
    q: "¿Cómo se calcula el envío?",
    a: "El costo se obtiene según la zona activa asociada al distrito seleccionado antes de confirmar el pedido.",
  },
  {
    q: "¿Qué medios de pago estarán disponibles?",
    a: "El sistema admite Yape manual y transferencia manual cuando el administrador los habilita. La integración automática con Culqi es opcional y no está activada en el preview.",
  },
  {
    q: "¿Cuándo se descuenta el stock?",
    a: "El stock se reserva al registrar un pedido con pago manual en revisión. Si la reserva vence o el pedido se cancela antes de aprobarse, las unidades vuelven al inventario.",
  },
  {
    q: "¿Cómo sé si mi pago fue aprobado?",
    a: "El estado del pedido cambia dentro de Mi Cuenta. El administrador revisa la operación antes de preparar el pedido.",
  },
  {
    q: "¿Las reseñas son reales?",
    a: "Sí. Una reseña solo puede crearse desde un pedido marcado como entregado y queda vinculada al producto comprado.",
  },
] as const;

export default function FaqPage() {
  return (
    <main className="faqPage">
      <div className="catalogHeaderWrap">
        <StoreHeader />
        <div className="catalogHero shell">
          <p className="eyebrow">AYUDA ROSH</p>
          <h1>Preguntas frecuentes</h1>
          <p>Información clara sobre la experiencia de compra.</p>
        </div>
      </div>

      <section className="faqShell shell">
        <div className="faqIntro">
          <span><CircleHelp size={26} /></span>
          <div>
            <p className="eyebrow wine">ANTES DE COMPRAR</p>
            <h2>Lo esencial, explicado de forma simple.</h2>
          </div>
        </div>

        <div className="faqList">
          {faqs.map((faq, index) => (
            <details key={faq.q} open={index === 0}>
              <summary>
                <span>{faq.q}</span>
                <ChevronRight size={19} aria-hidden="true" />
              </summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>

        <div className="faqContact">
          <div>
            <strong>¿Tu pregunta no está aquí?</strong>
            <span>Escríbenos y la consulta quedará registrada para atención.</span>
          </div>
          <Link className="button buttonDark" href="/contacto">Contactar</Link>
        </div>
      </section>

      <WhatsAppFab />
    </main>
  );
}
