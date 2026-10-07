import { OrderStatus, ReviewStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getFeaturedVerifiedReviews(limit = 3) {
  const safeLimit = Math.min(6, Math.max(1, limit));

  return prisma.review.findMany({
    where: {
      status: ReviewStatus.APPROVED,
      order: {
        status: OrderStatus.DELIVERED,
      },
      comment: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: safeLimit,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      user: {
        select: {
          firstName: true,
        },
      },
      product: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });
}
