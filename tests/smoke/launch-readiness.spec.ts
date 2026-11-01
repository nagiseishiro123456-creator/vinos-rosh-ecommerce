import { expect, test, type Page } from "@playwright/test";
import { capture } from "./capture";
import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());
async function loginAdmin(page: Page) {
  await page.goto("/iniciar-sesion?callbackUrl=/admin/lanzamiento");
  await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Preparación para lanzamiento", exact: true })).toBeVisible();
}

test("S6: launch checks refresh saved checkout settings, preserve data and guide the client", async ({ page }, info) => {
  const { product, user } = await resetCheckoutFixture();
  const settings = await prisma.commerceSettings.findUniqueOrThrow({ where: { id: "default" } });
  try {
    await loginAdmin(page);
    const payment = page.getByRole("article", { name: "Pago manual configurado", exact: true });
    await expect(payment.locator(".launchStatus")).toHaveText("Configurado");
    await expect(page.getByRole("article", { name: "Configuración de publicación", exact: true }).locator(".launchStatus")).toHaveText("Pendiente");
    await expect(page.getByRole("article", { name: "Izipay", exact: true })).toContainText("permanece desactivado");
    await expect(page.getByRole("article", { name: "Correo transaccional", exact: true })).toContainText("permanecen desactivadas");
    await prisma.commerceSettings.update({ where: { id: "default" }, data: { yapeEnabled: false, transferEnabled: false } });
    await page.getByRole("link", { name: "Actualizar comprobaciones", exact: true }).click();
    await expect(payment.locator(".launchStatus")).toHaveText("Pendiente");
    await expect(payment.getByRole("link", { name: /Revisar medios manuales/ })).toHaveAttribute("href", "/admin/configuracion");
    await page.getByRole("link", { name: /Abrir recorrido de prueba/ }).click();
    await expect(page.getByRole("heading", { name: "Compra de prueba con el cliente", level: 2, exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture(page, info, "s6-preparacion-lanzamiento", { fullPage: true });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
  } finally {
    await prisma.commerceSettings.update({ where: { id: "default" }, data: { yapeEnabled: settings.yapeEnabled, transferEnabled: settings.transferEnabled } });
  }
});

test("S6: guests, customers and revoked administrators cannot read launch diagnostics", async ({ page, browser }, info) => {
  await resetCheckoutFixture();
  await page.goto("/admin/lanzamiento");
  await expect(page).toHaveURL((url) => url.pathname === "/iniciar-sesion");
  await loginCustomer(page);
  await page.goto("/admin/lanzamiento");
  await expect(page).toHaveURL((url) => url.pathname === "/mi-cuenta");
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL! } });
  const context = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch });
  try {
    const adminPage = await context.newPage(); await loginAdmin(adminPage);
    await prisma.user.update({ where: { id: admin.id }, data: { role: "CUSTOMER" } });
    await adminPage.getByRole("link", { name: "Actualizar comprobaciones", exact: true }).click();
    await expect(adminPage).toHaveURL((url) => url.pathname === "/mi-cuenta");
    await expect(adminPage.getByRole("heading", { name: "Preparación para lanzamiento", exact: true })).toHaveCount(0);
  } finally {
    await prisma.user.update({ where: { id: admin.id }, data: { role: admin.role } });
    await context.close();
  }
});
