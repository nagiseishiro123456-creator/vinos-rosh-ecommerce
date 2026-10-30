import { expect, test } from "@playwright/test";
import { loginCustomer, prisma, reserveFromCart, resetCheckoutFixture } from "./checkout-fixture";

test("S3-05: approval queues one private preview with external sending disabled", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const { user, product } = await resetCheckoutFixture();
  await loginCustomer(page); await reserveFromCart(page);
  const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
  await page.locator('input[name="operationCode"]').fill(`QA-EMAIL-${info.project.name}-${Date.now()}`);
  await page.locator(".paymentReportForm").getByRole("button", { name: "Ya pagué: enviar operación a revisión" }).click();
  await expect(page).toHaveURL((url) => url.pathname === `/pedidos/${order.number}`);
  const adminContext = await browser.newContext({ viewport: info.project.use.viewport, isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch });
  try {
    const admin = await adminContext.newPage();
    await admin.goto("/iniciar-sesion?callbackUrl=/admin/pagos");
    await admin.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);
    await admin.getByLabel("Contraseña", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await admin.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(admin).toHaveURL((url) => url.pathname === "/admin/pagos");
    const form = admin.getByRole("button", { name: "Confirmar pago", exact: true }).locator("..");
    await form.getByRole("checkbox").check(); await form.getByRole("button", { name: "Confirmar pago", exact: true }).click();
    await expect(admin.getByRole("status")).toHaveText("Operación registrada correctamente.");
    const rows = await prisma.$queryRaw<Array<{ id: string; status: string; attempts: number }>>`SELECT "id", "status", "attempts" FROM "PaymentConfirmationOutbox" WHERE "orderId"=${order.id}`;
    expect(rows).toHaveLength(1); expect(rows[0].status).toBe("QUEUED"); expect(rows[0].attempts).toBe(0);
    await page.goto(`/admin/notificaciones/${rows[0].id}`);
    await expect(page).toHaveURL((url) => url.pathname === "/mi-cuenta");
    await admin.goto("/admin/notificaciones");
    await expect(admin.getByRole("heading", { name: "Confirmaciones por correo" })).toBeVisible();
    await expect(admin.getByText(order.number, { exact: true })).toBeVisible();
    await admin.goto(`/admin/notificaciones/${rows[0].id}`);
    await expect(admin.getByRole("heading", { name: order.number, exact: true })).toBeVisible();
    await expect(admin.getByRole("region", { name: "Vista previa del correo" })).toContainText("S/ 98.20");
    await expect(admin.getByText("Envíos desactivados. Esta vista no envía correos.", { exact: true })).toBeVisible();
    await expect(admin.getByRole("button", { name: "Procesar este aviso" })).toHaveCount(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAID");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
    await admin.screenshot({ path: info.outputPath("s3-05-confirmacion-privada.png"), fullPage: true });
  } finally { await adminContext.close(); }
});
