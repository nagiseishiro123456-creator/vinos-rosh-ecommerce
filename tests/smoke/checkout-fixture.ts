import { PrismaClient } from "@prisma/client";
import { expect, type Page } from "@playwright/test";
import { clearRateLimit } from "../../src/lib/rate-limit";

const databaseName = new URL(process.env.DATABASE_URL ?? "").pathname.slice(1);
if (process.env.SMOKE_TEST_DATA !== "true" || !["vinos_rosh_ci", "vinos_rosh_test"].includes(databaseName)) {
  throw new Error("Money smoke requires an explicitly isolated QA database.");
}
export const prisma = new PrismaClient();
export async function resetCheckoutFixture() {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: "qa-s102@example.com" } });
  // Isolated synthetic customer only; scenarios do not inherit each other's request allowance.
  await clearRateLimit("manual-order-submit", user.id);
  await clearRateLimit("manual-payment-report", user.id);
  await clearRateLimit("guest-cart-merge", user.id);
  await clearRateLimit("account-cart-read", user.id);
  await clearRateLimit("account-cart-write", user.id);
  await prisma.cartMutation.deleteMany({ where: { userId: user.id } });
  await prisma.cartImport.deleteMany({ where: { userId: user.id } });
  const product = await prisma.product.findUniqueOrThrow({ where: { slug: "rosh-qa-botella-de-prueba" } });
  const zone = await prisma.shippingZone.findUniqueOrThrow({ where: {
    department_province_district: { department: "QA", province: "QA", district: "Distrito QA S1-02" },
  } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.inventoryMovement.deleteMany({ where: { actorUserId: user.id } });
  await prisma.product.update({ where: { id: product.id }, data: { price: "29.90", stock: 10, active: true } });
  await prisma.shippingZone.update({ where: { id: zone.id }, data: { price: "8.50" } });
  const cart = await prisma.cart.upsert({ where: { userId: user.id }, update: { revision: { increment: 1 } }, create: { userId: user.id } });
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
  // Match the pathname, not the callbackUrl query on the login page.
  await expect(page).toHaveURL((url) => url.pathname === "/carrito");
  await expect(page.getByRole("heading", { name: "Carrito", exact: true })).toBeVisible();
}

export async function reserveFromCart(page: Page) {
  await page.goto("/carrito");
  await page.getByRole("link", { name: "Continuar al checkout" }).click();
  await page.getByRole("link", { name: "Revisar pedido" }).click();
  await expect(page.locator(".paymentInstructions")).toHaveCount(0);
  await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
  await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/]+\/pagar/);
}
