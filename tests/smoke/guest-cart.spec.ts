import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";

import { clearRateLimit } from "../../src/lib/rate-limit";
import { GUEST_CART_KEY } from "../../src/modules/cart/guest-selection";
import { capture } from "./capture";
import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());
const productPath = "/productos/rosh-qa-botella-de-prueba";

async function resetPreviewLimit() {
  for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "unknown"]) await clearRateLimit("guest-cart-preview", ip);
}
function collectErrors(page: Page, errors: string[]) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && /hydration|hydrating|did not match/i.test(message.text())) errors.push(message.text()); });
}
async function checkLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const button of await page.locator(".guestCart .quantityForm button, .guestCart .removeButton").all()) {
    const box = await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  }
}
async function addGuest(page: Page) {
  await page.goto(productPath);
  await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Tu carrito", exact: true });
  await expect(panel).toBeVisible();
  await panel.getByRole("link", { name: "Ver carrito completo", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/carrito");
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 29.90");
}

test("S2-03 regression: selection survives reload, revalidates stock/prices and now integrates once with account", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; collectErrors(page, errors);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
  const f = await resetCheckoutFixture(); await resetPreviewLimit();
  let release = () => {};
  try {
    const counts = async () => Promise.all([prisma.cart.count(), prisma.cartItem.count(), prisma.order.count(), prisma.payment.count(), prisma.inventoryMovement.count()]);
    const before = await counts();
    await addGuest(page);
    await expect(page.locator(".cartButton .cartCount")).toHaveText("1");
    expect((await page.context().cookies()).some((cookie) => cookie.name.includes("session-token"))).toBe(false);
    await checkLayout(page); await capture(page, info, "30-invitado-agregado");
    const quantity = page.locator(".guestCart input[name=quantity]");
    await quantity.fill("3"); await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 89.70");
    await expect(page.getByRole("button", { name: "Actualizar", exact: true })).toBeFocused();
    await expect(page.locator(".cartButton .cartCount")).toHaveText("3");
    await page.evaluate(({ key }) => {
      const saved = JSON.parse(localStorage.getItem(key)!);
      saved.items[0].price = "0.01"; saved.total = "0.01";
      localStorage.setItem(key, JSON.stringify(saved));
    }, { key: GUEST_CART_KEY });
    await page.reload();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 89.70");
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), GUEST_CART_KEY);
    expect(saved).toMatchObject({ version: 2, items: [{ productId: f.product.id, quantity: 3 }], pending: null });
    expect(saved.items[0]).not.toHaveProperty("price"); expect(saved).not.toHaveProperty("total");

    // Hold a real old server response; a newer edit must win, including its persisted quantity.
    let seen!: () => void, finished!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { seen = resolve; });
    const completed = new Promise<void>((resolve) => { finished = resolve; });
    let captured = false;
    await page.route("**/api/cart/preview", async (route) => {
      if (!captured && route.request().postDataJSON()?.items?.[0]?.quantity === 4) {
        captured = true;
        const response = await route.fetch(); seen(); await held;
        try { await route.fulfill({ response }); } catch { /* The obsolete browser fetch can already be aborted. */ }
        finally { finished(); }
      } else await route.continue();
    });
    await quantity.fill("4"); await page.getByRole("button", { name: "Actualizar", exact: true }).click(); await started;
    await quantity.fill("5"); await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 149.50");
    release(); await completed; await expect(quantity).toHaveValue("5");
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).items[0].quantity, GUEST_CART_KEY)).toBe(5);
    await page.unroute("**/api/cart/preview");

    await prisma.product.update({ where: { id: f.product.id }, data: { price: "30.10", stock: 2 } });
    await page.getByRole("button", { name: "Actualizar precios y disponibilidad" }).click();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 60.20"); await expect(quantity).toHaveValue("2");
    await expect(page.locator(".guestCartStatus")).toContainText("se ajustó un producto a 2 unidades");
    await expect(page.locator(".cartButton .cartCount")).toHaveText("2");
    await checkLayout(page); await capture(page, info, "31-invitado-ajuste-servidor");
    await prisma.product.update({ where: { id: f.product.id }, data: { active: false } });
    await page.getByRole("button", { name: "Actualizar precios y disponibilidad" }).click();
    await expect(page.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
    await expect(page.locator(".guestCartStatus")).toContainText("ya no está disponible");
    await expect(page.locator(".cartButton .cartCount")).toHaveCount(0);
    await capture(page, info, "32-invitado-producto-retirado");
    expect(await counts()).toEqual(before);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(2);

    await prisma.product.update({ where: { id: f.product.id }, data: { active: true, stock: 10, price: "29.90" } });
    await addGuest(page); await quantity.fill("2"); await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 59.80");
    await expect(page.getByText(/Al ingresar o crear tu cuenta integraremos/)).toBeVisible();
    await loginCustomer(page);
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 149.50");
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).items, GUEST_CART_KEY)).toEqual([]);
    expect(await prisma.cartImport.count({ where: { userId: f.user.id } })).toBe(1);
    await page.context().clearCookies(); await page.reload();
    await expect(page.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
    await addGuest(page);
    await page.getByRole("button", { name: /Eliminar ROSH QA/ }).click();
    await expect(page.getByRole("heading", { name: "Carrito", exact: true })).toBeFocused();
    await expect(page.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    release(); await page.unrouteAll({ behavior: "ignoreErrors" });
    await prisma.product.update({ where: { id: f.product.id }, data: { active: true } });
    await resetCheckoutFixture();
  }
});

async function contextFor(browser: Browser, info: TestInfo, mode: "normal" | "corrupt" | "blocked" | "quota" | "nojs") {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3000", reducedMotion: "reduce",
    viewport: info.project.use.viewport ?? { width: 390, height: 844 }, isMobile: Boolean(info.project.use.isMobile),
    hasTouch: Boolean(info.project.use.hasTouch), javaScriptEnabled: mode !== "nojs" });
  await context.addInitScript(({ mode, key }) => {
    localStorage.setItem("rosh-analytics-consent-v1", "rejected");
    if (mode === "corrupt" && !sessionStorage.getItem("qa-corrupt-seeded")) {
      localStorage.setItem(key, "{"); sessionStorage.setItem("qa-corrupt-seeded", "1");
    }
    if (mode === "blocked") Object.defineProperty(window, "localStorage", { configurable: true,
      get() { throw new DOMException("Storage blocked", "SecurityError"); } });
    if (mode === "quota") Object.defineProperty(Storage.prototype, "setItem", { configurable: true,
      value() { throw new DOMException("Storage full", "QuotaExceededError"); } });
  }, { mode, key: GUEST_CART_KEY });
  return context;
}

test("S2-03: corrupt/blocked/full storage, network retry and native authenticated forms remain usable", async ({ browser }, info) => {
  test.setTimeout(180_000);
  await resetCheckoutFixture(); await resetPreviewLimit();
  const contexts: Awaited<ReturnType<typeof contextFor>>[] = [];
  const errors: string[] = [];
  const open = async (mode: Parameters<typeof contextFor>[2]) => {
    const context = await contextFor(browser, info, mode); contexts.push(context);
    const page = await context.newPage(); collectErrors(page, errors); return page;
  };
  try {
    const corrupt = await open("corrupt"); await corrupt.goto("/carrito");
    await expect(corrupt.getByText(/El carrito se reinició/)).toBeVisible();
    await capture(corrupt, info, "33-invitado-recuperacion-formato");
    await addGuest(corrupt); await corrupt.reload();
    await expect(corrupt.locator(".summaryTotal strong")).toHaveText("S/ 29.90");

    const blocked = await open("blocked"); await addGuest(blocked);
    await expect(blocked.locator(".guestCart").getByRole("alert")).toContainText("No podemos guardar tu selección");
    await expect(blocked.locator(".guestCart").getByRole("alert")).toContainText("podrías perderla al recargar");
    await blocked.locator(".guestCart input[name=quantity]").fill("2");
    await blocked.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(blocked.locator(".summaryTotal strong")).toHaveText("S/ 59.80");
    await checkLayout(blocked); await capture(blocked, info, "34-invitado-memoria");
    await blocked.reload(); await expect(blocked.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();

    const quota = await open("quota"); await addGuest(quota);
    await expect(quota.locator(".guestCart").getByRole("alert")).toContainText("No podemos guardar tu selección");
    await expect(quota.locator(".guestCart").getByRole("alert")).toContainText("podrías perderla al recargar");
    await quota.evaluate(() => { localStorage.removeItem("rosh-analytics-consent-v1"); window.dispatchEvent(new Event("rosh-analytics-consent-change")); });
    if (process.env.NEXT_PUBLIC_GA_ID) {
      await quota.getByRole("button", { name: "Rechazar", exact: true }).click();
      await expect(quota.getByRole("dialog", { name: "Preferencias de analítica" })).toHaveCount(0);
    }
    await capture(quota, info, "37-invitado-cuota");

    const network = await open("normal"); let fail = true;
    await network.route("**/api/cart/preview", (route) => fail ? route.abort() : route.continue());
    await network.goto(productPath); await network.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    const networkPanel = network.getByRole("dialog", { name: "Tu carrito", exact: true });
    await expect(networkPanel).toBeVisible();
    await networkPanel.getByRole("link", { name: "Ver carrito completo", exact: true }).click();
    await expect(network.locator(".guestCart").getByRole("alert")).toContainText("Conservamos tu selección");
    await expect(network.locator(".summaryTotal strong")).toHaveText("Por verificar");
    expect(await network.evaluate((key) => JSON.parse(localStorage.getItem(key)!).items[0].quantity, GUEST_CART_KEY)).toBe(1);
    await capture(network, info, "35-invitado-error-red"); fail = false;
    await network.getByRole("button", { name: "Reintentar verificación" }).click();
    await expect(network.locator(".summaryTotal strong")).toHaveText("S/ 29.90");

    const native = await open("nojs"); await native.goto("/carrito");
    await expect(native.locator("noscript .checkoutError")).toBeVisible();
    await expect(native.locator("noscript .checkoutError")).toContainText("El carrito invitado necesita JavaScript.");
    await expect(native.locator(".guestLoading")).toBeHidden();
    await expect(native.locator(".cartSummary")).toBeHidden();
    await capture(native, info, "38-invitado-sin-javascript");
    await native.goto(productPath);
    await expect(native.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeDisabled();
    await loginCustomer(network);
    await native.context().addCookies(await network.context().cookies());
    await native.goto(productPath); await native.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(native).toHaveURL((url) => url.pathname === "/carrito");
    await expect(native.getByLabel("Cantidad", { exact: true })).toHaveValue("5");
    await native.getByLabel("Cantidad", { exact: true }).fill("2"); await native.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(native.locator(".summaryTotal strong")).toHaveText("S/ 59.80");
    await capture(native, info, "36-cuenta-formulario-nativo");
    await native.getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(native.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close())); await resetCheckoutFixture();
  }
});
