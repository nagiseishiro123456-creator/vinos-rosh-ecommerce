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

export type PublicProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  firstName: string;
  createdAt: Date;
};

export type PublicProductDetail = PublicProductCard & {
  description: string;
  sku: string | null;
  images: { id: string; url: string; alt: string | null }[];
  publicReviews: PublicProductReview[];
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export type CatalogFilters = {
  query?: string;
  category?: string;
  inStock?: boolean;
  sort?: "featured" | "newest" | "price-asc" | "price-desc";
};

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  price: true,
  stock: true,
  images: {
    orderBy: { position: "asc" as const },
    take: 1,
    select: { url: true },
  },
  reviews: {
    where: { status: ReviewStatus.APPROVED },
    select: { rating: true },
  },
} as const;

function mapProductCard(product: {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: { toString(): string };
  stock: number;
  images: { url: string }[];
  reviews: { rating: number }[];
}): PublicProductCard {
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
}

export async function getFeaturedProducts(): Promise<PublicProductCard[]> {
  try {
    const products = await prisma.product.findMany({
      where: { active: true, featured: true },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: cardSelect,
    });

    return products.map(mapProductCard);
  } catch (error) {
    console.error("FEATURED_PRODUCTS_QUERY_ERROR", error);
    return [];
  }
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  try {
    const categories = await prisma.category.findMany({
      where: {
        active: true,
        products: { some: { active: true } },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: { where: { active: true } } },
        },
      },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      productCount: category._count.products,
    }));
  } catch (error) {
    console.error("PUBLIC_CATEGORIES_QUERY_ERROR", error);
    return [];
  }
}

export async function getPublicProducts(filters: CatalogFilters = {}): Promise<PublicProductCard[]> {
  try {
    const query = filters.query?.trim().slice(0, 80);
    const category = filters.category?.trim().slice(0, 140);
    const sort = filters.sort ?? "featured";

    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(filters.inStock ? { stock: { gt: 0 } } : {}),
        ...(category ? { category: { is: { slug: category, active: true } } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { shortDescription: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { sku: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy:
        sort === "price-asc"
          ? [{ price: "asc" }, { name: "asc" }]
          : sort === "price-desc"
            ? [{ price: "desc" }, { name: "asc" }]
            : sort === "newest"
              ? [{ createdAt: "desc" }]
              : [{ featured: "desc" }, { createdAt: "desc" }],
      select: cardSelect,
    });

    return products.map(mapProductCard);
  } catch (error) {
    console.error("PUBLIC_PRODUCTS_QUERY_ERROR", error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  try {
    const product = await prisma.product.findFirst({
      where: { slug, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        shortDescription: true,
        description: true,
        price: true,
        stock: true,
        images: {
          orderBy: { position: "asc" },
          select: { id: true, url: true, alt: true },
        },
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: { firstName: true },
            },
          },
        },
      },
    });

    if (!product) return null;

    const reviewCount = product.reviews.length;
    const rating = reviewCount
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : null;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      shortDescription: product.shortDescription,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,
      imageUrl: product.images[0]?.url ?? null,
      images: product.images,
      rating,
      reviewCount,
      publicReviews: product.reviews.slice(0, 8).map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        firstName: review.user.firstName,
        createdAt: review.createdAt,
      })),
    };
  } catch (error) {
    console.error("PRODUCT_DETAIL_QUERY_ERROR", error);
    return null;
  }
}
