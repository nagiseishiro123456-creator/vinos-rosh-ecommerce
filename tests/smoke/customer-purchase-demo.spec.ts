import { expect, test } from "@playwright/test";

test("la compra simulada no se publica en producción", async ({ page }) => {
  test.skip(!process.env.CI, "El servidor local de esta revisión está en desarrollo.");
  const response = await page.goto("/desarrollo/izipay/compra");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("COMPRA SIMULADA · SIN COBROS", { exact: true })).toHaveCount(0);
});

for (const outcome of ["Aprobación simulada", "Rechazo simulado", "Sin respuesta definitiva"]) {
  test(`compra completa de ejemplo: ${outcome}, sin escrituras ni proveedor`, async ({ page }, testInfo) => {
    const writes: string[] = [], provider: string[] = [], errors: string[] = [];
    page.on("request", request => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
      if (/micuentaweb|izipay\./i.test(new URL(request.url()).hostname)) provider.push(request.url());
    });
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto("/desarrollo/izipay/compra");
    test.skip(response?.status() === 404, "Recorrido disponible exclusivamente en desarrollo; otro caso comprueba el cierre en producción.");
    await expect(page.getByRole("heading", { name: "Una botella para compartir" })).toBeVisible();
    await expect(page.getByText("COMPRA SIMULADA · SIN COBROS", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Agregar una botella", exact: true }).click();
    await page.getByRole("button", { name: "Añadir al carrito de prueba" }).click();
    await expect(page.getByRole("heading", { name: "Tu carrito de prueba" })).toBeVisible();
    await expect(page.getByLabel("Botellas seleccionadas")).toHaveText("2");
    await page.getByRole("button", { name: "Agregar una botella", exact: true }).click();
    await page.getByRole("button", { name: "Continuar con la entrega" }).click();
    await expect(page.getByRole("heading", { name: "¿Dónde te lo entregamos?" })).toBeVisible();
    await page.getByLabel("Celular de ejemplo").fill("99999999");
    await page.getByRole("button", { name: "Continuar al pago simulado" }).click();
    await expect(page.getByRole("heading", { name: "¿Dónde te lo entregamos?" })).toBeVisible();
    await page.getByLabel("Celular de ejemplo").fill("999999999");
    await page.getByRole("button", { name: "Continuar al pago simulado" }).click();
    await expect(page.getByRole("button", { name: /Simular pago de S\/\s*98\.20/ })).toBeVisible();
    await page.getByRole("radio", { name: outcome, exact: true }).check();
    await page.getByRole("button", { name: /Simular pago de/ }).click();
    const title = outcome === "Aprobación simulada" ? "Compra simulada aprobada" : outcome === "Rechazo simulado" ? "Pago simulado rechazado" : "Conservamos tu intento simulado";
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByRole("button", { name: /Simular pago de/ })).toHaveCount(0);
    if (outcome === "Sin respuesta definitiva") {
      await page.getByRole("button", { name: "Consultar estado sin repetir el pago" }).click();
      await expect(page.getByText("Consulta 1 completada: sigue pendiente. No se inició otro pago.")).toBeVisible();
      await page.getByRole("button", { name: "Consultar estado sin repetir el pago" }).click();
      await expect(page.getByText("Consulta 2 completada: sigue pendiente. No se inició otro pago.")).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`compra-${outcome === "Aprobación simulada" ? "aprobada" : outcome === "Rechazo simulado" ? "rechazada" : "pendiente"}.png`), fullPage: true });
    await page.getByRole("button", { name: "Reiniciar demostración" }).click();
    await expect(page.getByRole("heading", { name: "Una botella para compartir" })).toBeVisible();
    await expect(page.getByLabel("Botellas seleccionadas")).toHaveText("1");
    await page.getByRole("button", { name: "Añadir al carrito de prueba" }).click();
    await page.getByRole("button", { name: "Eliminar del carrito de prueba" }).click();
    await expect(page.getByRole("heading", { name: "Tu carrito de prueba está vacío" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar con la entrega" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Una botella para compartir" })).toBeVisible();
    expect(writes).toEqual([]);
    expect(provider).toEqual([]);
    expect(errors).toEqual([]);
  });
}
