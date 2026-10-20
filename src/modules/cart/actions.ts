"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { CartCommandError, executeCartCommand } from "./account-service";
import type { CartCommand } from "./account-contract";

async function execute(command: CartCommand, operationId: string, expectedUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/iniciar-sesion?callbackUrl=/carrito");
  if (session.user.id !== expectedUserId) redirect("/carrito?error=cart-changed");
  try { await executeCartCommand(session.user.id, { ...command, expectedUserId: session.user.id, operationId }); }
  catch (error) {
    if (error instanceof CartCommandError) redirect("/carrito?error=cart-changed");
    throw error;
  }
  revalidatePath("/", "layout");
}
export async function addToCart(productId: string, _productSlug: string, operationId: string, expectedUserId: string) {
  await execute({ action: "add", productId }, operationId, expectedUserId); redirect("/carrito");
}
export async function updateCartItem(productId: string, operationId: string, expectedUserId: string, formData: FormData) {
  const parsed = z.coerce.number().int().min(1).max(99).safeParse(formData.get("quantity"));
  if (!parsed.success) return;
  await execute({ action: "set", productId, quantity: parsed.data }, operationId, expectedUserId);
}
export async function removeCartItem(productId: string, operationId: string, expectedUserId: string) {
  await execute({ action: "remove", productId }, operationId, expectedUserId);
}
