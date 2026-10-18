import { expect, test, type Page } from "@playwright/test";
import { capture } from "./capture";
import { loginCustomer, prisma, reserveFromCart, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());

test("RI-01: revoking ADMIN blocks existing-session reads, backup and a previously valid shipping action", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const { user } = await resetCheckoutFixture();
  await loginCustomer(page); await reserveFromCart(page);
  const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL! } });
  const district = `QA-REVOCATION-${testInfo.project.name}-${Date.now()}`;
  const adminContext = await browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch });
  try {
    const adminPage = await adminContext.newPage(); await loginAdmin(adminPage);
    const before = await adminPage.goto(`/pedidos/${order.number}`);
    expect(before?.status()).toBe(200);
    await expect(adminPage.getByText("Dirección simulada — no realizar entregas", { exact: true })).toBeVisible();
    expect((await adminContext.request.get("/api/admin/backup")).status()).toBe(200);
    await adminPage.goto("/admin/envios");
    await adminPage.getByLabel("Departamento", { exact: true }).fill("QA");
    await adminPage.getByLabel("Provincia", { exact: true }).fill("QA");
    await adminPage.getByLabel("Distrito", { exact: true }).fill(district);
    await adminPage.getByLabel("Tarifa de envío (S/)", { exact: true }).fill("9.00");
    let payload: { url: string; body: Buffer; contentType: string; action: string } | undefined;
    await adminPage.route("**/admin/envios", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) {
        payload = { url: request.url(), body: request.postDataBuffer()!, contentType: request.headers()["content-type"], action: request.headers()["next-action"] };
        await route.abort();
      } else await route.continue();
    });
    await adminPage.getByRole("button", { name: "Guardar tarifa", exact: true }).click();
    await expect.poll(() => !!payload).toBe(true);
    await prisma.user.update({ where: { id: admin.id }, data: { role: "CUSTOMER" } });
    const session = await (await adminContext.request.get("/api/auth/session")).json();
    expect(session.user.role).toBe("ADMIN"); // Same JWT, current DB role revoked.
    const captured = payload!;
    const replay = await adminContext.request.post(captured.url, { data: captured.body, headers: {
      "content-type": captured.contentType, "next-action": captured.action, origin: new URL(captured.url).origin,
    } });
    expect(replay.headers()["x-action-redirect"] ?? replay.url()).toContain("/mi-cuenta");
    expect(await prisma.shippingZone.count({ where: { district } })).toBe(0);
    await adminPage.unroute("**/admin/envios");
    const after = await adminPage.goto(`/pedidos/${order.number}`);
    expect(after?.status()).toBe(404);
    await expect(adminPage.getByText("Dirección simulada — no realizar entregas", { exact: true })).toHaveCount(0);
    await capture(adminPage, testInfo, "22-pedido-ajeno-tras-revocar-admin");
    const backup = await adminContext.request.get("/api/admin/backup");
    expect(backup.status()).toBe(403); expect(await backup.json()).toEqual({ error: "No autorizado" });
    await adminPage.goto("/admin/envios");
    await expect(adminPage).toHaveURL((u) => u.pathname === "/mi-cuenta");
    await expect(adminPage.getByRole("navigation", { name: "Sesión administrativa" })).toHaveCount(0);
    // The customer still owns and can view their own order.
    await page.goto(`/pedidos/${order.number}`);
    await expect(page.getByRole("heading", { name: "Pendiente de pago", exact: true })).toBeVisible();
  } finally {
    await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
    await prisma.shippingZone.deleteMany({ where: { district } });
    await adminContext.close();
  }
});

async function loginAdmin(page: Page) {
  await page.goto("/iniciar-sesion?callbackUrl=/admin/pagos");
  await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Contraseña", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/admin/pagos");
  await expect(page.getByRole("heading", { name: "Pagos por verificar" })).toBeVisible();
}

async function report(page: Page, operation: string) {
  await page.locator('input[name="operationCode"]').fill(operation);
  await page.locator(".paymentReportForm").getByRole("button", { name: "Ya pagué: enviar operación a revisión" }).click();
  await expect(page).toHaveURL((u) => !u.pathname.endsWith("/pagar") && u.pathname.startsWith("/pedidos/"));
}

test("S1-05: customer authorization, admin approval and recorded external refund", async ({ page, context, browser }, testInfo) => {
  test.setTimeout(120_000);
  const { user, product } = await resetCheckoutFixture();
  await loginCustomer(page);
  await reserveFromCart(page);
  const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
  await report(page, `QA-ADMIN-${testInfo.project.name}-${Date.now()}`);
  await page.goto("/admin/pagos");
  await expect(page).toHaveURL((u) => u.pathname === "/mi-cuenta");
  await page.goto(`/admin/pedidos/${order.id}`);
  await expect(page).toHaveURL((u) => u.pathname === "/mi-cuenta");

  const adminContext = await browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch });
  try {
    const adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
    const approveForm = adminPage.getByRole("button", { name: "Confirmar pago", exact: true }).locator("..");
    await approveForm.getByRole("checkbox").check();
    const approveButton = await approveForm.getByRole("button", { name: "Confirmar pago", exact: true }).boundingBox();
    expect(approveButton?.height).toBeLessThan(96);
    await capture(adminPage, testInfo, "17-revision-administrativa");

    // Replay a real, valid admin action payload under a customer session. Cookie/header
    // isolation proves server authorization even if the admin UI/payload is known.
    let payload: { url: string; body: Buffer; contentType: string; action: string } | undefined;
    await adminPage.route("**/admin/pagos", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) {
        payload = { url: request.url(), body: request.postDataBuffer()!, contentType: request.headers()["content-type"], action: request.headers()["next-action"] };
        await route.abort();
      } else await route.continue();
    });
    await approveForm.getByRole("button", { name: "Confirmar pago", exact: true }).click();
    await expect.poll(() => !!payload).toBe(true);
    const captured = payload!;
    const response = await context.request.post(captured.url, { data: captured.body, headers: {
      "content-type": captured.contentType, "next-action": captured.action, origin: new URL(captured.url).origin,
    } });
    expect(response.headers()["x-action-redirect"] ?? response.url()).toContain("/mi-cuenta");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAYMENT_REVIEW");
    expect(await prisma.orderEvent.count({ where: { orderId: order.id, kind: "PAYMENT_APPROVED" } })).toBe(0);
    await adminPage.unroute("**/admin/pagos");
    await adminPage.goto("/admin/pagos");
    const freshForm = adminPage.getByRole("button", { name: "Confirmar pago", exact: true }).locator("..");
    await freshForm.getByRole("checkbox").check();
    await freshForm.getByRole("button", { name: "Confirmar pago", exact: true }).click();
    await expect(adminPage.getByRole("status")).toHaveText("Operación registrada correctamente.");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);

    await adminPage.goto(`/admin/pedidos/${order.id}`);
    await expect(adminPage.getByText("Pago aprobado", { exact: true })).toBeVisible();
    await capture(adminPage, testInfo, "18-pago-aprobado-trazabilidad");
    await adminPage.getByLabel("Referencia del reembolso", { exact: true }).fill("QA-DEVOLUCION-SIMULADA");
    await adminPage.getByRole("checkbox", { name: "Confirmo que el dinero ya fue devuelto al cliente." }).check();
    await adminPage.getByRole("button", { name: "Registrar reembolso y reponer stock" }).click();
    await expect(adminPage.getByRole("status")).toHaveText("Operación registrada correctamente.");
    await expect(adminPage.getByText("Reembolso registrado", { exact: true })).toBeVisible();
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
    expect(await prisma.inventoryMovement.count({ where: { orderId: order.id, type: "ORDER_RELEASE" } })).toBe(1);
    await capture(adminPage, testInfo, "19-reembolso-administrativo");
    await page.goto(`/pedidos/${order.number}`);
    await expect(page.getByRole("heading", { name: "Reembolsado", exact: true })).toBeVisible();
  } finally { await adminContext.close(); }
});

test("S1-05: reasoned rejection and late income reconciliation keep cancelled stock available", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const { user, product } = await resetCheckoutFixture();
  await loginCustomer(page); await reserveFromCart(page);
  const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
  const operation = `QA-LATE-${testInfo.project.name}-${Date.now()}`;
  await report(page, operation);
  const adminContext = await browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch });
  try {
    const adminPage = await adminContext.newPage(); await loginAdmin(adminPage);
    const rejectForm = adminPage.getByRole("button", { name: "Rechazar y liberar stock" }).locator("..");
    await rejectForm.getByLabel("Motivo del rechazo").fill("Ingreso aún no localizado; conciliar si se confirma después.");
    await rejectForm.getByRole("checkbox").check();
    await rejectForm.getByRole("button", { name: "Rechazar y liberar stock" }).click();
    await expect(adminPage.getByRole("status")).toHaveText("Operación registrada correctamente.");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
    await adminPage.goto(`/admin/pedidos/${order.id}`);
    await expect(adminPage.getByText("Pago rechazado", { exact: true })).toBeVisible();
    await adminPage.getByLabel("Importe realmente recibido en PEN").fill("100.00");
    await adminPage.getByLabel("Motivo de conciliación").fill("Ingreso tardío confirmado. Devolver S/100.00 íntegros.");
    await adminPage.getByRole("checkbox", { name: "Verifiqué este ingreso en la cuenta real del negocio." }).check();
    await adminPage.getByRole("button", { name: "Abrir conciliación" }).click();
    await expect(adminPage.getByRole("heading", { name: "Ingreso pendiente de devolución" })).toBeVisible();
    await capture(adminPage, testInfo, "20-conciliacion-abierta");
    await adminPage.getByLabel("Referencia de devolución", { exact: true }).fill("QA-LATE-REFUND-SIMULADO");
    await adminPage.getByRole("checkbox", { name: "Confirmo que devolví íntegramente el importe recibido." }).check();
    await adminPage.getByRole("button", { name: "Registrar devolución de conciliación" }).click();
    await expect(adminPage.getByRole("heading", { name: "Conciliación resuelta" })).toBeVisible();
    await expect(adminPage.getByText("Conciliación resuelta", { exact: true })).toHaveCount(2);
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: { include: { reconciliation: true } } } });
    expect(saved.status).toBe("CANCELLED"); expect(saved.payments[0].status).toBe("REJECTED");
    expect(saved.payments[0].reconciliation?.receivedAmount.toFixed(2)).toBe("100.00");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
    expect(await prisma.inventoryMovement.count({ where: { orderId: order.id, type: "ORDER_RELEASE" } })).toBe(1);
    await capture(adminPage, testInfo, "21-conciliacion-resuelta");
  } finally { await adminContext.close(); }
});
