import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { calculateAmounts, MAX_ORDER_AMOUNT } from "@/modules/checkout/pricing";
import type { AccountCartSnapshot, CartCommandRequest, CartCommandResponse, CartCommandResult } from "./account-contract";

const identity = { expectedUserId: z.string().cuid(), operationId: z.uuid(), productId: z.string().cuid() };
export const cartCommandSchema = z.discriminatedUnion("action", [
  z.object({ ...identity, action: z.literal("add") }).strict(),
  z.object({ ...identity, action: z.literal("set"), quantity: z.number().int().min(1).max(99) }).strict(),
  z.object({ ...identity, action: z.literal("remove") }).strict(),
]);
export class CartCommandError extends Error {
  constructor(public code: "INVALID" | "UNAUTHORIZED" | "CONFLICT" | "UNAVAILABLE" | "LIMIT" | "BUSY") { super(code); }
}
async function snapshot(tx: Prisma.TransactionClient, userId: string): Promise<AccountCartSnapshot> {
  if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new CartCommandError("UNAUTHORIZED");
  const cart = await tx.cart.findUnique({ where: { userId }, select: { revision: true, items: {
    orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: { id: true, quantity: true, product: { select: {
      id: true, name: true, slug: true, stock: true, active: true, price: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
    } } },
  } } });
  let subtotal = new Prisma.Decimal(0);
  const items = (cart?.items ?? []).map(({ id, quantity, product: p }) => {
    const validPrice = p.price.gt(0) && p.price.lte(MAX_ORDER_AMOUNT);
    const line = validPrice ? calculateAmounts([{ unitPrice: p.price, quantity }]).lines[0].subtotal : null;
    if (line) subtotal = subtotal.add(line);
    return { id, productId: p.id, name: p.name, slug: p.slug, quantity,
      unitPrice: validPrice ? p.price.toFixed(2) : null, lineTotal: line?.toFixed(2) ?? null,
      maxQuantity: Math.max(0, Math.min(99, p.stock)), available: p.active && p.stock > 0 && validPrice,
      imageUrl: p.images[0]?.url ?? null, imageAlt: p.images[0]?.alt ?? null };
  });
  return { userId, revision: cart?.revision ?? 0, items, subtotal: subtotal.toFixed(2),
    hasInvalidItems: items.some((item) => !item.available || item.quantity > item.maxQuantity),
    exceedsOrderLimit: subtotal.gt(MAX_ORDER_AMOUNT) };
}
export const readAccountCart = cache(async (userId: string) => {
  return prisma.$transaction((tx) => snapshot(tx, userId), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
});
export async function executeCartCommand(userId: string, submitted: CartCommandRequest): Promise<CartCommandResponse> {
  const parsed = cartCommandSchema.safeParse(submitted);
  if (!parsed.success) throw new CartCommandError("INVALID");
  const command = parsed.data;
  if (command.expectedUserId !== userId) throw new CartCommandError("UNAUTHORIZED");
  const { operationId, productId, action } = command;
  const requestHash = createHash("sha256").update(JSON.stringify({ userId, productId, action,
    quantity: action === "set" ? command.quantity : null })).digest("hex");
  const where = { userId_operationId: { userId, operationId } };
  const receiptSelect = { requestHash: true, result: true } as const;
  function replay(receipt: { requestHash: string; result: Prisma.JsonValue }) {
    if (receipt.requestHash !== requestHash) throw new CartCommandError("CONFLICT");
    return receipt.result as CartCommandResult;
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const accepted = await prisma.$transaction(async (tx) => {
        const prior = await tx.cartMutation.findUnique({ where, select: receiptSelect });
        if (prior) return { replayed: true, result: replay(prior) };
        if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new CartCommandError("UNAUTHORIZED");
        const cart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true } });
        const lineWhere = { cartId_productId: { cartId: cart.id, productId } };
        const existing = await tx.cartItem.findUnique({ where: lineWhere, select: { quantity: true } });
        let quantity = 0, adjusted = false;
        if (action === "remove") await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
        else {
          const product = await tx.product.findUnique({ where: { id: productId }, select: { active: true, stock: true, price: true } });
          if (!product?.active || product.stock <= 0 || product.price.lte(0)) throw new CartCommandError("UNAVAILABLE");
          if (action === "set" && !existing) throw new CartCommandError("CONFLICT");
          if (!existing && await tx.cartItem.count({ where: { cartId: cart.id } }) >= 50) throw new CartCommandError("LIMIT");
          const requested = action === "add" ? (existing?.quantity ?? 0) + 1 : command.quantity;
          quantity = Math.min(requested, product.stock, 99); adjusted = quantity !== requested;
          await tx.cartItem.upsert({ where: lineWhere, create: { cartId: cart.id, productId, quantity }, update: { quantity } });
        }
        const result = { productId, quantity, adjusted };
        await tx.cart.update({ where: { id: cart.id }, data: { revision: { increment: 1 } } });
        await tx.cartMutation.create({ data: { userId, operationId, requestHash, result } });
        return { replayed: false, result };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { userId, operationId, ...accepted, cart: await readAccountCart(userId) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
        const winner = await prisma.cartMutation.findUnique({ where, select: receiptSelect });
        if (winner) return { userId, operationId, replayed: true, result: replay(winner), cart: await readAccountCart(userId) };
        if (attempt < 3) continue;
        throw new CartCommandError("BUSY");
      }
      throw error;
    }
  }
  throw new CartCommandError("BUSY");
}
