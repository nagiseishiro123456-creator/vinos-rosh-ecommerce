import type { Page, TestInfo } from "@playwright/test";

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images, async (image) => {
      image.loading = "eager";
      await image.decode().catch(() => undefined);
    }));
  });
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled", style: "* { content-visibility: visible !important; }" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}
