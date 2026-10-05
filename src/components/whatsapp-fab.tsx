import { MessageCircle } from "lucide-react";

import { getWhatsAppUrl } from "@/lib/site";
import { getCommerceSettings } from "@/modules/settings/queries";

export async function WhatsAppFab() {
  const settings = await getCommerceSettings();
  const href = getWhatsAppUrl(
    "Hola, quisiera información sobre Vinos ROSH.",
    settings.whatsappPhone,
  );

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
