import { ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PublicProductCard = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
};

export async function getFeaturedProducts(): Promise<PublicProductCard[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        active: true,
        featured: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        price: true,
        stock: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { url: true },
        },
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          select: { rating: true },
        },
      },
    });

    return products.map((product) => {
      const reviewCount = product.reviews.length;
      const rating = reviewCount
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
        : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        price: Number(product.price),
        stock: product.stock,
        imageUrl: product.images[0]?.url ?? null,
        rating,
        reviewCount,
      };
    });
  } catch (error) {
    console.error("FEATURED_PRODUCTS_QUERY_ERROR", error);
    return [];
  }
}
