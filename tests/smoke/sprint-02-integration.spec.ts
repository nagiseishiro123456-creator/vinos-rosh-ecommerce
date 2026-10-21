import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { clearRateLimit } from "../../src/lib/rate-limit";
import { GUEST_CART_KEY } from "../../src/modules/cart/guest-selection";
import { capture } from "./capture";
import { prisma, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());
test("S2-06: guest selection, shared panel, reservation and payment report preserve each other's state", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await resetCheckoutFixture();
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("rosh-analytics-consent-v1", "rejected"));
  for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "unknown"]) await clearRateLimit("guest-cart-preview", ip);
  const panel = page.getByRole("dialog", { name: "Tu carrito", exact: true });
  const quantity = () => prisma.cartItem.findUniqueOrThrow({ where: { cartId_productId: { cartId: f.cart.id, productId: f.product.id } } });
  try {
    await page.goto("/productos/rosh-qa-botella-de-prueba");
    await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(panel).toBeVisible();
    await panel.getByLabel(/Cantidad/).fill("2");
    await panel.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(panel.locator(".cartDrawerFooter .summaryTotal strong")).toHaveText("S/ 59.80");
    await panel.getByRole("link", { name: "Ingresar para continuar", exact: true }).click();
    await page.getByLabel("Correo electrónico").fill(f.user.email);
    await page.getByLabel("Contraseña", { exact: true }).fill(process.env.SMOKE_CUSTOMER_PASSWORD ?? "Qa-only-S1-02-12345");
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/carrito");
    await expect(page.locator(".cartMergeResult")).toContainText("Tu selección se integró");
    await expect(page.locator(".accountCart input[name=quantity]")).toHaveValue("5");
    expect(await prisma.cartImport.count({ where: { userId: f.user.id } })).toBe(1);
    expect(await page.evaluate((key) => { const value = JSON.parse(localStorage.getItem(key)!); return { items: value.items, pending: value.pending }; }, GUEST_CART_KEY)).toEqual({ items: [], pending: null });

    await page.locator(".cartButton").click(); await expect(panel).toBeVisible();
    await panel.getByLabel("Cantidad", { exact: true }).fill("4");
    await panel.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(panel.locator(".cartDrawerFooter .summaryTotal strong")).toHaveText("S/ 119.60");
    await expect(page.locator(".cartButton .cartCount")).toHaveText("4");
    await capture(page, info, "66-carrito-integrado-panel", { fullPage: false });
    await panel.getByRole("link", { name: "Continuar al checkout", exact: true }).click();
    await page.getByRole("link", { name: "Revisar pedido", exact: true }).click();
    await expect(page.locator(".orderReviewCard .summaryTotal strong")).toHaveText("S/ 128.10");
    await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
    await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/]+\/pagar/);
    const paymentUrl = page.url();
    const order = await prisma.order.findFirstOrThrow({ where: { userId: f.user.id }, include: { items: true, payments: true } });
    expect(order.items[0].quantity).toBe(4); expect(order.total.toFixed(2)).toBe("128.10");
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(6);
    expect(await prisma.cartItem.count({ where: { cartId: f.cart.id } })).toBe(0);
    await expect(page.locator(".cartButton .cartCount")).toHaveCount(0);
    await capture(page, info, "67-reserva-desde-seleccion");

    // Adding after reservation prepares another purchase; reporting the first must preserve it.
    await page.goto("/productos/rosh-qa-botella-de-prueba");
    await page.getByRole("button", { name: "Agregar al carrito", exact: true }).click();
    await expect(panel.locator(".cartDrawerFooter .summaryTotal strong")).toHaveText("S/ 29.90");
    await panel.getByRole("button", { name: "Cerrar carrito", exact: true }).click();
    await page.goto(paymentUrl);
    const operation = "QA-S206-" + randomUUID();
    await page.getByLabel("Número o código de operación").fill(operation);
    await page.getByRole("button", { name: "Ya pagué: enviar operación a revisión", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/pedidos/" + order.number);
    await expect(page.getByText("Pago en revisión", { exact: true })).toBeVisible();
    await expect(page.locator(".cartButton .cartCount")).toHaveText("1");
    const current = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { payments: true, events: true } });
    expect(current.status).toBe("PAYMENT_REVIEW"); expect(current.payments[0].status).toBe("UNDER_REVIEW");
    expect(current.payments[0].operationCode).toBe(operation); expect(current.payments[0].amount.toFixed(2)).toBe("128.10");
    expect(current.events.filter((event) => event.kind === "PAYMENT_REPORTED")).toHaveLength(1);
    expect((await quantity()).quantity).toBe(1);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock).toBe(6);
    expect(await prisma.inventoryMovement.count({ where: { orderId: order.id, type: "ORDER_RESERVATION" } })).toBe(1);
    expect(await prisma.order.count({ where: { userId: f.user.id } })).toBe(1);
    expect(await prisma.cartImport.count({ where: { userId: f.user.id } })).toBe(1);
    expect(await prisma.cartMutation.count({ where: { userId: f.user.id } })).toBe(2);
    await capture(page, info, "68-pago-en-revision-carrito-nuevo");
    expect(errors).toEqual([]);
  } finally { await resetCheckoutFixture(); }
});
