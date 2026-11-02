import { expect, test, type Page } from "@playwright/test";

async function alignedLogo(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const logo = document.querySelector(".landingLogo")!.getBoundingClientRect();
    const slot = document.querySelector(".landingLogoSlot")!.getBoundingClientRect();
    return Math.max(Math.abs(logo.left - slot.left), Math.abs(logo.width - slot.width),
      Math.abs(logo.top + logo.height / 2 - slot.top - slot.height / 2));
  })).toBeLessThan(1);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`single-product navigation goes directly to landing purchase (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/envios");
    await expect(page.locator(".siteHeader a[href^='/productos'], .mobileBottomNav a[href^='/productos']")).toHaveCount(0);
    const menu = page.getByRole("button", { name: "Abrir menú", exact: true });
    if (await menu.isVisible()) {
      await menu.click();
      await expect(page.getByRole("navigation", { name: "Navegación móvil", exact: true }).getByRole("link", { name: /producto/i })).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    await page.getByRole("link", { name: "Comprar ROSH →", exact: true }).click();
    await expect(page).toHaveURL(/\/#comprar$/);
    await expect(page.locator(".roshLanding")).toHaveAttribute("data-phase", "final");
    await expect(page.locator("#pbuy")).toBeInViewport();
    await expect(page.locator("#pbuy")).toHaveClass("on");
    await expect(page.locator("#pbuy")).not.toHaveAttribute("inert", "");
    await page.getByRole("link", { name: /Carrito de compras:/ }).click();
    const drawer = page.getByRole("dialog", { name: "Tu carrito", exact: true });
    await drawer.getByRole("link", { name: "Comprar ROSH", exact: true }).click();
    await expect(drawer).not.toBeVisible();
    await expect(page.locator("#pbuy")).toBeInViewport();
    await page.reload();
    await expect(page.locator("#pbuy")).toHaveClass("on");
    await expect(page.locator("#pbuy")).toBeInViewport();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });
}

test("S5 landing: one logo appears, travels, reveals the single bottle and finishes once per session", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator(".roshLanding"); const logo = page.locator(".landingLogo");
  await expect(root).toHaveAttribute("data-phase", "logo");
  await expect.poll(() => logo.evaluate((node) => Number(getComputedStyle(node).opacity))).toBeGreaterThan(.95);
  const initial = await logo.boundingBox();
  expect(initial!.width).toBeCloseTo(Math.min(page.viewportSize()!.width * .72, 640), 0);
  expect(Math.abs(initial!.x + initial!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(1);
  await expect(page.locator('.landingLogo img[alt="ROSH"]')).toHaveCount(1);
  expect(await page.locator(".landingBottle").evaluate((node) => Number(getComputedStyle(node).opacity))).toBe(0);
  await page.screenshot({ path: info.outputPath("s5-landing-01-logo.png"), style: "nextjs-portal {display:none!important}" });
  await expect(root).toHaveAttribute("data-phase", "travel");
  await page.waitForTimeout(350);
  const traveling = await logo.boundingBox();
  expect(traveling!.width).toBeLessThan(initial!.width);
  expect(traveling!.width).toBeGreaterThan(page.viewportSize()!.width <= 820 ? 100 : 140);
  await page.screenshot({ path: info.outputPath("s5-landing-02-logo-viaja.png"), style: "nextjs-portal {display:none!important}" });
  await expect(root).toHaveAttribute("data-phase", "bottle");
  expect(await page.locator(".landingHeaderRight").evaluate((node) => getComputedStyle(node).visibility)).toBe("hidden");
  await page.waitForTimeout(250);
  await page.screenshot({ path: info.outputPath("s5-landing-03-botella.png"), style: "nextjs-portal {display:none!important}" });
  await expect(root).toHaveAttribute("data-phase", "header");
  await page.waitForTimeout(350);
  await page.screenshot({ path: info.outputPath("s5-landing-04-header.png"), style: "nextjs-portal {display:none!important}" });
  await expect(root).toHaveAttribute("data-phase", "final");
  await page.waitForTimeout(800); // The grape fade ends after the document unlocks at 6.8 seconds.
  await alignedLogo(page);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
  await expect(page.locator(".landingBottle")).toBeVisible();
  expect(await page.locator(".landingBottle").evaluate((node) => node.closest("a") === null)).toBe(true);
  await expect(page.locator(".productCard, .roshProductSlide")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("s5-landing-05-final.png"), fullPage: true, animations: "disabled" });
  await page.reload();
  await expect(root).toHaveAttribute("data-phase", "final");
  await expect(root).toHaveAttribute("data-animate", "false");
  expect(errors).toEqual([]);
});

test("S5 landing: four reference widths, reduced motion, aligned logo and accessible mobile menu", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".roshLanding")).toHaveAttribute("data-phase", "final");
  for (const width of [1440, 1024, 820, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await alignedLogo(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator(".landingLogoSlot").boundingBox())!.width).toBe(width <= 820 ? 100 : 140);
    const menu = page.getByRole("button", { name: "Abrir menú", exact: true });
    if (width <= 820) {
      await expect(menu).toBeVisible(); expect((await menu.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      await menu.click();
      const navigation = page.getByRole("navigation", { name: "Navegación móvil", exact: true });
      await expect(navigation.getByRole("link", { name: "Nuestra historia", exact: true })).toHaveAttribute("href", "/nuestra-historia");
      await expect(navigation.getByRole("link", { name: "Iniciar sesión", exact: true })).toHaveAttribute("href", "/iniciar-sesion");
      await page.keyboard.press("Escape"); await expect(menu).toBeFocused(); await expect(navigation).toHaveCount(0);
    } else await expect(menu).not.toBeVisible();
    await page.screenshot({ path: info.outputPath(`s5-landing-reduced-${width}.png`), fullPage: true, animations: "disabled" });
  }
  await expect(page.locator("video")).toHaveCount(0);
});

test("S5 landing: data saving and unavailable session storage keep a usable static page without video requests", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { configurable: true, get: () => { throw new DOMException("Blocked for QA", "SecurityError"); } });
    const network = new EventTarget(); Object.assign(network, { saveData: true, effectiveType: "2g" });
    Object.defineProperty(navigator, "connection", { configurable: true, value: network });
  });
  const videoRequests: string[] = []; page.on("request", (request) => { if (request.url().includes("sueno.mp4")) videoRequests.push(request.url()); });
  await page.goto("/");
  await expect(page.locator(".roshLanding")).toHaveAttribute("data-phase", "final");
  await expect(page.locator(".landingDream")).toHaveAttribute("data-motion", "off");
  await expect(page.locator(".landingMediaPoster")).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  expect(videoRequests).toEqual([]);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
});

test("S5 landing: JavaScript-free entry keeps logo, bottle, poster and existing navigation", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage(); await page.goto(baseURL ?? "http://localhost:3000/");
    await expect(page.locator(".landingLogo")).toBeVisible(); await expect(page.locator(".landingBottle")).toBeVisible();
    await expect(page.locator(".landingMediaPoster")).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".landingCart")).toHaveAttribute("href", "/carrito");
    await expect(page.locator(".landingLogin")).toHaveAttribute("href", "/iniciar-sesion");
  } finally { await context.close(); }
});
