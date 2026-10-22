import { expect, test } from "@playwright/test";
import { clearRateLimit } from "../../src/lib/rate-limit";
import { prisma } from "../../src/lib/prisma";
import { capture } from "./capture";

const databaseName = new URL(process.env.DATABASE_URL ?? "").pathname;
if (!["/vinos_rosh_test", "/vinos_rosh_ci"].includes(databaseName)) throw new Error("Registration smoke requires an isolated QA database");

test.afterAll(() => prisma.$disconnect());
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
});

test("registration explains password rules and invalid browser input does not consume attempts", async ({ page }, info) => {
  let requests = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/auth/register")) requests += 1; });
  await page.goto("/registrarse");
  await page.getByLabel("Nombres", { exact: true }).fill("Prueba");
  await page.getByLabel("Apellidos", { exact: true }).fill("Local");
  await page.getByLabel("Correo electrónico").fill("registration-qa@example.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("password");
  await expect(page.locator("#registration-password-help")).toBeVisible();
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  expect(await page.getByLabel("Contraseña", { exact: true }).evaluate((el) => (el as HTMLInputElement).validity.patternMismatch)).toBe(true);
  expect(requests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await capture(page, info, "auth-01-reglas-contrasena");
});

test("registration 429 shows a real waiting time and does not create an account", async ({ page }, info) => {
  const ip = "198.51.100.216";
  const email = `registration-limit-${info.project.name}@example.test`;
  await clearRateLimit("auth-register", ip);
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  try {
    for (let index = 0; index < 6; index += 1) {
      const response = await page.request.post("/api/auth/register", { headers: { "x-forwarded-for": ip }, data: {} });
      expect(response.status()).toBe(400);
    }
    await page.goto("/registrarse");
    await page.getByLabel("Nombres", { exact: true }).fill("Prueba");
    await page.getByLabel("Apellidos", { exact: true }).fill("Local");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("Qa-registration-only-123");
    const blocked = page.waitForResponse((response) => response.url().endsWith("/api/auth/register") && response.status() === 429);
    await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
    const response = await blocked;
    const body = await response.json();
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
    expect(response.headers()["retry-after"]).toBe(String(body.retryAfterSeconds));
    await expect(page.locator(".authCard").getByRole("alert")).toContainText(/Vuelve a intentarlo en \d+ minutos?\./);
    await expect(page.getByRole("button", { name: "Crear cuenta", exact: true })).toBeEnabled();
    expect(await prisma.user.count({ where: { email } })).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await capture(page, info, "auth-02-registro-espera");
  } finally { await clearRateLimit("auth-register", ip); }
});
