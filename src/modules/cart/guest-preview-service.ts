import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { calculateAmounts, MAX_ORDER_AMOUNT } from "@/modules/checkout/pricing";
import { MAX_GUEST_ITEMS, MAX_GUEST_QUANTITY, PRODUCT_ID_PATTERN, type GuestLine } from "./guest-selection";
import type { GuestPreview } from "./guest-preview";

export const guestPreviewRequest = z.object({ items: z.array(z.object({
  productId: z.string().regex(PRODUCT_ID_PATTERN),
  quantity: z.number().int().min(1).max(MAX_GUEST_QUANTITY),
}).strict()).max(MAX_GUEST_ITEMS) }).strict()
  .refine(({ items }) => new Set(items.map((item) => item.productId)).size === items.length, "Duplicate products");

export async function previewGuestCart(selection: GuestLine[]): Promise<GuestPreview> {
  const products = selection.length ? await prisma.product.findMany({
    where: { id: { in: selection.map((item) => item.productId) }, active: true, price: { gt: 0 } },
    select: { id: true, name: true, slug: true, price: true, stock: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } } },
  }) : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  const changes: GuestPreview["changes"] = [];
  const accepted = selection.flatMap((item) => {
    const product = byId.get(item.productId);
    if (!product || product.stock <= 0) {
      changes.push({ productId: item.productId, kind: "unavailable", quantity: 0 }); return [];
    }
    const quantity = Math.min(item.quantity, product.stock, MAX_GUEST_QUANTITY);
    if (quantity !== item.quantity) changes.push({ productId: item.productId, kind: "quantity-reduced", quantity });
    return [{ product, quantity }];
  });
  const amounts = calculateAmounts(accepted.map(({ product, quantity }) => ({ unitPrice: product.price, quantity })));
  return {
    items: accepted.map(({ product, quantity }, index) => ({ productId: product.id, quantity,
      name: product.name, slug: product.slug, unitPrice: product.price.toFixed(2),
      lineTotal: amounts.lines[index].subtotal.toFixed(2),
      imageUrl: product.images[0]?.url ?? null, imageAlt: product.images[0]?.alt ?? null })),
    subtotal: amounts.subtotal.toFixed(2), exceedsOrderLimit: amounts.total.gt(MAX_ORDER_AMOUNT), changes,
  };
}
