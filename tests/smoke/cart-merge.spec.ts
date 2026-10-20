import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { GUEST_CART_KEY } from "../../src/modules/cart/guest-selection";
import { clearRateLimit } from "../../src/lib/rate-limit";
import { capture } from "./capture";
import { prisma, resetCheckoutFixture } from "./checkout-fixture";

const password = process.env.SMOKE_CUSTOMER_PASSWORD ?? "Qa-only-S1-02-12345";
const productPath = "/productos/rosh-qa-botella-de-prueba";
test.afterAll(() => prisma.$disconnect());
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
  for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "unknown"]) {
    await clearRateLimit("guest-cart-preview", ip); await clearRateLimit("auth-register", ip);
  }
});
async function guest(page: Page, quantity: number) {
  await page.goto(productPath);
  await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  await expect(page.locator(".guestCart .summaryTotal strong")).toHaveText("S/ 29.90");
  if (quantity !== 1) {
    await page.locator(".guestCart input[name=quantity]").fill(String(quantity));
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.locator(".guestCart .summaryTotal strong")).toHaveText(`S/ ${(29.9 * quantity).toFixed(2)}`);
  }
}
async function credentials(page: Page, email = "qa-s102@example.com") {
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/carrito" || url.pathname === "/mi-cuenta");
}
async function cartQuantity(cartId: string, productId: string) {
  return (await prisma.cartItem.findUniqueOrThrow({ where: { cartId_productId: { cartId, productId } } })).quantity;
}
async function saved(page: Page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), GUEST_CART_KEY); }
async function layout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const control of await page.locator(".cartMergeGate button, .cartMergeGate a").all()) {
    const box = await control.boundingBox(); if (box) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
  }
}

test("S2-04: login merges 2 plus 1 once, keeps destination and shows later stock adjustments before checkout", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const f = await resetCheckoutFixture();
  const adjusted = await browser.newContext({ baseURL: "http://127.0.0.1:3000", viewport: info.project.use.viewport,
    isMobile: Boolean(info.project.use.isMobile), hasTouch: Boolean(info.project.use.hasTouch), reducedMotion: "reduce" });
  await prisma.cartItem.updateMany({ where: { cartId: f.cart.id, productId: f.product.id }, data: { quantity: 1 } });
  try {
    await guest(page, 2);
    await page.goto("/iniciar-sesion?callbackUrl=/checkout");
    await page.getByRole("link", { name: "Crear cuenta", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/registrarse" && url.searchParams.get("callbackUrl") === "/checkout");
    await page.getByRole("link", { name: "Inicia sesión", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/iniciar-sesion" && url.searchParams.get("callbackUrl") === "/checkout");
    await credentials(page);
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 89.70");
    await expect(page.getByLabel("Cantidad", { exact: true })).toHaveValue("3");
    await expect(page.locator(".cartButton .cartCount")).toHaveText("3");
    await expect(page.locator(".cartMergeResult")).toContainText("Tu selección se integró");
    await expect(page.getByRole("region", { name: "Resultado de la integración" })).toBeFocused();
    expect((await saved(page)).pending).toBe(null); expect((await saved(page)).items).toEqual([]);
    const receipt = await prisma.cartImport.findFirstOrThrow({ where: { userId: f.user.id } });
    const replay = await page.request.post("/api/cart/merge", { headers: { origin: "http://127.0.0.1:3000" },
      data: { importId: receipt.importId, expectedUserId: f.user.id, items: [{ productId: f.product.id, quantity: 2 }] } });
    expect(replay.status()).toBe(200); expect((await replay.json()).replayed).toBe(true);
    expect((await page.request.get("/api/cart/merge")).status()).toBe(405);
    const denied = await page.request.post("/api/cart/merge", { headers: { origin: "https://evil.example" }, data: {} });
    expect(denied.status()).toBe(403);
    expect(await cartQuantity(f.cart.id, f.product.id)).toBe(3);
    await layout(page); await capture(page, info, "40-union-confirmada");
    await page.reload(); await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 89.70");
    expect(await prisma.cartImport.count({ where: { userId: f.user.id } })).toBe(1);
    await page.getByRole("link", { name: "Continuar al checkout" }).click();
    await expect(page.getByRole("heading", { name: "Entrega y envío" })).toBeVisible();
    await page.getByRole("link", { name: "Revisar pedido" }).click();
    await expect(page.locator(".orderReviewCard .summaryTotal strong")).toHaveText("S/ 98.20");
    await capture(page, info, "41-resumen-tras-union");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(10);
    expect(await prisma.order.count({ where: { userId: f.user.id } })).toBe(0);
    await adjusted.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
    const changed = await adjusted.newPage(); await guest(changed, 2);
    await prisma.product.update({ where: { id: f.product.id }, data: { stock: 4, price: "30.10" } });
    await changed.getByRole("link", { name: "Ingresar a mi cuenta", exact: true }).click(); await credentials(changed);
    await expect(changed.locator(".summaryTotal strong")).toHaveText("S/ 120.40");
    await expect(changed.getByLabel("Cantidad", { exact: true })).toHaveValue("4");
    await expect(changed.locator(".cartMergeResult")).toContainText("Se ajustó un producto a 4 unidades");
    await capture(changed, info, "49-union-ajuste-disponibilidad");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(4);
    expect(await prisma.order.count({ where: { userId: f.user.id } })).toBe(0);
    if (await page.getByRole("button", { name: "Abrir menú", exact: true }).isVisible()) await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/"); await page.goto("/carrito");
    await expect(page.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
    await expect(page.locator(".cartButton .cartCount")).toHaveCount(0);
  } finally { await adjusted.close(); await resetCheckoutFixture(); }
});

test("S2-04: lost response and two tabs retry the same receipt without erasing new additions", async ({ page, context }, info) => {
  test.setTimeout(150_000);
  const f = await resetCheckoutFixture();
  const second = await context.newPage();
  let first = true;
  try {
    await guest(page, 2);
    await second.goto(productPath); // Anonymous server render before the shared login cookie changes.
    await expect(second.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeEnabled();
    await page.route("**/api/cart/merge", async (route) => {
      if (first) { first = false; const committed = await route.fetch(); expect(committed.status()).toBe(200); await route.abort(); }
      else await route.continue();
    });
    await page.getByRole("link", { name: "Ingresar a mi cuenta", exact: true }).click(); await credentials(page);
    await expect(page.locator(".cartMergeGate").getByRole("alert")).toContainText("puedes reintentar sin duplicarla");
    await expect(page.locator(".cartMergeProtected")).toBeHidden();
    expect(await cartQuantity(f.cart.id, f.product.id)).toBe(5);
    const original = (await saved(page)).pending; expect(original.items[0].quantity).toBe(2);
    await layout(page); await capture(page, info, "42-union-respuesta-perdida");
    await second.route("**/api/cart/merge", (route) => route.abort());
    await second.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(second.locator(".cartMergeGate").getByRole("alert")).toBeVisible();
    const waiting = await saved(second);
    expect(waiting.pending.importId).toBe(original.importId);
    expect(waiting.items).toEqual([{ productId: f.product.id, quantity: 1 }]);
    await page.getByRole("button", { name: "Reintentar integración", exact: true }).click();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 179.40");
    await expect(page.getByRole("region", { name: "Resultado de la integración" })).toBeFocused();
    await expect(second.locator(".summaryTotal strong")).toHaveText("S/ 179.40");
    expect(await cartQuantity(f.cart.id, f.product.id)).toBe(6);
    expect(await prisma.cartImport.count({ where: { userId: f.user.id } })).toBe(2);
    expect((await saved(page)).pending).toBe(null); expect((await saved(page)).items).toEqual([]);
    await capture(page, info, "43-union-con-nuevas-adiciones");
    expect(await prisma.order.count({ where: { userId: f.user.id } })).toBe(0);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(10);
  } finally { await page.unrouteAll({ behavior: "ignoreErrors" }); await second.close(); await resetCheckoutFixture(); }
});

test("S2-04: registration keeps purchase destination, invalid callbacks stay internal, and memory survives SPA login", async ({ page, browser }, info) => {
  test.setTimeout(180_000);
  const f = await resetCheckoutFixture(); const email = `qa-merge-${randomUUID()}@example.com`;
  const memory = await browser.newContext({ baseURL: "http://127.0.0.1:3000", viewport: info.project.use.viewport,
    isMobile: Boolean(info.project.use.isMobile), hasTouch: Boolean(info.project.use.hasTouch), reducedMotion: "reduce" });
  try {
    await guest(page, 2); await page.goto("/iniciar-sesion?callbackUrl=/checkout");
    await page.getByRole("link", { name: "Crear cuenta", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/registrarse" && url.searchParams.get("callbackUrl") === "/checkout");
    await capture(page, info, "44-registro-destino-conservado");
    await page.getByLabel("Nombres", { exact: true }).fill("Cliente QA");
    await page.getByLabel("Apellidos", { exact: true }).fill("Unión");
    await page.getByLabel("Correo electrónico").fill(email); await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/carrito" && url.searchParams.get("continuar") === "/checkout");
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 59.80");
    await expect(page.locator(".cartMergeResult")).toContainText("Tu selección se integró");
    await capture(page, info, "45-cuenta-creada-con-seleccion");
    const registered = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(await prisma.cartImport.count({ where: { userId: registered.id } })).toBe(1);
    await page.getByRole("link", { name: "Continuar al checkout" }).click();
    await expect(page.getByRole("heading", { name: "Entrega y envío" })).toBeVisible();
    await page.goto("/iniciar-sesion?callbackUrl=https%3A%2F%2Fevil.example"); await credentials(page, email);
    await expect(page).toHaveURL((url) => url.origin === "http://127.0.0.1:3000" && url.pathname === "/mi-cuenta");

    await memory.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("QA blocked", "SecurityError"); } });
    });
    const inMemory = await memory.newPage(); await guest(inMemory, 2);
    await expect(inMemory.locator(".guestCart").getByRole("alert")).toContainText("No podemos guardar");
    await inMemory.getByRole("link", { name: "Ingresar a mi cuenta", exact: true }).click(); await credentials(inMemory);
    await expect(inMemory.locator(".summaryTotal strong")).toHaveText("S/ 149.50");
    await expect(inMemory.locator(".cartMergeResult")).toContainText("No podemos guardar");
    await capture(inMemory, info, "46-union-desde-memoria");
    expect(await cartQuantity(f.cart.id, f.product.id)).toBe(5);
  } finally {
    await memory.close(); await prisma.user.deleteMany({ where: { email } }); await resetCheckoutFixture();
  }
});

test("S2-04: session expiry and another account preserve the pending selection without reassignment", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await resetCheckoutFixture();
  const other = await prisma.user.create({ data: { email: `qa-other-${randomUUID()}@example.com`, passwordHash: f.user.passwordHash,
    firstName: "Otra", lastName: "Cuenta QA", cart: { create: {} } } });
  try {
    await guest(page, 1); await page.route("**/api/cart/merge", (route) => route.abort());
    await page.getByRole("link", { name: "Ingresar a mi cuenta", exact: true }).click(); await credentials(page);
    await expect(page.locator(".cartMergeGate").getByRole("alert")).toBeVisible();
    const pending = (await saved(page)).pending; expect(pending.userId).toBe(f.user.id);
    await page.context().clearCookies(); await page.goto("/carrito");
    await expect(page.getByText("Tienes una selección pendiente de integrar.", { exact: true })).toBeVisible();
    await expect(page.getByText("S/ 89.70", { exact: true })).toHaveCount(0);
    const expired = await page.request.post("/api/cart/merge", { headers: { origin: "http://127.0.0.1:3000" },
      data: { importId: pending.importId, expectedUserId: f.user.id, items: pending.items } });
    expect(expired.status()).toBe(401);
    await page.goto("/checkout"); await expect(page).toHaveURL((url) => url.pathname === "/iniciar-sesion" && url.searchParams.get("callbackUrl") === "/checkout");
    await page.unroute("**/api/cart/merge"); await credentials(page, other.email);
    await expect(page.locator(".cartMergeGate").getByRole("alert")).toContainText("vinculada a otra cuenta");
    await expect(page.locator(".cartMergeProtected")).toBeHidden();
    expect((await saved(page)).pending).toEqual(pending);
    expect(await prisma.cartImport.count({ where: { userId: other.id } })).toBe(0);
    expect(await cartQuantity(f.cart.id, f.product.id)).toBe(3);
    await layout(page); await capture(page, info, "47-pendiente-otra-cuenta");
    const denied = await page.request.post("/api/cart/merge", { headers: { origin: "http://127.0.0.1:3000" },
      data: { importId: pending.importId, expectedUserId: f.user.id, items: pending.items } });
    expect(denied.status()).toBe(409);
    await page.getByRole("link", { name: "Volver a ingresar", exact: true }).click(); await credentials(page);
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 119.60");
    expect(await prisma.cartImport.count({ where: { userId: f.user.id } })).toBe(1);
    expect((await saved(page)).pending).toBe(null);
    await capture(page, info, "48-pendiente-recuperado");
  } finally { await page.unrouteAll({ behavior: "ignoreErrors" }); await prisma.user.delete({ where: { id: other.id } }); await resetCheckoutFixture(); }
});
