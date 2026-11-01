import { expect, test } from "@playwright/test";
import { prisma, resetCheckoutFixture } from "./checkout-fixture";
test.afterAll(() => prisma.$disconnect());

test("S5: product and catalog have canonical share metadata and responsive image requests", async ({ page }, info) => {
  const { product } = await resetCheckoutFixture();
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
  await page.goto(`/productos/${product.slug}?utm_source=qa`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/productos/${product.slug}`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `${product.name} | Vinos ROSH`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", `${origin}/products/morado-intenso.webp`);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", `${product.name} | Vinos ROSH`);
  const hero = page.locator(".productMainImage img"); await expect(hero).toBeVisible();
  await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const image = await hero.evaluate((element: HTMLImageElement) => ({ requested: Number(new URL(element.currentSrc).searchParams.get("w")), rendered: element.getBoundingClientRect().width, dpr: devicePixelRatio }));
  expect(image.requested).toBeGreaterThanOrEqual(image.rendered * image.dpr * .9);
  expect(image.requested).toBeLessThanOrEqual(image.rendered * image.dpr * 1.25);
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto("/productos");
  const card = page.locator(`a[href="/productos/${product.slug}"] img`); await expect(card).toBeVisible();
  await expect.poll(() => card.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const thumbnail = await card.evaluate((element: HTMLImageElement) => ({ requested: Number(new URL(element.currentSrc).searchParams.get("w")), rendered: element.getBoundingClientRect().width, dpr: devicePixelRatio }));
  expect(thumbnail.requested).toBeLessThanOrEqual(thumbnail.rendered * thumbnail.dpr * 1.5);
  await page.goto("/productos?q=QA&orden=price-asc");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${origin}/productos`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.screenshot({ path: info.outputPath("s5-catalogo-responsive.png"), fullPage: true });
});
test("S5: request-scoped product reuse does not keep stale metadata or availability across requests", async ({ page }) => {
  const { product } = await resetCheckoutFixture();
  const original = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  try {
    await page.goto(`/productos/${product.slug}`);
    await prisma.product.update({ where: { id: product.id }, data: { name: original.name + " — SEO QA", shortDescription: "Descripción QA actualizada", stock: 0 } });
    await page.reload();
    await expect(page.getByRole("heading", { name: original.name + " — SEO QA", exact: true })).toBeVisible();
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", `${original.name} — SEO QA | Vinos ROSH`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Descripción QA actualizada");
    await expect(page.getByRole("button", { name: "Sin stock", exact: true })).toBeDisabled();
    await prisma.product.update({ where: { id: product.id }, data: { active: false } });
    expect((await page.reload())?.status()).toBe(404);
  } finally {
    await prisma.product.update({ where: { id: product.id }, data: { name: original.name, shortDescription: original.shortDescription, active: original.active, stock: original.stock } });
  }
});
