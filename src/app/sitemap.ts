import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/productos`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: { slug: true, updatedAt: true },
    });

    return [
      ...staticRoutes,
      ...products.map((product) => ({
        url: `${baseUrl}/productos/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    console.error("SITEMAP_PRODUCTS_ERROR", error);
    return staticRoutes;
  }
}
