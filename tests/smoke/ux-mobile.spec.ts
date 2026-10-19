import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { capture } from "./capture";
import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());

async function viewportCapture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}

async function checkLayout(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
    outside: Array.from(document.querySelectorAll("main input, main select, main textarea, main .button, .orderReviewCard, .cartSummary"))
      .filter((node) => { const r = node.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > window.innerWidth + 1); })
      .map((node) => node.className || node.tagName),
  }));
  expect.soft(metrics.page, `${label}: page width`).toBeLessThanOrEqual(metrics.viewport + 1);
  expect.soft(metrics.outside, `${label}: controls/cards outside viewport`).toEqual([]);
}

async function checkFocusedControl(control: Locator, label: string) {
  await control.focus();
  await control.page().keyboard.press("Shift+Tab");
  await control.page().keyboard.press("Tab");
  await expect(control).toBeFocused(); // Actual keyboard navigation and native focus scrolling.
  const metrics = await control.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const points = [0.2, 0.5, 0.8].map((fraction) => {
      const x = r.left + r.width * fraction, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return Boolean(hit && (node === hit || node.contains(hit)));
    });
    return { width: r.width, height: r.height, top: r.top, bottom: r.bottom,
      viewportHeight: innerHeight, visible: points.every(Boolean),
      outline: parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle };
  });
  expect.soft(metrics.width, `${label}: touch width`).toBeGreaterThanOrEqual(44);
  expect.soft(metrics.height, `${label}: touch height`).toBeGreaterThanOrEqual(44);
  expect.soft(metrics.top, `${label}: above viewport`).toBeGreaterThanOrEqual(-1);
  expect.soft(metrics.bottom, `${label}: below viewport`).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect.soft(metrics.visible, `${label}: covered at hit-test points`).toBe(true);
  expect.soft(metrics.outline, `${label}: focus outline width`).toBeGreaterThanOrEqual(2);
  expect.soft(metrics.outlineStyle, `${label}: focus outline style`).not.toBe("none");
}

async function checkMoneyLines(page: Page) {
  const split = await page.locator(".orderReviewItems strong, .summaryRow strong, .summaryTotal strong").evaluateAll((nodes) =>
    nodes.filter((node) => {
      const range = document.createRange(); range.selectNodeContents(node);
      const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top)));
      return lines.size > 1;
    }).map((node) => node.textContent));
  expect.soft(split, "currency and value must occupy one line").toEqual([]);
}

test("S2-02: keyboard, unobscured controls, reading order and long money across the purchase flow", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
  // QA must never send analytics, even if someone changes consent during this test.
  await page.route(/googletagmanager\.com|connect\.facebook\.net/, (route) => route.abort());
  const { user, product, zone, cart } = await resetCheckoutFixture();
  const originalName = product.name;
  const extraAddress = await prisma.address.create({ data: {
    userId: user.id, label: "Oficina QA S2-02", recipient: "Cliente QA", phone: "000000000",
    department: zone.department, province: zone.province, district: zone.district,
    addressLine1: "Segunda dirección sintética", isDefault: false,
  } });
  try {
    await loginCustomer(page);
    await checkLayout(page, "cart");
    await page.getByLabel("Cantidad", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Actualizar", exact: true })).toBeFocused();
    await checkFocusedControl(page.getByRole("button", { name: "Actualizar", exact: true }), "update quantity");
    await checkFocusedControl(page.getByRole("button", { name: "Eliminar", exact: true }), "remove line");
    await checkFocusedControl(page.getByRole("link", { name: "Continuar al checkout" }), "continue to delivery");
    await viewportCapture(page, info, "23-carrito-foco-visible");

    await page.getByRole("link", { name: "Continuar al checkout" }).click();
    await expect(page.getByRole("heading", { name: "Entrega y envío", exact: true })).toBeVisible();
    await checkLayout(page, "delivery");
    const radios = page.locator(".checkoutAddressCard input[type='radio']");
    expect.soft(await radios.count(), "addresses use native radios").toBe(2);
    if (await radios.count() === 2) {
      const initial = page.locator(".checkoutAddressCard input:checked");
      const originalId = await initial.getAttribute("value");
      await initial.focus();
      await page.keyboard.press("ArrowDown");
      const nextId = await page.locator(".checkoutAddressCard input:checked").getAttribute("value");
      expect.soft(nextId).not.toBe(originalId);
      expect.soft(await page.getByRole("link", { name: "Revisar pedido", exact: true }).getAttribute("href")).toContain(nextId);
      await expect(page.locator(".checkoutAddressCard input:checked")).toBeFocused();
      const outline = await page.locator(".checkoutAddressCard:focus-within").evaluate((n) => getComputedStyle(n).outlineStyle);
      expect.soft(outline, "address card has visible focus").not.toBe("none");
      await page.keyboard.press("ArrowUp");
      expect.soft(await page.locator(".checkoutAddressCard input:checked").getAttribute("value")).toBe(originalId);
    }
    await viewportCapture(page, info, "24-direccion-teclado");
    await checkFocusedControl(page.getByRole("link", { name: "Revisar pedido", exact: true }), "review order");
    await page.getByRole("link", { name: "Revisar pedido", exact: true }).click();
    await checkLayout(page, "confirmation");
    expect.soft(await page.locator(".orderReviewCard").evaluate((summary) => {
      const form = document.querySelector(".paymentForm");
      return Boolean(form && (summary.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING));
    }), "summary precedes the form in reading order").toBe(true);
    await checkMoneyLines(page);
    const reserve = page.getByRole("button", { name: /Confirmar y reservar por/ });
    await checkFocusedControl(reserve, "confirm reservation");
    await viewportCapture(page, info, "25-confirmar-foco-visible");
    await capture(page, info, "26-confirmacion-responsive");

    // Stress presentation only: still an allowed order amount and quantities, never a client total.
    await prisma.product.update({ where: { id: product.id }, data: {
      name: "ROSH QA — Selección especial con nombre muy largo para comprobar la lectura del producto en pantallas pequeñas",
      price: "999999.00", stock: 99,
    } });
    await prisma.cartItem.update({ where: { cartId_productId: { cartId: cart.id, productId: product.id } }, data: { quantity: 99 } });
    await page.reload();
    await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98,999,909.50");
    await checkLayout(page, "long name and near-limit total");
    await checkMoneyLines(page);
    expect.soft(await page.locator(".orderReviewItems span").first().evaluate((n) => n.getBoundingClientRect().width),
      "long product names retain a readable column").toBeGreaterThanOrEqual(120);
    await capture(page, info, "27-importes-y-nombre-largo");

    if (process.env.NEXT_PUBLIC_GA_ID) {
      await page.evaluate(() => {
        localStorage.removeItem("rosh-analytics-consent-v1");
        window.dispatchEvent(new Event("rosh-analytics-consent-change"));
      });
      await expect(page.getByRole("dialog", { name: "Preferencias de analítica" })).toBeVisible();
      await checkFocusedControl(reserve, "confirm while consent is unanswered");
      await viewportCapture(page, info, "28-consentimiento-sin-superposicion");
      await page.getByRole("button", { name: "Rechazar", exact: true }).click();
    }

    await prisma.product.update({ where: { id: product.id }, data: { name: originalName, price: "29.90", stock: 10 } });
    await prisma.cartItem.update({ where: { cartId_productId: { cartId: cart.id, productId: product.id } }, data: { quantity: 3 } });
    await page.reload();
    await reserve.click();
    await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/]+\/pagar/);
    await checkLayout(page, "reserved instructions");
    await checkMoneyLines(page);
    await checkFocusedControl(page.getByRole("button", { name: "Ya pagué: enviar operación a revisión" }), "communicate operation");
    const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
    expect(order.total.toFixed(2)).toBe("98.20");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
    await prisma.order.update({ where: { id: order.id }, data: { createdAt: new Date("2026-10-18T02:30:00Z") } });
    await page.goto(`/pedidos/${order.number}`);
    await expect(page.getByText("Identificador del pedido", { exact: true })).toBeVisible();
    await expect(page.getByText(/Creado el 17\/10\/2026/)).toBeVisible();
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).number).toBe(order.number);
    await checkLayout(page, "order detail");
    await checkMoneyLines(page);
    await capture(page, info, "29-identificador-y-fecha-peru");
  } finally {
    await prisma.address.deleteMany({ where: { id: extraAddress.id } });
    await prisma.product.update({ where: { id: product.id }, data: { name: originalName } });
    await resetCheckoutFixture();
  }
});
