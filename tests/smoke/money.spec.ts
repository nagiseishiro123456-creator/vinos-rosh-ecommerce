import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

import { capture } from "./capture";

const databaseName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
if (process.env.SMOKE_TEST_DATA !== "true" || !["vinos_rosh_ci", "vinos_rosh_test"].includes(databaseName)) {
  throw new Error("Money smoke requires an explicitly isolated QA database.");
}
const prisma = new PrismaClient();
test.afterAll(() => prisma.$disconnect());

test("S1-02: exact total, changed-price review and server-authoritative order", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "qa-s102@example.com" } });
  const product = await prisma.product.findUniqueOrThrow({ where: { slug: "rosh-qa-botella-de-prueba" } });
  const zone = await prisma.shippingZone.findUniqueOrThrow({ where: {
    department_province_district: { department: "QA", province: "QA", district: "Distrito QA S1-02" },
  } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.inventoryMovement.deleteMany({ where: { actorUserId: user.id } });
  await prisma.product.update({ where: { id: product.id }, data: { price: "29.90", stock: 10 } });
  await prisma.shippingZone.update({ where: { id: zone.id }, data: { price: "8.50" } });
  const cart = await prisma.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    update: { quantity: 3 }, create: { cartId: cart.id, productId: product.id, quantity: 3 },
  });

  await page.goto("/iniciar-sesion?callbackUrl=/carrito");
  await page.getByLabel("Correo electrónico").fill("qa-s102@example.com");
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.SMOKE_CUSTOMER_PASSWORD ?? "Qa-only-S1-02-12345");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/carrito$/);
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 89.70");
  await capture(page, testInfo, "05-carrito-exacto");

  await page.getByRole("link", { name: "Continuar al checkout" }).click();
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.20");
  await capture(page, testInfo, "06-entrega-exacta");
  await page.getByRole("link", { name: "Continuar al pago" }).click();
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.20");
  await capture(page, testInfo, "07-pago-exacto");

  // Simulate an administrator changing the price after the customer reviewed it.
  await prisma.product.update({ where: { id: product.id }, data: { price: "30.10" } });
  await page.getByLabel("Número o código de operación").fill(`QA-${testInfo.project.name}-${Date.now()}`);
  await page.getByRole("button", { name: /Enviar pedido por/ }).click();
  await expect(page.getByRole("alert")).toContainText("Revisa el resumen actualizado");
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.80");
  expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
  await capture(page, testInfo, "08-resumen-actualizado");

  // Malicious client-supplied amounts are deliberately ignored by the Server Action.
  await page.evaluate(() => {
    for (const name of ["total", "subtotal", "shippingAmount"]) {
      const input = document.createElement("input"); input.type = "hidden";
      input.name = name; input.value = "0.01";
      document.querySelector(".paymentForm")!.appendChild(input);
    }
  });
  await page.getByLabel("Número o código de operación").fill(`QA-${testInfo.project.name}-${Date.now()}`);
  await page.getByRole("button", { name: /Enviar pedido por/ }).click();
  await expect(page).toHaveURL(/\/pedidos\/ROSH-/);
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.80");
  const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id }, include: { payments: true, items: true } });
  expect(order.total.toFixed(2)).toBe("98.80");
  expect(order.subtotal.toFixed(2)).toBe("90.30");
  expect(order.shippingAmount.toFixed(2)).toBe("8.50");
  expect(order.items[0].unitPrice.toFixed(2)).toBe("30.10");
  expect(order.payments[0].amount.toFixed(2)).toBe("98.80");
  await capture(page, testInfo, "09-pedido-verificado");
});
