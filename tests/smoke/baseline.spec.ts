import { expect, test } from "@playwright/test";

test("S1-01: storefront baseline with a connected database", async ({ page, request }, testInfo) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok", database: "connected" });

  const screens = [
    { path: "/", heading: "De nuestro viñedo a tu mesa.", name: "01-home" },
    { path: "/productos", heading: "Productos", name: "02-catalogo" },
    { path: "/productos/rosh-qa-botella-de-prueba", heading: "ROSH QA — Botella de prueba", name: "03-producto-qa" },
    { path: "/iniciar-sesion", heading: "Iniciar sesión", name: "04-acceso" },
  ];

  for (const screen of screens) {
    await test.step(screen.name, async () => {
      const response = await page.goto(screen.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible();
      if (screen.name === "02-catalogo") {
        await expect(page.getByRole("heading", { name: "ROSH QA — Botella de prueba", exact: true })).toBeVisible();
      }
      if (screen.name === "03-producto-qa") {
        await expect(page.locator(".productMainImage img")).toBeVisible();
        await expect.poll(() => page.locator(".productMainImage img").evaluate(
          (image) => (image as HTMLImageElement).naturalWidth,
        )).toBeGreaterThan(0);
      }
      await page.evaluate(() => document.fonts.ready);
      const screenshot = testInfo.outputPath(`${screen.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
      await testInfo.attach(screen.name, { path: screenshot, contentType: "image/png" });
    });
  }
});
