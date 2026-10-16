import { expect, test } from "@playwright/test";

import { capture } from "./capture";
import { loginCustomer, prisma, reserveFromCart, resetCheckoutFixture } from "./checkout-fixture";

test.afterAll(() => prisma.$disconnect());

test("S1-03: private reserved instructions, unpaid cancellation and lazy expiry", async ({ page, browser }, testInfo) => {
  test.setTimeout(90_000);
  const { user, product, cart } = await resetCheckoutFixture();
  await loginCustomer(page);
  await reserveFromCart(page);
  const first = await prisma.order.findFirstOrThrow({ where: { userId: user.id } });
  expect(first.status).toBe("PENDING_PAYMENT");
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);

  // Another authenticated customer receives 404 and no bank instructions.
  const other = await prisma.user.create({ data: {
    email: `qa-s103-${testInfo.project.name}@example.com`, passwordHash: user.passwordHash, firstName: "Otro", lastName: "QA",
  } });
  const context = await browser.newContext();
  try {
    const otherPage = await context.newPage();
    await loginCustomer(otherPage, other.email);
    const response = await otherPage.goto(`/pedidos/${first.number}/pagar`);
    expect(response?.status()).toBe(404);
    await expect(otherPage.getByText("QA-NO-TRANSFERIR")).toHaveCount(0);
    await expect(otherPage.locator(".paymentReportForm")).toHaveCount(0);
  } finally {
    await context.close();
    await prisma.user.delete({ where: { id: other.id } });
  }

  await page.getByRole("link", { name: /Ver pedido y opciones de cancelación/ }).click();
  await page.getByRole("button", { name: "Cancelar pedido", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cancelado", exact: true })).toBeVisible();
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
  await page.goto(`/pedidos/${first.number}/pagar`);
  await expect(page).toHaveURL(new RegExp(`/pedidos/${first.number}$`));
  await expect(page.locator(".paymentInstructions")).toHaveCount(0);
  await capture(page, testInfo, "11-reserva-cancelada");

  await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 2 } });
  await reserveFromCart(page);
  const second = await prisma.order.findFirstOrThrow({ where: { userId: user.id, status: "PENDING_PAYMENT" } });
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(8);
  await prisma.order.update({ where: { id: second.id }, data: { reservationExpiresAt: new Date(Date.now() - 60_000) } });
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/pedidos/${second.number}$`));
  await expect(page.getByText("La reserva venció.", { exact: true })).toBeVisible();
  await expect(page.locator(".paymentInstructions")).toHaveCount(0);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
  await page.reload();
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
  expect(await prisma.inventoryMovement.count({ where: { orderId: second.id, type: "ORDER_RELEASE" } })).toBe(1);
  await capture(page, testInfo, "12-reserva-vencida");
});
