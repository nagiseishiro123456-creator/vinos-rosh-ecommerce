import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { expect, test, type Page, type TestInfo, type Response } from "@playwright/test";
import { clearRateLimit } from "../../src/lib/rate-limit";
import { capture } from "./capture";
import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";

const productPath = "/productos/rosh-qa-botella-de-prueba";
const panel = (page: Page) => page.getByRole("dialog", { name: "Tu carrito", exact: true });
const total = (page: Page) => panel(page).locator(".cartDrawerFooter .summaryTotal strong");
test.afterAll(() => prisma.$disconnect());
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
  for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "unknown"]) await clearRateLimit("guest-cart-preview", ip);
});
async function open(page: Page) {
  await page.locator(".cartButton").click(); await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole("heading", { name: "Tu carrito", exact: true })).toBeFocused();
}
async function geometry(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const box = await panel(page).locator(".cartDrawerPanel").boundingBox();
  expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  for (const button of await panel(page).locator("button, a.button, .drawerFooterLinks a").all()) {
    if (!await button.isVisible()) continue;
    const rect = await button.boundingBox(); expect(rect!.width).toBeGreaterThanOrEqual(44); expect(rect!.height).toBeGreaterThanOrEqual(44);
  }
  for (const item of await panel(page).locator(".cartItem").all()) {
    const image = await item.locator(".cartItemImage, .guestImagePlaceholder").boundingBox();
    const info = await item.locator(".cartItemInfo").boundingBox();
    const quantity = await item.locator(".quantityForm").boundingBox();
    const lineTotal = await item.locator(".cartItemTotal").boundingBox();
    expect(info!.x).toBeGreaterThanOrEqual(image!.x + image!.width + 6);
    expect(info!.width, "Product name must remain readable inside a narrow drawer").toBeGreaterThanOrEqual(160);
    expect(quantity!.y).toBeGreaterThanOrEqual(info!.y + info!.height - 1);
    expect(lineTotal!.y).toBeGreaterThanOrEqual(quantity!.y + quantity!.height - 1);
  }
  const footer = await panel(page).locator(".cartDrawerFooter").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
}
async function shot(page: Page, info: TestInfo, name: string) {
  if (["small-mobile", "tablet"].includes(info.project.name) && !/^(52|54|60|62)-/.test(name)) return;
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => Promise.all(Array.from(document.querySelectorAll("#cart-drawer img"), (image) => (image as HTMLImageElement).decode().catch(() => undefined))));
  const path = info.outputPath(name + ".png");
  await page.screenshot({ path, fullPage: false, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}
async function quantity(cartId: string, productId: string) {
  return (await prisma.cartItem.findUniqueOrThrow({ where: { cartId_productId: { cartId, productId } } })).quantity;
}

test("closing the cart releases the native modal and background navigation with and without motion", async ({ page }) => {
  await page.goto("/");
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    for (const method of ["button", "escape", "continue"] as const) {
      const overflow = await page.evaluate(() => document.body.style.overflow);
      await open(page);
      if (method === "escape") await page.keyboard.press("Escape");
      else await panel(page).getByRole("button", { name: method === "button" ? "Cerrar carrito" : "Continuar comprando", exact: true }).click();
      await expect(page.locator("#cart-drawer")).not.toHaveAttribute("open", "");
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(overflow);
      await expect(page.locator(".cartButton")).toBeFocused();
    }
    await page.getByRole("link", { name: "Explorar catálogo", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/productos");
    await page.goto("/");
  }
});

test("S2-05: guest panel contains keyboard focus, restores scroll and shares selection with the page", async ({ page }, info) => {
  test.setTimeout(120_000); await resetCheckoutFixture();
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  const scripts: Response[] = []; page.on("response", (response) => { if (response.request().resourceType() === "script") scripts.push(response); });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(productPath); await expect(page.getByRole("button", { name: "Agregar al carrito", exact: true })).toBeEnabled();
  const beforeScripts = new Set(scripts.map((response) => response.url()));
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
  const opener = page.locator(".cartButton");
  await opener.scrollIntoViewIfNeeded();
  const original = await page.evaluate(() => ({ y: scrollY, overflow: document.body.style.overflow, padding: document.body.style.paddingRight }));
  await opener.click(); await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole("heading", { name: "Tu carrito", exact: true })).toBeFocused();
  await expect(total(page)).toHaveText("S/ 0.00"); await geometry(page);
  await expect(panel(page).locator(".cartDrawerPanel")).toHaveAttribute("data-reduced-motion", "false");
  await expect(panel(page).getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
  for (let index = 0; index < 16; index++) {
    await page.keyboard.press(index < 8 ? "Tab" : "Shift+Tab");
    const focus = await page.evaluate(() => ({ inside: document.querySelector("#cart-drawer")!.contains(document.activeElement), active: document.activeElement?.outerHTML.slice(0,300) }));
    expect(focus.inside, "Tab " + index + ": " + focus.active).toBe(true);
  }
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await shot(page, info, "52-panel-vacio");
  const loaded = await Promise.all(scripts.filter((response) => !beforeScripts.has(response.url())).map(async (response) => {
    const body = await response.body();
    return { path: new URL(response.url()).pathname, rawBytes: body.byteLength, gzipBytes: gzipSync(body).byteLength };
  }));
  const metricPath = info.outputPath("drawer-chunks.json");
  await writeFile(metricPath, JSON.stringify({ project: info.project.name, loadedOnOpen: loaded,
    note: "Raw JS response and reproducible gzip estimate; not a Core Web Vitals measurement." }));
  await info.attach("s205-drawer-chunks", { path: metricPath, contentType: "application/json" });
  await page.keyboard.press("Escape"); await expect(panel(page)).toBeHidden(); await expect(opener).toBeFocused();
  expect(await page.evaluate(() => ({ y: scrollY, overflow: document.body.style.overflow, padding: document.body.style.paddingRight }))).toEqual(original);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const addButton = page.getByRole("button", { name: "Agregar al carrito", exact: true });
  await addButton.scrollIntoViewIfNeeded();
  const addScroll = await page.evaluate(() => scrollY);
  await addButton.click();
  await expect(panel(page)).toBeVisible(); await expect(total(page)).toHaveText("S/ 29.90");
  await expect(page).toHaveURL((url) => url.pathname === productPath);
  await expect(panel(page).locator(".cartDrawerPanel")).toHaveAttribute("data-reduced-motion", "true");
  expect(await panel(page).locator(".cartDrawerPanel").evaluate((element) => getComputedStyle(element).transform)).toBe("none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(panel(page).locator(".cartDrawerPanel")).toHaveAttribute("data-reduced-motion", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(panel(page).locator(".cartDrawerPanel")).toHaveAttribute("data-reduced-motion", "true");
  await geometry(page); await shot(page, info, "53-panel-invitado");
  await panel(page).locator("input[name=quantity]").fill("2");
  await panel(page).getByRole("button", { name: "Actualizar", exact: true }).click();
  await expect(total(page)).toHaveText("S/ 59.80"); await expect(page.locator(".cartButton .cartCount")).toHaveText("2");
  await geometry(page); await shot(page, info, "54-panel-cantidad");
  await panel(page).getByRole("button", { name: "Continuar comprando", exact: true }).click();
  await expect(panel(page)).toBeHidden(); await expect(addButton).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(addScroll);
  await open(page);
  const token = randomUUID();
  await page.evaluate((value) => { (window as Window & { qaDocument?: string }).qaDocument = value; }, token);
  await panel(page).getByRole("link", { name: "Ver carrito completo", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/carrito"); await expect(panel(page)).toBeHidden();
  await expect(page.getByRole("heading", { name: "Carrito", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => (window as Window & { qaDocument?: string }).qaDocument)).toBe(token);
  await expect(page.locator(".guestCart input[name=quantity]")).toHaveValue("2");
  await expect(page.locator(".guestCart .summaryTotal strong")).toHaveText("S/ 59.80");
  await open(page); await expect(total(page)).toHaveText("S/ 59.80");
  await panel(page).getByRole("button", { name: /Eliminar ROSH QA/ }).click();
  await expect(panel(page).getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
  await expect(panel(page).getByRole("heading", { name: "Tu selección", exact: true })).toBeFocused();
  await panel(page).getByRole("button", { name: "Continuar comprando", exact: true }).click();
  await expect(panel(page)).toBeHidden(); await expect(page.locator(".guestCart").getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
  if (page.viewportSize()!.width < 768) {
    await page.goto("/productos");
    const bottom = page.locator(".mobileBottomCart");
    await expect(bottom).toBeVisible(); await bottom.click(); await expect(panel(page)).toBeVisible();
    await expect(panel(page).getByRole("heading", { name: "Tu carrito", exact: true })).toBeFocused();
    await page.keyboard.press("Escape"); await expect(panel(page)).toBeHidden(); await expect(bottom).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test("S2-05: real concurrent additions and lost-response retry stay consistent across tabs", async ({ page, context }, info) => {
  test.setTimeout(150_000); const f = await resetCheckoutFixture(); const second = await context.newPage();
  try {
    await loginCustomer(page);
    const add = () => ({ action: "add", productId: f.product.id, expectedUserId: f.user.id, operationId: randomUUID() });
    const responses = await Promise.all([page.request.post("/api/cart", { headers: { origin: "http://127.0.0.1:3000" }, data: add() }),
      page.request.post("/api/cart", { headers: { origin: "http://127.0.0.1:3000" }, data: add() })]);
    expect(responses.map((response) => response.status())).toEqual([200, 200]); expect(await quantity(f.cart.id, f.product.id)).toBe(5);
    await second.goto("/carrito"); await expect(second.getByLabel("Cantidad", { exact: true })).toHaveValue("5");
    await page.goto(productPath);
    let lose = true;
    const identities: string[] = [];
    await page.route("**/api/cart", async (route) => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      identities.push(route.request().postDataJSON().operationId);
      if (lose) { lose = false; const committed = await route.fetch(); expect(committed.status()).toBe(200); await route.abort(); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(panel(page)).toBeVisible(); await expect(panel(page).getByRole("alert")).toContainText("sin repetirla");
    expect(await quantity(f.cart.id, f.product.id)).toBe(6);
    await expect(panel(page).getByRole("link", { name: "Continuar al checkout", exact: true })).toHaveCount(0);
    await geometry(page); await shot(page, info, "55-panel-respuesta-perdida");
    await panel(page).getByRole("button", { name: "Reintentar cambio", exact: true }).click();
    await expect(panel(page).locator(".accountCartStatus")).toContainText("sin repetirlo"); await expect(total(page)).toHaveText("S/ 179.40");
    expect(identities).toHaveLength(2); expect(identities[0]).toBe(identities[1]);
    expect(await prisma.cartMutation.count({ where: { userId: f.user.id } })).toBe(3);
    await expect(second.getByLabel("Cantidad", { exact: true })).toHaveValue("6");
    await shot(page, info, "56-panel-recuperado");
    await panel(page).getByLabel("Cantidad", { exact: true }).fill("4");
    await panel(page).getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(total(page)).toHaveText("S/ 119.60"); await expect(page.locator(".cartButton .cartCount")).toHaveText("4");
    await expect(second.getByLabel("Cantidad", { exact: true })).toHaveValue("4");
    await shot(page, info, "57-panel-cuenta-sincronizada");
    await panel(page).getByRole("button", { name: "Eliminar", exact: true }).click();
    await expect(panel(page).getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
    await expect(second.getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(10);
    expect(await prisma.order.count({ where: { userId: f.user.id } })).toBe(0);
    expect(await page.evaluate(() => Object.entries(localStorage).filter(([key]) => /cart/i.test(key)).every(([, value]) => !/unitPrice|subtotal|password|addressLine/.test(value)))).toBe(true);
  } finally { await page.unrouteAll({ behavior: "ignoreErrors" }); await second.close(); await resetCheckoutFixture(); }
});

test("S2-05: loading, saving, stock changes, network failure and expired session are recoverable", async ({ page }, info) => {
  test.setTimeout(150_000); const f = await resetCheckoutFixture();
  let releaseRead = () => {}, releaseWrite = () => {};
  try {
    await loginCustomer(page);
    let startedRead!: () => void; const reading = new Promise<void>((resolve) => { startedRead = resolve; });
    const readGate = new Promise<void>((resolve) => { releaseRead = resolve; }); let holdRead = true;
    await page.route("**/api/cart", async (route) => {
      if (route.request().method() === "GET" && holdRead) { holdRead = false; const response = await route.fetch(); startedRead(); await readGate; await route.fulfill({ response }); }
      else await route.continue();
    });
    await open(page); await reading;
    await expect(panel(page).locator(".accountCartStatus")).toContainText("Verificando");
    await shot(page, info, "58-panel-cargando"); releaseRead();
    await expect(total(page)).toHaveText("S/ 89.70"); await page.unroute("**/api/cart");
    let startedWrite!: () => void; const writing = new Promise<void>((resolve) => { startedWrite = resolve; });
    const writeGate = new Promise<void>((resolve) => { releaseWrite = resolve; }); let holdWrite = true;
    await page.route("**/api/cart", async (route) => {
      if (route.request().method() === "POST" && holdWrite) { holdWrite = false; const response = await route.fetch(); startedWrite(); await writeGate; await route.fulfill({ response }); }
      else await route.continue();
    });
    await panel(page).getByLabel("Cantidad", { exact: true }).fill("4");
    await panel(page).getByRole("button", { name: "Actualizar", exact: true }).click(); await writing;
    await expect(panel(page).locator(".accountCartStatus")).toContainText("Guardando");
    expect(await quantity(f.cart.id, f.product.id)).toBe(4);
    await expect(page.locator(".cartButton .cartCount")).toHaveText("3");
    await shot(page, info, "59-panel-guardando"); releaseWrite();
    await expect(total(page)).toHaveText("S/ 119.60"); await page.unroute("**/api/cart");
    await panel(page).getByRole("button", { name: "Cerrar carrito", exact: true }).click(); await expect(panel(page)).toBeHidden();
    await prisma.product.update({ where: { id: f.product.id }, data: { stock: 0 } });
    await open(page);
    await expect(panel(page).getByText("Este producto ya no está disponible.", { exact: true })).toBeVisible();
    await expect(panel(page).getByRole("link", { name: "Continuar al checkout", exact: true })).toHaveCount(0);
    await geometry(page); await shot(page, info, "60-panel-sin-disponibilidad");
    await panel(page).getByRole("button", { name: "Cerrar carrito", exact: true }).click(); await expect(panel(page)).toBeHidden();
    await page.route("**/api/cart", (route) => route.abort());
    await open(page); await expect(panel(page).getByRole("alert")).toContainText("No pudimos verificar");
    await shot(page, info, "61-panel-error-red");
    await page.unroute("**/api/cart"); await prisma.product.update({ where: { id: f.product.id }, data: { stock: 10 } });
    await panel(page).getByRole("button", { name: "Actualizar carrito", exact: true }).click();
    await expect(total(page)).toHaveText("S/ 119.60");
    await page.context().clearCookies(); await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(panel(page).getByRole("alert")).toContainText("Tu sesión venció");
    await expect(panel(page).locator(".cartItem")).toHaveCount(0); await expect(total(page)).toHaveText("Por verificar");
    await expect(panel(page).getByRole("link", { name: "Volver a ingresar", exact: true })).toHaveAttribute("href", "/iniciar-sesion?callbackUrl=/carrito");
    await geometry(page); await shot(page, info, "62-panel-sesion-vencida");
    await page.route("**/api/cart", (route) => route.abort());
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(panel(page).getByRole("alert")).toContainText("Tu sesión venció");
    await expect(page.locator(".accountCart .cartItem")).toHaveCount(0);
    expect(await quantity(f.cart.id, f.product.id)).toBe(4);
  } finally { releaseRead(); releaseWrite(); await page.unrouteAll({ behavior: "ignoreErrors" }); await resetCheckoutFixture(); }
});

test("S2-05: editing from checkout refreshes the server quote and reservation clears the shared cart", async ({ page }, info) => {
  test.setTimeout(120_000); const f = await resetCheckoutFixture();
  try {
    await loginCustomer(page); await page.getByRole("link", { name: "Continuar al checkout", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Entrega y envío", exact: true })).toBeVisible();
    await open(page); await expect(total(page)).toHaveText("S/ 89.70");
    await panel(page).getByLabel("Cantidad", { exact: true }).fill("2");
    await panel(page).getByRole("button", { name: "Actualizar", exact: true }).click(); await expect(total(page)).toHaveText("S/ 59.80");
    await panel(page).getByRole("button", { name: "Continuar comprando", exact: true }).click(); await expect(panel(page)).toBeHidden();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 68.30");
    if (["desktop", "mobile"].includes(info.project.name)) await capture(page, info, "63-checkout-tras-panel");
    await page.getByRole("link", { name: "Revisar pedido", exact: true }).click();
    await expect(page.locator(".orderReviewCard .summaryTotal strong")).toHaveText("S/ 68.30");
    await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/]+\/pagar/);
    await expect(page.locator(".cartButton .cartCount")).toHaveCount(0);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(8);
    expect(await prisma.cartItem.count({ where: { cartId: f.cart.id } })).toBe(0);
    if (["desktop", "mobile"].includes(info.project.name)) await capture(page, info, "64-reserva-tras-panel");
    await open(page); await expect(panel(page).getByText("Tu carrito está vacío.", { exact: true })).toBeVisible();
  } finally { await resetCheckoutFixture(); }
});

test("S2-05: switching the shared session clears the previous account without mutating another cart", async ({ page, context }, info) => {
  test.setTimeout(120_000); const f = await resetCheckoutFixture();
  const other = await prisma.user.create({ data: { email: "drawer-" + randomUUID() + "@example.com",
    passwordHash: f.user.passwordHash, firstName: "QA", lastName: "Otra cuenta",
    cart: { create: { items: { create: { productId: f.product.id, quantity: 1 } } } } }, include: { cart: true } });
  const second = await context.newPage();
  try {
    await loginCustomer(page); await open(page); await expect(total(page)).toHaveText("S/ 89.70");
    await loginCustomer(second, other.email);
    await page.bringToFront(); await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(panel(page).getByRole("alert")).toContainText("La cuenta cambió");
    await expect(panel(page).locator(".cartItem")).toHaveCount(0); await expect(total(page)).toHaveText("Por verificar");
    await expect(page.locator(".cartButton .cartCount")).toHaveCount(0);
    const rejected = await page.request.post("/api/cart", { headers: { origin: "http://127.0.0.1:3000" },
      data: { expectedUserId: f.user.id, operationId: randomUUID(), productId: f.product.id, action: "add" } });
    expect(rejected.status()).toBe(409); expect((await rejected.json()).code).toBe("ACCOUNT_CHANGED");
    expect(await quantity(f.cart.id, f.product.id)).toBe(3); expect(await quantity(other.cart!.id, f.product.id)).toBe(1);
    expect(await prisma.cartMutation.count({ where: { userId: { in: [f.user.id, other.id] } } })).toBe(0);
    await geometry(page); await shot(page, info, "65-panel-cuenta-distinta");
    await panel(page).getByRole("button", { name: "Cerrar carrito", exact: true }).click();
    await expect(panel(page)).toBeHidden();
    await page.getByRole("link", { name: "Ir al inicio de Vinos ROSH", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.locator(".cartButton .cartCount")).toHaveText("1");
    await open(page); await expect(total(page)).toHaveText("S/ 29.90");
    await expect(panel(page).getByLabel("Cantidad", { exact: true })).toHaveValue("1");
    await prisma.user.delete({ where: { id: other.id } });
    await page.goto("/carrito");
    await expect(page).toHaveURL((url) => url.pathname === "/iniciar-sesion" && url.searchParams.get("callbackUrl") === "/carrito");
  } finally { await second.close(); await prisma.user.deleteMany({ where: { id: other.id } }); await resetCheckoutFixture(); }
});
