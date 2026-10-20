import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { canonicalGuestItems, IMPORT_ID_PATTERN } from "./guest-persistence";
import { guestPreviewRequest } from "./guest-preview-service";
import { PRODUCT_ID_PATTERN } from "./guest-selection";
import type { CartMergeResponse, CartMergeResult } from "./guest-merge";

export const guestMergeRequest = guestPreviewRequest.safeExtend({
  importId: z.string().regex(IMPORT_ID_PATTERN), expectedUserId: z.string().regex(PRODUCT_ID_PATTERN),
}).refine(({ items }) => items.length > 0, "Empty import");
export class CartMergeError extends Error {
  constructor(public code: "CONFLICT" | "BUSY" | "UNAUTHORIZED" | "INVALID") { super(code); }
}

export async function mergeGuestCart(userId: string, submitted: z.infer<typeof guestMergeRequest>): Promise<CartMergeResponse> {
  const parsed = guestMergeRequest.safeParse(submitted);
  if (!parsed.success) throw new CartMergeError("INVALID");
  const { importId, items, expectedUserId } = parsed.data;
  if (expectedUserId !== userId) throw new CartMergeError("UNAUTHORIZED");
  const requestHash = createHash("sha256").update(JSON.stringify({ userId, items: canonicalGuestItems(items) })).digest("hex");
  const identity = { userId_importId: { userId, importId } };
  const select = { requestHash: true, result: true } as const;
  function replay(saved: { requestHash: string; result: Prisma.JsonValue }): CartMergeResponse {
    if (saved.requestHash !== requestHash) throw new CartMergeError("CONFLICT");
    return { importId, userId, replayed: true, result: saved.result as CartMergeResult };
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const prior = await tx.cartImport.findUnique({ where: identity, select });
        if (prior) return replay(prior);
        if (!await tx.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new CartMergeError("UNAUTHORIZED");
        const cart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true } });
        const ids = items.map((item) => item.productId);
        const [products, existing] = await Promise.all([
          tx.product.findMany({ where: { id: { in: ids }, active: true, price: { gt: 0 } }, select: { id: true, stock: true } }),
          tx.cartItem.findMany({ where: { cartId: cart.id, productId: { in: ids } }, select: { productId: true, quantity: true } }),
        ]);
        const byId = new Map(products.map((product) => [product.id, product]));
        const accountQuantities = new Map(existing.map((item) => [item.productId, item.quantity]));
        const result: CartMergeResult = { lines: [], changes: [] };
        for (const item of canonicalGuestItems(items)) {
          const product = byId.get(item.productId);
          if (!product || product.stock <= 0) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId: item.productId } });
            result.changes.push({ productId: item.productId, kind: "unavailable", quantity: 0 });
            continue;
          }
          const requested = (accountQuantities.get(item.productId) ?? 0) + item.quantity;
          const quantity = Math.min(requested, product.stock, 99);
          if (quantity < requested) result.changes.push({ productId: item.productId, kind: "quantity-reduced", quantity });
          await tx.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId: item.productId } },
            create: { cartId: cart.id, productId: item.productId, quantity }, update: { quantity } });
          result.lines.push({ productId: item.productId, quantity });
        }
        await tx.cart.update({ where: { id: cart.id }, data: { revision: { increment: 1 } } });
        await tx.cartImport.create({ data: { userId, importId, requestHash, result } });
        return { userId, importId, replayed: false, result };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
        const winner = await prisma.cartImport.findUnique({ where: identity, select });
        if (winner) return replay(winner);
        if (attempt < 3) continue;
        throw new CartMergeError("BUSY");
      }
      throw error;
    }
  }
  throw new CartMergeError("BUSY");
}
