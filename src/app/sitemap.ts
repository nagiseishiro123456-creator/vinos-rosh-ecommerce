import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";
import { publicSitemap, readSeoConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = readSeoConfig();

  if (!config.indexable) {
    return [];
  }

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: { slug: true, updatedAt: true },
    });

    return publicSitemap(products, config);
  } catch (error) {
    console.error("SITEMAP_PRODUCTS_ERROR", error);
    return publicSitemap([], config);
  }
}
