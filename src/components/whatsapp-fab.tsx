import { MessageCircle } from "lucide-react";

import { getWhatsAppUrl } from "@/lib/site";

export function WhatsAppFab() {
  const href = getWhatsAppUrl();

  return (
    <a
      className="whatsappFab"
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      aria-label="Contactar a Vinos ROSH por WhatsApp"
    >
      <MessageCircle size={24} aria-hidden="true" />
      <span>WhatsApp</span>
    </a>
  );
}
