import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { PrismaClient } from "@prisma/client";

import {
  releaseStock,
  reserveStock,
  StockChangedError,
} from "../src/modules/inventory/stock-service";

const prisma = new PrismaClient();

after(async () => {
  await prisma.$disconnect();
});

async function createTestProduct(stock: number) {
  const id = randomUUID().replaceAll("-", "");

  return prisma.product.create({
    data: {
      name: `Producto prueba ${id}`,
      slug: `producto-prueba-${id}`,
      sku: `TEST-${id.slice(0, 12)}`,
      description: "Producto temporal para pruebas de concurrencia de inventario.",
      price: 10,
      stock,
      active: true,
    },
  });
}

test("only one concurrent reservation can take the final unit", async (t) => {
  const product = await createTestProduct(1);

  t.after(async () => {
    await prisma.product.delete({ where: { id: product.id } }).catch(() => undefined);
  });

  const reserveFinalUnit = () =>
    prisma.$transaction((tx) =>
      reserveStock(tx, [{ productId: product.id, quantity: 1 }]),
    );

  const results = await Promise.allSettled([
    reserveFinalUnit(),
    reserveFinalUnit(),
  ]);

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);

  const rejection = rejected[0];
  assert.equal(rejection?.status, "rejected");
  if (rejection?.status === "rejected") {
    assert.equal(rejection.reason instanceof StockChangedError, true);
  }

  const productAfter = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: { stock: true },
  });

  assert.equal(productAfter.stock, 0);
});

test("releaseStock restores a previously reserved quantity", async (t) => {
  const product = await createTestProduct(3);

  t.after(async () => {
    await prisma.product.delete({ where: { id: product.id } }).catch(() => undefined);
  });

  await prisma.$transaction((tx) =>
    reserveStock(tx, [{ productId: product.id, quantity: 2 }]),
  );

  let productAfter = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: { stock: true },
  });
  assert.equal(productAfter.stock, 1);

  const stockAfterRelease = await prisma.$transaction((tx) =>
    releaseStock(tx, [{ productId: product.id, quantity: 2 }]),
  );

  assert.equal(stockAfterRelease.get(product.id), 3);

  productAfter = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: { stock: true },
  });
  assert.equal(productAfter.stock, 3);
});
