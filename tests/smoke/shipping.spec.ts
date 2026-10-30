import { expect, test } from "@playwright/test";
import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());

test("S4: paused tariffs remain paused when edited and checkout agrees with public coverage", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const { product, zone } = await resetCheckoutFixture();
  const adminContext = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch });
  try {
    await page.goto("/envios");
    await page.getByLabel("Busca tu distrito, provincia o departamento").fill(zone.district);
    await expect(page.getByRole("heading", { name: zone.district, exact: true })).toBeVisible();
    await page.getByLabel("Busca tu distrito, provincia o departamento").fill("Ubicación QA sin tarifa configurada");
    await expect(page.getByRole("heading", { name: "No encontramos esa zona" })).toBeVisible();
    await page.screenshot({ path: info.outputPath("s4-sin-cobertura.png"), fullPage: true });
    const admin = await adminContext.newPage();
    await admin.goto("/iniciar-sesion?callbackUrl=/admin/envios");
    await admin.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);
    await admin.getByLabel("Contraseña", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await admin.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(admin).toHaveURL((url) => url.pathname === "/admin/envios");
    const row = admin.getByRole("row").filter({ hasText: zone.district });
    await row.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(row).toContainText("Pausado");
    await loginCustomer(page); await page.goto("/checkout");
    await expect(page.locator(".summaryTotal strong")).toHaveText("Por calcular");
    await expect(page.getByRole("button", { name: "Revisar pedido", exact: true })).toBeDisabled();
    await row.getByRole("link", { name: "Editar tarifa", exact: true }).click();
    await admin.getByLabel("Tarifa de envío (S/)", { exact: true }).fill("8,50");
    await admin.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    await expect(admin.locator(".deliveryAddressForm").getByRole("alert")).toContainText("Corrige los campos");
    await expect(admin.getByLabel("Tarifa de envío (S/)", { exact: true })).toHaveValue("8,50");
    await admin.getByLabel("Tarifa de envío (S/)", { exact: true }).fill("9.50");
    await admin.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    await expect(admin.getByRole("status")).toHaveText("Zona guardada correctamente.");
    await expect(row).toContainText("Pausado");
    expect((await prisma.shippingZone.findUniqueOrThrow({ where: { id: zone.id } })).active).toBe(false);
    await admin.screenshot({ path: info.outputPath("s4-tarifa-pausada.png"), fullPage: true });
    await row.getByRole("button", { name: "Activar", exact: true }).click();
    await expect(row).toContainText("Activo");
    await page.reload();
    await expect(page.locator(".summaryTotal strong")).toHaveText(/S\/\s*99\.20/);
    await page.goto("/envios");
    await page.getByLabel("Busca tu distrito, provincia o departamento").fill(zone.district.toLowerCase());
    await expect(page.getByRole("article").filter({ hasText: zone.district })).toContainText(/S\/\s*9\.50/);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
    await page.screenshot({ path: info.outputPath("s4-cobertura-real.png"), fullPage: true });
  } finally {
    await prisma.shippingZone.update({ where: { id: zone.id }, data: { active: true, price: "8.50" } });
    await adminContext.close();
  }
});

test("S4: delivery errors preserve input and the saved address has one primary", async ({ page }, info) => {
  test.setTimeout(120_000);
  const { user, zone } = await resetCheckoutFixture();
  const original = await prisma.address.findMany({ where: { userId: user.id, active: true }, select: { id: true, isDefault: true } });
  const label = "QA-S4-" + info.project.name;
  try {
    await loginCustomer(page); await page.goto("/mi-cuenta/direcciones");
    await page.getByLabel("Nombre de la dirección", { exact: true }).fill(label);
    await page.getByLabel("Persona que recibe", { exact: true }).fill("Cliente QA Entrega");
    await page.getByLabel("Celular", { exact: true }).fill("98765432");
    await page.getByLabel("Distrito / zona", { exact: true }).selectOption(zone.id);
    await page.getByLabel("Dirección exacta", { exact: true }).fill("Dirección QA de demostración, no realizar entregas");
    await page.getByRole("checkbox", { name: "Usar como dirección principal" }).check();
    await page.getByRole("button", { name: "Guardar dirección", exact: true }).click();
    await expect(page.getByText("Escribe un celular peruano de 9 dígitos que empiece con 9. Puedes incluir +51.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Celular", { exact: true })).toHaveValue("98765432");
    await page.screenshot({ path: info.outputPath("s4-direccion-error.png"), fullPage: true });
    await page.getByLabel("Celular", { exact: true }).fill("+51 987654321");
    await page.getByRole("button", { name: "Guardar dirección", exact: true }).click();
    await expect(page.getByText("Dirección guardada correctamente.", { exact: true })).toBeVisible();
    const card = page.locator(".accountAddressManagerCard").filter({ hasText: label });
    await expect(card).toContainText("987654321"); await expect(card).toContainText("Principal");
    expect(await prisma.address.count({ where: { userId: user.id, active: true, isDefault: true } })).toBe(1);
    await page.screenshot({ path: info.outputPath("s4-direccion-guardada.png"), fullPage: true });
    await card.getByRole("button", { name: "Quitar dirección", exact: true }).click();
    await expect(card).toHaveCount(0);
    expect(await prisma.address.count({ where: { userId: user.id, active: true, isDefault: true } })).toBe(1);
  } finally {
    await prisma.address.deleteMany({ where: { userId: user.id, label } });
    for (const address of original) await prisma.address.updateMany({ where: { id: address.id }, data: { isDefault: address.isDefault } });
  }
});
