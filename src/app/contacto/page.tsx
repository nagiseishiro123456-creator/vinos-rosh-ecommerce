import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { StoreHeader } from "@/components/store-header";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { getWhatsAppUrl } from "@/lib/site";
import { submitContactMessage } from "@/modules/contact/actions";
import { getCommerceSettings } from "@/modules/settings/queries";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contacta a Vinos ROSH para consultas sobre productos, pedidos y cobertura.",
};

type Props = {
  searchParams: Promise<{ sent?: string; error?: string }>;
};

export default async function ContactPage({ searchParams }: Props) {
  const [params, commerce] = await Promise.all([
    searchParams,
    getCommerceSettings(),
  ]);

  const whatsappUrl = getWhatsAppUrl(
    "Hola, quisiera información sobre Vinos ROSH.",
    commerce.whatsappPhone,
  );

  return (
    <main className="contactPage">
      <div className="catalogHeaderWrap">
        <StoreHeader />
        <div className="catalogHero shell">
          <p className="eyebrow">CONTACTO ROSH</p>
          <h1>Conversemos.</h1>
          <p>Consultas sobre productos, pedidos, cobertura y atención comercial.</p>
        </div>
      </div>

      <section className="contactShell shell">
        <div className="contactIntro">
          <p className="eyebrow wine">ATENCIÓN DIRECTA</p>
          <h2>Estamos preparando una experiencia cercana también fuera del checkout.</h2>
          <p>
            Puedes escribir desde este formulario. El mensaje queda registrado directamente
            en el panel administrativo, sin depender de un servicio de correo de pago.
          </p>

          <div className="contactChannels">
            <article>
              <Mail size={20} aria-hidden="true" />
              <div>
                <strong>Correo</strong>
                {commerce.contactEmail ? (
                  <a href={`mailto:${commerce.contactEmail}`}>{commerce.contactEmail}</a>
                ) : (
                  <span>Pendiente de configurar</span>
                )}
              </div>
            </article>
            <article>
              <MessageCircle size={20} aria-hidden="true" />
              <div>
                <strong>WhatsApp</strong>
                {commerce.whatsappPhone ? (
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">Abrir conversación</a>
                ) : (
                  <span>Pendiente de configurar</span>
                )}
              </div>
            </article>
            <article>
              <ShieldCheck size={20} aria-hidden="true" />
              <div>
                <strong>Privacidad</strong>
                <span>Usamos los datos solo para responder tu consulta.</span>
              </div>
            </article>
          </div>
        </div>

        <div className="contactFormCard">
          <p className="eyebrow wine">ENVÍA UN MENSAJE</p>
          <h2>¿En qué podemos ayudarte?</h2>

          {params.sent === "1" ? (
            <div className="contactNotice success">
              Mensaje recibido. El equipo podrá revisarlo desde el panel administrativo.
            </div>
          ) : null}

          {params.error === "validation" ? (
            <div className="contactNotice error">
              Revisa los campos e intenta nuevamente.
            </div>
          ) : null}

          {params.error === "rate" ? (
            <div className="contactNotice error">
              Se enviaron varios mensajes en poco tiempo. Intenta nuevamente más tarde.
            </div>
          ) : null}

          <form action={submitContactMessage} className="contactForm">
            <div className="contactFormGrid">
              <label>
                <span>Nombre</span>
                <input name="name" type="text" minLength={2} maxLength={80} required autoComplete="name" />
              </label>
              <label>
                <span>Correo</span>
                <input name="email" type="email" maxLength={160} required autoComplete="email" />
              </label>
            </div>

            <div className="contactFormGrid">
              <label>
                <span>Celular <small>opcional</small></span>
                <input name="phone" type="tel" maxLength={30} autoComplete="tel" />
              </label>
              <label>
                <span>Asunto <small>opcional</small></span>
                <input name="subject" type="text" maxLength={120} />
              </label>
            </div>

            <label>
              <span>Mensaje</span>
              <textarea name="message" minLength={10} maxLength={2000} required rows={7} />
            </label>

            <label className="contactHoneypot" aria-hidden="true">
              <span>Sitio web</span>
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>

            <button className="button buttonPrimary fullButton" type="submit">
              Enviar mensaje
            </button>
          </form>
        </div>
      </section>

      <WhatsAppFab />
    </main>
  );
}
