"use server";

import { OrderStatus, ReviewStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

const idSchema = z.string().cuid();
const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1200).optional(),
});

async function requireCustomer(callbackUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session.user.id;
}

export async function submitVerifiedReview(orderItemId: string, formData: FormData) {
  const parsedId = idSchema.safeParse(orderItemId);
  if (!parsedId.success) return;

  const userId = await requireCustomer(`/resenas/${orderItemId}`);
  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  });

  if (!parsed.success) {
    redirect(`/resenas/${orderItemId}?status=invalid`);
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: {
      id: parsedId.data,
      order: {
        userId,
        status: OrderStatus.DELIVERED,
      },
    },
    select: {
      id: true,
      productId: true,
      orderId: true,
      order: { select: { number: true } },
      review: { select: { id: true } },
    },
  });

  if (!orderItem) {
    redirect("/mi-cuenta?review=not-eligible");
  }

  if (orderItem.review) {
    redirect(`/pedidos/${orderItem.order.number}?review=exists`);
  }

  await prisma.review.create({
    data: {
      userId,
      productId: orderItem.productId,
      orderId: orderItem.orderId,
      orderItemId: orderItem.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
      status: ReviewStatus.PENDING,
    },
  });

  revalidatePath(`/pedidos/${orderItem.order.number}`);
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/resenas");
  redirect(`/pedidos/${orderItem.order.number}?review=sent`);
}

export async function moderateReview(reviewId: string, decision: "APPROVED" | "REJECTED") {
  await requireAdmin("/admin/resenas");
  const parsedId = idSchema.safeParse(reviewId);
  if (!parsedId.success) return;

  const review = await prisma.review.findUnique({
    where: { id: parsedId.data },
    select: { id: true, product: { select: { slug: true } } },
  });

  if (!review) return;

  await prisma.review.update({
    where: { id: review.id },
    data: {
      status: decision === "APPROVED" ? ReviewStatus.APPROVED : ReviewStatus.REJECTED,
    },
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath(`/productos/${review.product.slug}`);
  revalidatePath("/admin/resenas");
}
