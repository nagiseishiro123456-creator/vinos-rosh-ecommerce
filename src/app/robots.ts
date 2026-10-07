import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const previewMode = process.env.PREVIEW_MODE === "true";

  if (previewMode) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/mi-cuenta/", "/checkout", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
