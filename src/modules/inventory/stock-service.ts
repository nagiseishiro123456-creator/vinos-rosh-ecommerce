import type { Prisma } from "@prisma/client";

export type StockItem = {
  productId: string;
  quantity: number;
};

export class StockChangedError extends Error {
  constructor() {
    super("STOCK_CHANGED");
    this.name = "StockChangedError";
  }
}

function assertValidItems(items: StockItem[]) {
  if (items.length === 0) {
    throw new StockChangedError();
  }

  for (const item of items) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new StockChangedError();
    }
  }
}

/**
 * Reserva stock de forma atómica.
 *
 * La condición `stock >= quantity` vive dentro del UPDATE de PostgreSQL,
 * por lo que dos checkouts concurrentes no pueden descontar la misma última
 * unidad. Si cualquiera de los productos no tiene stock suficiente, lanzamos
 * StockChangedError y la transacción completa debe revertirse.
 */
export async function reserveStock(
  tx: Prisma.TransactionClient,
  items: StockItem[],
): Promise<Map<string, number>> {
  assertValidItems(items);

  const stockAfter = new Map<string, number>();

  for (const item of items) {
    const reserved = await tx.product.updateMany({
      where: {
        id: item.productId,
        active: true,
        stock: { gte: item.quantity },
      },
      data: {
        stock: { decrement: item.quantity },
      },
    });

    if (reserved.count !== 1) {
      throw new StockChangedError();
    }

    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { stock: true },
    });

    if (!product) {
      throw new StockChangedError();
    }

    stockAfter.set(item.productId, product.stock);
  }

  return stockAfter;
}

/**
 * Devuelve al inventario cantidades previamente reservadas.
 * Debe ejecutarse dentro de la misma transacción que cambia el estado del
 * pedido/pago para evitar dobles liberaciones.
 */
export async function releaseStock(
  tx: Prisma.TransactionClient,
  items: StockItem[],
): Promise<Map<string, number>> {
  assertValidItems(items);

  const stockAfter = new Map<string, number>();

  for (const item of items) {
    const product = await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
      select: { stock: true },
    });

    stockAfter.set(item.productId, product.stock);
  }

  return stockAfter;
}
