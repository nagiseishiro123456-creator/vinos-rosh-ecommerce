import { expect, test } from "@playwright/test";
import { ADMIN_NAVIGATION } from "../../src/modules/admin/navigation";
import { capture } from "./capture";

test("admin workspace connects existing modules, real period/search controls and a mobile menu that restores scrolling", async ({ page }, testInfo) => {
  test.skip(process.env.SMOKE_TEST_DATA !== "true", "Isolated QA database required");
  test.setTimeout(150000);
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
  await page.goto("/iniciar-sesion?callbackUrl=/admin");
  await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Panel Vinos ROSH", exact: true })).toBeVisible();
  const mobile = (testInfo.project.use.viewport?.width ?? 1440) < 1024;
  const toggle = page.getByRole("button", { name: "Abrir menú administrativo", exact: true });
  const dialog = page.getByRole("dialog", { name: "Menú administrativo", exact: true });
  if (mobile) {
    await toggle.click(); await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
    await page.getByRole("button", { name: "Cerrar menú administrativo", exact: true }).click();
    await expect(dialog).toBeHidden(); expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await toggle.click(); await page.keyboard.press("Escape"); await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    await toggle.click(); await page.mouse.click((testInfo.project.use.viewport?.width ?? 390) - 6, 180);
    await expect(dialog).toBeHidden(); expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  }
  await page.getByRole("link", { name: "7 días", exact: true }).click();
  await expect(page).toHaveURL(/period=7/); await expect(page.getByRole("link", { name: "7 días", exact: true })).toHaveAttribute("aria-current", "page");
  await page.locator(".adminChartData summary").click(); await expect(page.locator(".adminChartData tbody tr")).toHaveCount(7);
  await page.getByRole("link", { name: "90 días", exact: true }).click(); await expect(page).toHaveURL(/period=90/);
  await expect(page.locator(".adminChartData tbody tr")).toHaveCount(90);
  await page.getByRole("link", { name: "30 días", exact: true }).click(); await expect(page).toHaveURL(/period=30/);
  await capture(page, testInfo, "admin-resumen");
  for (const item of ADMIN_NAVIGATION.flatMap(group => [...group.items]).filter(item => item.href !== "/admin")) {
    if (mobile) await toggle.click();
    const nav = page.getByRole("navigation", { name: "Sesión administrativa", exact: true });
    await nav.getByRole("link", { name: item.label, exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === item.href);
    await expect(page.locator("main h1")).toBeVisible();
    if (mobile) { await expect(dialog).toBeHidden(); expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden"); }
    else await expect(nav.getByRole("link", { name: item.label, exact: true })).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), item.label).toBe(true);
  }
  await page.getByRole("searchbox", { name: "Buscar clientes", exact: true }).fill("QA-NO-COINCIDE-ADMIN");
  await page.getByRole("button", { name: "Buscar clientes en el directorio", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/clientes\?q=QA-NO-COINCIDE-ADMIN/);
  await expect(page.getByRole("heading", { name: "Directorio", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Productos|Categorías|Crear producto/ })).toHaveCount(0);
  if (mobile) await toggle.click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  expect((await page.request.get("/api/admin/backup")).status()).toBe(403);
});
