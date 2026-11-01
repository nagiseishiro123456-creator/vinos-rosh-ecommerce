import type { Metadata, MetadataRoute } from "next";

type SeoEnvironment = { NODE_ENV?: string; PREVIEW_MODE?: string; NEXT_PUBLIC_APP_URL?: string };
export type SeoConfig = { origin: string | null; indexable: boolean };
export const DEFAULT_SITE_TITLE = "Vinos ROSH | Bebidas de uva sin alcohol";
export const DEFAULT_SITE_DESCRIPTION = "Bebidas de uva sin alcohol de producción propia. Conoce la historia, productos y experiencia ROSH.";

function publicHostname(hostname: string) {
  return hostname.includes(".") && hostname !== "localhost" && !hostname.endsWith(".localhost")
    && !hostname.endsWith(".local") && !hostname.startsWith("[") && !/^\d+(\.\d+){3}$/.test(hostname);
}
export function readSeoConfig(env: SeoEnvironment = {
  NODE_ENV: process.env.NODE_ENV, PREVIEW_MODE: process.env.PREVIEW_MODE,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}): SeoConfig {
  let origin: string | null = null;
  try {
    const raw = env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
    const url = new URL(raw);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash
      && url.pathname === "/" && !/[\s\\]/.test(raw)) origin = url.origin;
  } catch { /* An incomplete deployment remains unindexable, without a fabricated public URL. */ }
  const url = origin ? new URL(origin) : null;
  return { origin, indexable: env.NODE_ENV === "production" && env.PREVIEW_MODE === "false"
    && url?.protocol === "https:" && publicHostname(url.hostname) };
}
export function canonicalUrl(path: string, config = readSeoConfig()) {
  if (!/^\/(?!\/)/.test(path) || /[?#\\]/.test(path)) throw new Error("INVALID_CANONICAL_PATH");
  return config.origin ? new URL(path, config.origin).href : undefined;
}
export function publicImageUrl(source: string, config = readSeoConfig()) {
  try {
    if (!config.origin && source.startsWith("/")) return undefined;
    if (source.startsWith("//") || /[\s\\]/.test(source)) return undefined;
    const url = new URL(source, config.origin ?? undefined);
    if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) return undefined;
    if (!source.startsWith("/") && (url.protocol !== "https:" || !publicHostname(url.hostname))) return undefined;
    url.hash = "";
    return url.href;
  } catch { return undefined; }
}
export function publicPageMetadata({ path, title, description, image = "/brand/logo-rosh.webp", imageAlt = "Vinos ROSH", absoluteTitle = false, filtered = false }: {
  path: string; title: string; description: string; image?: string; imageAlt?: string; absoluteTitle?: boolean; filtered?: boolean;
}, config = readSeoConfig()): Metadata {
  const canonical = canonicalUrl(path, config);
  const imageUrl = publicImageUrl(image, config);
  const shareTitle = absoluteTitle ? title : `${title} | Vinos ROSH`;
  return {
    title: absoluteTitle ? { absolute: title } : title, description,
    alternates: canonical ? { canonical } : undefined,
    robots: { index: config.indexable && !filtered, follow: config.indexable, noarchive: !config.indexable, nosnippet: !config.indexable },
    openGraph: { type: "website", locale: "es_PE", siteName: "Vinos ROSH", title: shareTitle, description,
      ...(canonical ? { url: canonical } : {}), ...(imageUrl ? { images: [{ url: imageUrl, alt: imageAlt }] } : {}) },
    twitter: { card: "summary_large_image", title: shareTitle, description, ...(imageUrl ? { images: [{ url: imageUrl, alt: imageAlt }] } : {}) },
  };
}
export function privatePageMetadata(title?: string): Metadata {
  return { ...(title ? { title } : {}), robots: { index: false, follow: false, noarchive: true, nosnippet: true } };
}
export const PUBLIC_SITEMAP_PATHS = ["/", "/productos", "/nuestra-historia", "/contacto", "/preguntas-frecuentes", "/envios"] as const;
export function publicSitemap(products: readonly { slug: string; updatedAt: Date }[], config = readSeoConfig()): MetadataRoute.Sitemap {
  if (!config.indexable || !config.origin) return [];
  return [
    ...PUBLIC_SITEMAP_PATHS.map((path) => ({ url: canonicalUrl(path, config)!, changeFrequency: path === "/productos" ? "daily" as const : path === "/" || path === "/envios" ? "weekly" as const : "monthly" as const, priority: path === "/" ? 1 : path === "/productos" ? .9 : path === "/nuestra-historia" ? .7 : .6 })),
    ...products.map((product) => ({ url: canonicalUrl(`/productos/${encodeURIComponent(product.slug)}`, config)!, lastModified: product.updatedAt, changeFrequency: "weekly" as const, priority: .8 })),
  ];
}
export function publicRobots(config = readSeoConfig()): MetadataRoute.Robots {
  if (!config.indexable || !config.origin) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/mi-cuenta", "/carrito", "/checkout", "/pedidos", "/resenas", "/api", "/desarrollo", "/iniciar-sesion", "/registrarse", "/recuperar-contrasena", "/restablecer-contrasena"] }, sitemap: canonicalUrl("/sitemap.xml", config) };
}
