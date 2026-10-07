import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vinos ROSH",
    short_name: "ROSH",
    description: "Bebidas de uva sin alcohol de producción propia.",
    start_url: "/",
    display: "standalone",
    background_color: "#FCF7F1",
    theme_color: "#3E0A0F",
    lang: "es-PE",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
