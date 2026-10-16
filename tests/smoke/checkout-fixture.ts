import { PrismaClient } from "@prisma/client";
import { expect, type Page } from "@playwright/test";

const databaseName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
if (process.env.SMOKE_TEST_DATA !== "true" || !["vinos_rosh_ci", "vinos_rosh_test"].includes(databaseName)) {
  throw new Error("Money smoke requires an explicitly isolated QA database.");
}
export const prisma = new PrismaClient();
export async function resetCheckoutFixture() {
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

  return { user, product, zone, cart };
}

export async function loginCustomer(page: Page, email = "qa-s102@example.com") {
  await page.goto("/iniciar-sesion?callbackUrl=/carrito");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.SMOKE_CUSTOMER_PASSWORD ?? "Qa-only-S1-02-12345");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/carrito$/);
}

export async function reserveFromCart(page: Page) {
  await page.goto("/carrito");
  await page.getByRole("link", { name: "Continuar al checkout" }).click();
  await page.getByRole("link", { name: "Revisar pedido" }).click();
  await expect(page.locator(".paymentInstructions")).toHaveCount(0);
  await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
  await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/]+\/pagar/);
}
