import { expect, test } from "@playwright/test";

import { capture } from "./capture";

import { loginCustomer, prisma, resetCheckoutFixture } from "./checkout-fixture";
test.afterAll(() => prisma.$disconnect());

test("S1-02: exact total, changed-price review and server-authoritative order", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const { user, product, zone, cart } = await resetCheckoutFixture();
  await loginCustomer(page);
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 89.70");
  await capture(page, testInfo, "05-carrito-exacto");

  await page.getByRole("link", { name: "Continuar al checkout" }).click();
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.20");
  await capture(page, testInfo, "06-entrega-exacta");
  await page.getByRole("link", { name: "Revisar pedido" }).click();
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.20");
  await expect(page.locator(".paymentInstructions")).toHaveCount(0);
  await expect(page.getByText("QA-NO-TRANSFERIR")).toHaveCount(0);
  expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
  await capture(page, testInfo, "07-confirmacion-exacta");

  // Simulate an administrator changing the price after the customer reviewed it.
  await prisma.product.update({ where: { id: product.id }, data: { price: "30.10" } });
  await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
  await expect(page.locator(".checkoutError[role='alert']")).toContainText("Revisa el resumen actualizado");
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.80");
  expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(10);
  await capture(page, testInfo, "08-resumen-actualizado");

  // Malicious client-supplied amounts are deliberately ignored by the Server Action.
  await page.evaluate(() => {
    for (const name of ["total", "subtotal", "shippingAmount"]) {
      const input = document.createElement("input"); input.type = "hidden";
      input.name = name; input.value = "0.01";
      document.querySelector(".paymentForm")!.appendChild(input);
    }
  });
  await page.getByRole("button", { name: /Confirmar y reservar por/ }).click();
  await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/]+\/pagar/);
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.80");
  const order = await prisma.order.findFirstOrThrow({ where: { userId: user.id }, include: { payments: true, items: true } });
  expect(order.total.toFixed(2)).toBe("98.80");
  expect(order.subtotal.toFixed(2)).toBe("90.30");
  expect(order.shippingAmount.toFixed(2)).toBe("8.50");
  expect(order.items[0].unitPrice.toFixed(2)).toBe("30.10");
  expect(order.payments[0].amount.toFixed(2)).toBe("98.80");
  expect(order.status).toBe("PENDING_PAYMENT");
  expect(order.payments[0].status).toBe("PENDING");
  expect(order.payments[0].operationCode).toBeNull();
  expect(order.stockReservedAt).not.toBeNull();
  expect(order.reservationExpiresAt).not.toBeNull();
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
  await expect(page.getByText(/Cuenta \/ CCI: QA-NO-TRANSFERIR/)).toBeVisible();
  await capture(page, testInfo, "09-reserva-confirmada");

  // After reservation the persisted amount survives catalogue changes; a later cart stays intact.
  await prisma.product.update({ where: { id: product.id }, data: { price: "50.00" } });
  await prisma.shippingZone.update({ where: { id: zone.id }, data: { price: "20.00" } });
  await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, quantity: 1 } });
  await page.reload();
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.80");
  await page.getByLabel("Número o código de operación").fill(`QA-${testInfo.project.name}-${Date.now()}`);
  await page.getByRole("button", { name: "Ya pagué: enviar operación a revisión" }).click();
  await expect(page).toHaveURL(/\/pedidos\/ROSH-[^/?]+\?payment=sent$/);
  await expect(page.getByRole("heading", { name: "Pago en revisión", exact: true })).toBeVisible();
  await expect(page.locator(".summaryTotal strong")).toHaveText("S/ 98.80");
  await expect(page.getByRole("button", { name: "Cancelar pedido", exact: true })).toHaveCount(0);
  expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock).toBe(7);
  expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(1);
  expect((await prisma.payment.findUniqueOrThrow({ where: { id: order.payments[0].id } })).status).toBe("UNDER_REVIEW");
  await capture(page, testInfo, "10-operacion-en-revision");
});
