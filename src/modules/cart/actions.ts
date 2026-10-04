"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const productIdSchema = z.string().cuid();
const itemIdSchema = z.string().cuid();
const quantitySchema = z.coerce.number().int().min(1).max(99);

async function requireUserId(callbackUrl: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session.user.id;
}

export async function addToCart(productId: string, productSlug: string) {
  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedProductId.success) return;

  const userId = await requireUserId(`/productos/${productSlug}`);

  const product = await prisma.product.findFirst({
    where: { id: parsedProductId.data, active: true },
    select: { id: true, stock: true },
  });

  if (!product || product.stock <= 0) return;

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    select: { id: true, quantity: true },
  });

  const nextQuantity = Math.min((existing?.quantity ?? 0) + 1, product.stock);

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    create: { cartId: cart.id, productId: product.id, quantity: 1 },
    update: { quantity: nextQuantity },
  });

  revalidatePath("/carrito");
  revalidatePath(`/productos/${productSlug}`);
  redirect("/carrito");
}

export async function updateCartItem(itemId: string, formData: FormData) {
  const parsedItemId = itemIdSchema.safeParse(itemId);
  const parsedQuantity = quantitySchema.safeParse(formData.get("quantity"));
  if (!parsedItemId.success || !parsedQuantity.success) return;

  const userId = await requireUserId("/carrito");

  const item = await prisma.cartItem.findFirst({
    where: { id: parsedItemId.data, cart: { userId } },
    select: { id: true, product: { select: { stock: true, active: true } } },
  });

  if (!item?.product.active || item.product.stock <= 0) return;

  const quantity = Math.min(parsedQuantity.data, item.product.stock);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  revalidatePath("/carrito");
}

export async function removeCartItem(itemId: string) {
  const parsedItemId = itemIdSchema.safeParse(itemId);
  if (!parsedItemId.success) return;

  const userId = await requireUserId("/carrito");
  await prisma.cartItem.deleteMany({
    where: { id: parsedItemId.data, cart: { userId } },
  });
  revalidatePath("/carrito");
}
