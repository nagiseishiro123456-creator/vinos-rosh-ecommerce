export const PUBLIC_NAVIGATION = [
  { label: "Inicio", href: "/#inicio", path: "/" },
  { label: "Comprar", href: "/#comprar", path: null },
  { label: "Nuestra historia", href: "/nuestra-historia", path: "/nuestra-historia" },
  { label: "Envíos", href: "/envios", path: "/envios" },
  { label: "Contacto", href: "/contacto", path: "/contacto" },
] as const;
export const PUBLIC_DESKTOP_NAVIGATION = PUBLIC_NAVIGATION.slice(2);
