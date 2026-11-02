import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { prisma } from "../../src/lib/prisma";
import type { HistoryRow } from "../../src/modules/history/store";

test("history admin publishes texts and uploaded photos, confirms repeated saves, and keeps them after reload", async ({ page, browser }) => {
  test.skip(process.env.SMOKE_TEST_DATA !== "true", "Isolated QA database required");
  test.setTimeout(120000);
  const original = await prisma.$queryRaw<HistoryRow[]>`SELECT "content", "revision", "updatedAt" FROM "HistoryPage" WHERE "id"='story'`;
  const publicContext = await browser.newContext({ baseURL: "http://127.0.0.1:3000", reducedMotion: "reduce" });
  let imageId = "";
  try {
    const denied = await publicContext.request.post("/api/admin/history/images"); expect(denied.status()).toBe(403);
    await page.goto("/iniciar-sesion?callbackUrl=/admin/historia");
    await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!); await page.getByLabel("Contraseña", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nuestra historia", exact: true })).toBeVisible();
    expect((await page.request.post("/api/admin/history/images", { headers: { origin: "https://other.example" } })).status()).toBe(403);
    await page.getByLabel("Título de la página", { exact: true }).fill("Historia editable QA");
    const png = await sharp({ create: { width: 96, height: 120, channels: 3, background: "#4b1c71" } }).png().toBuffer();
    const preparedResponse = page.waitForResponse(r => r.url().endsWith("/api/admin/history/images") && r.request().method() === "POST");
    await page.getByLabel("Reemplazar foto: Cabecera · arco", { exact: true }).setInputFiles({ name: "foto-qa.png", mimeType: "image/png", buffer: png });
    const uploaded = await preparedResponse, result = await uploaded.json();
    expect(uploaded.status(), JSON.stringify(result)).toBe(201); imageId = result.src.slice(18);
    await expect(page.getByText("Foto preparada. Guarda la página para publicarla.", { exact: true })).toBeVisible();
    await page.getByLabel("Descripción de la cabecera", { exact: true }).fill("Foto editada desde administración QA");
    await page.getByRole("button", { name: "Guardar historia e imágenes", exact: true }).click();
    await expect(page.getByTestId("history-save-feedback")).toContainText("Historia guardada correctamente");
    const publicPage = await publicContext.newPage(); await publicPage.goto("/nuestra-historia");
    await expect(publicPage.getByRole("heading", { name: "Historia editable QA", exact: true })).toBeVisible();
    const image = publicPage.getByRole("img", { name: "Foto editada desde administración QA", exact: true });
    const src = await image.getAttribute("src"); expect(src).toMatch(/^\/api\/story-images\//); imageId = src!.slice(18);
    const response = await publicContext.request.get(src!); expect(response.status()).toBe(200); expect(response.headers()["content-type"]).toBe("image/webp");
    expect((await sharp(await response.body()).metadata()).width).toBe(96);
    await page.getByLabel("Título de la página", { exact: true }).fill("Historia con segundo guardado QA");
    await page.getByRole("button", { name: "Guardar historia e imágenes", exact: true }).click();
    await expect(page.getByTestId("history-save-feedback")).toContainText("Historia guardada correctamente");
    await publicPage.reload(); await expect(publicPage.getByRole("heading", { name: "Historia con segundo guardado QA", exact: true })).toBeVisible();
    await expect(publicPage.getByRole("img", { name: "Foto editada desde administración QA", exact: true })).toHaveAttribute("src", src!);
    for (const scheme of ["light", "dark"] as const) {
      await publicPage.emulateMedia({ colorScheme: scheme });
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(publicPage.getByRole("link", { name: "Conocer la botella →", exact: true })).toHaveAttribute("href", "/#comprar");
    }
  } finally {
    await publicContext.close();
    await prisma.$executeRaw`DELETE FROM "HistoryPage" WHERE "id"='story'`;
    if (original[0]) await prisma.$executeRaw`INSERT INTO "HistoryPage" ("id","content","revision","updatedAt") VALUES ('story',${JSON.stringify(original[0].content)}::jsonb,${original[0].revision},${original[0].updatedAt})`;
    if (imageId) await prisma.$executeRaw`DELETE FROM "StoryImage" WHERE "id"=${imageId}::uuid`;
  }
});
