export const siteConfig = {
  name: "Vinos ROSH",
  description:
    "Bebidas de uva sin alcohol de producción propia, elaboradas con dedicación familiar.",
  prototypeAssetsBase:
    "https://nagiseishiro123456-creator.github.io/vinos-rosh-prototype/assets",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "",
} as const;

export function getWhatsAppUrl(message = "Hola, quisiera información sobre Vinos ROSH.") {
  const phone = siteConfig.whatsappPhone.replace(/\D/g, "");
  if (!phone) return "#contacto";

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
