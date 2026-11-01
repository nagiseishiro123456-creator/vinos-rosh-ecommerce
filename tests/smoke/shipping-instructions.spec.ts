import { expect, test } from "@playwright/test";
import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());
test("S4: editable delivery information is reviewed again and stays frozen in the reserved order", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const { user, zone, product } = await resetCheckoutFixture();
  const original = zone.deliveryInstructions;
  const adminContext = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch });
  const first = "Información QA de prueba\nCoordinación según lo acordado. No realizar entregas.";
  const reviewed = "Información QA revisada\nNo representa un horario comercial de ROSH.";
  try {
    const admin = await adminContext.newPage();
    await admin.goto("/iniciar-sesion?callbackUrl=/admin/envios");
    await admin.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);
    await admin.getByLabel("Contraseña", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await admin.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(admin).toHaveURL((url) => url.pathname === "/admin/envios");
    const row = admin.getByRole("row").filter({ hasText: zone.district });
    async function editInformation(text: string) {
      await admin.goto("/admin/envios");
      await row.getByRole("link", { name: "Editar tarifa", exact: true }).click();
      await expect(admin.getByRole("link", { name: "Cancelar edición", exact: true })).toBeVisible();
      await admin.getByLabel("Indicaciones de entrega (opcional)", { exact: true }).fill(text);
      await admin.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
      await expect(admin.getByRole("status")).toHaveText("Zona guardada correctamente.");
    }
    await row.getByRole("link", { name: "Editar tarifa", exact: true }).click();
    await expect(admin.getByRole("link", { name: "Cancelar edición", exact: true })).toBeVisible();
    await admin.getByLabel("Indicaciones de entrega (opcional)", { exact: true }).fill(first);
    await admin.getByLabel("Tarifa de envío (S/)", { exact: true }).fill("8,50");
    await admin.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    await expect(admin.locator(".deliveryAddressForm").getByRole("alert")).toContainText("Corrige los campos");
    await expect(admin.getByLabel("Indicaciones de entrega (opcional)", { exact: true })).toHaveValue(first);
    await admin.getByLabel("Tarifa de envío (S/)", { exact: true }).fill("8.50");
    await admin.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    await expect(admin.getByRole("status")).toHaveText("Zona guardada correctamente.");
    await expect(admin.getByLabel("Indicaciones de entrega (opcional)", { exact: true })).toHaveValue("");
    await page.goto("/envios");
    await page.getByLabel("Busca tu distrito, provincia o departamento").fill(zone.district);
    await expect(page.locator(".deliveryInstructionsText")).toHaveText(first);
    await page.screenshot({ path: info.outputPath("s4-indicaciones-publicas.png"), fullPage: true });
    await loginCustomer(page); await page.goto("/checkout");
    await expect(page.locator(".checkoutSummaryCard .deliveryInstructionsText")).toHaveText(first);
    await page.getByRole("link", { name: "Revisar pedido", exact: true }).click();
    await expect(page.locator(".orderReviewCard .deliveryInstructionsText")).toHaveText(first);
    await editInformation(reviewed);
    await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/checkout/pago" && url.searchParams.get("error") === "quote-changed");
    await expect(page.locator(".orderReviewCard .deliveryInstructionsText")).toHaveText(reviewed);
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
    await page.screenshot({ path: info.outputPath("s4-indicaciones-revisar.png"), fullPage: true });
    await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/]+\/pagar/);
    const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
    expect(order.shippingDeliveryInstructions).toBe(reviewed);
    await editInformation("Información QA posterior para pedidos nuevos");
    await page.reload();
    await expect(page.locator(".orderReviewCard .deliveryInstructionsText")).toHaveText(reviewed);
    await page.getByRole("link", { name: "Ver pedido y opciones de cancelación →", exact: true }).click();
    await expect(page.locator(".deliveryInstructionsText")).toHaveText(reviewed);
    await page.screenshot({ path: info.outputPath("s4-indicaciones-conservadas.png"), fullPage: true });
    await admin.goto(`/admin/pedidos/${order.id}`);
    await expect(admin.locator(".deliveryInstructionsText")).toHaveText(reviewed);
  } finally {
    await prisma.shippingZone.update({ where: { id: zone.id }, data: { deliveryInstructions: original } });
    await adminContext.close();
  }
});
