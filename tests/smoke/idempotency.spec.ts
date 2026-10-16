import { expect, test, type Page } from "@playwright/test";

import { capture } from "./capture";
import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());

async function confirmation(page: Page) {
  await page.getByRole("link", { name: "Continuar al checkout" }).click();
  await page.getByRole("link", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Confirma tu reserva", exact: true })).toBeVisible();
}

test("S1-04: response lost after commit, two-tab recovery and changed-content conflict", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const { user, product, zone, cart } = await resetCheckoutFixture();
  await loginCustomer(page); await confirmation(page);
  const url = page.url();
  const key = await page.locator('input[name="checkoutKey"]').inputValue();
  await page.reload();
  await expect(page.locator('input[name="checkoutKey"]')).toHaveValue(key);
  const competing = await page.context().newPage();
  const conflicting = await page.context().newPage();
  try {
    for (const other of [competing, conflicting]) {
      await other.goto(url);
      await expect(other.locator('input[name="checkoutKey"]')).toHaveValue(key);
    }
    const notes = "Entrega ficticia QA, conservar al reintentar";
    await page.getByLabel("Indicaciones del pedido (opcional)").fill(notes);
    await competing.getByLabel("Indicaciones del pedido (opcional)").fill(notes);
    await conflicting.getByLabel("Indicaciones del pedido (opcional)").fill("Otra indicación QA");
    let dropped = false;
    await page.route("**/checkout/pago**", async (route) => {
      if (!dropped && route.request().method() === "POST" && route.request().headers()["next-action"]) {
        dropped = true;
        const response = await route.fetch({ maxRedirects: 0 });
        expect(response.status()).toBeLessThan(400);
        // The real server already committed. Discard only its response to this browser.
        expect(await prisma.order.count({ where: { userId: user.id, checkoutKey: key } })).toBe(1);
        await route.abort("failed");
      } else await route.continue();
    });
    await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    await expect(page.locator('.checkoutError[role="alert"]')).toContainText("No pudimos confirmar la respuesta");
    await expect(page.getByLabel("Indicaciones del pedido (opcional)")).toHaveValue(notes);
    await expect(page.locator('input[name="checkoutKey"]')).toHaveValue(key);
    expect(dropped).toBe(true);
    const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
    await capture(page, testInfo, "13-respuesta-perdida");

    await prisma.product.update({ where: { id: product.id }, data: { price: "75.00" } });
    await prisma.shippingZone.update({ where: { id: zone.id }, data: { price: "22.00" } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } });
    await Promise.all([
      page.getByRole("button", { name: /Confirmar y reservar por/ }).click(),
      competing.getByRole("button", { name: /Confirmar y reservar por/ }).click(),
    ]);
    for (const other of [page, competing]) {
      await expect(other).toHaveURL((u) => u.pathname === `/pedidos/${order.number}/pagar` && u.searchParams.get("recovered") === "1");
      await expect(other.getByText("Recuperamos tu pedido existente.", { exact: true })).toBeVisible();
      await expect(other.locator(".summaryTotal strong")).toHaveText("S/ 98.20");
    }
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.reservationExpiresAt).toEqual(order.reservationExpiresAt);
    expect(saved.customerNotes).toBe(notes);
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.inventoryMovement.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
    await capture(page, testInfo, "14-mismo-pedido-recuperado");

    await conflicting.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    await expect(conflicting).toHaveURL((u) => u.pathname === `/pedidos/${order.number}` && u.searchParams.get("confirmation") === "conflict");
    await expect(conflicting.locator('.checkoutError[role="alert"]')).toContainText("ya creó un pedido con otros datos");
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
    await capture(conflicting, testInfo, "15-conflicto-controlado");
  } finally {
    await competing.close(); await conflicting.close();
  }
});

test("S1-04: native form without JavaScript creates once and hydrated retry recovers it", async ({ page, browser }, testInfo) => {
  test.setTimeout(90_000);
  const { user, product } = await resetCheckoutFixture();
  await loginCustomer(page); await confirmation(page);
  const key = await page.locator('input[name="checkoutKey"]').inputValue();
  const native = await browser.newContext({
    javaScriptEnabled: false, storageState: await page.context().storageState(),
    viewport: page.viewportSize() ?? { width: 1440, height: 1000 },
    isMobile: testInfo.project.name === "mobile", hasTouch: testInfo.project.name === "mobile",
  });
  try {
    const nativePage = await native.newPage();
    await nativePage.goto(page.url());
    await expect(nativePage.locator('input[name="checkoutKey"]')).toHaveValue(key);
    await nativePage.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
    await expect(nativePage).toHaveURL((u) => u.pathname === `/pedidos/${order.number}/pagar`);
    await expect(nativePage.locator(".summaryTotal strong")).toHaveText("S/ 98.20");
    await capture(nativePage, testInfo, "16-reserva-sin-javascript");
    await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    await expect(page).toHaveURL((u) => u.pathname === `/pedidos/${order.number}/pagar` && u.searchParams.get("recovered") === "1");
    expect(await prisma.order.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.payment.count({ where: { orderId: order.id } })).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
  } finally { await native.close(); }
});
