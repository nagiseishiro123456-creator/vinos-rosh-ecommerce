import { randomUUID } from "node:crypto";
import type { TestContext } from "node:test";
import { prisma } from "../../src/lib/prisma";
import { createCheckoutQuote } from "../../src/modules/checkout/quote";
import { loadCheckoutSnapshot } from "../../src/modules/checkout/snapshot";

export async function checkoutFixture(t: TestContext) {
  const stamp = randomUUID();
  const user = await prisma.user.create({ data: { email: `money-${stamp}@example.com`, passwordHash: "not-a-real-password", firstName: "QA", lastName: "Money" } });
  const zone = await prisma.shippingZone.create({ data: { department: "QA", province: "QA", district: stamp, price: "8.50" } });
  const address = await prisma.address.create({ data: { userId: user.id, recipient: "QA", phone: "000000000", department: "QA", province: "QA", district: stamp, addressLine1: "Dirección sintética" } });
  const product = await prisma.product.create({ data: { name: "Botella QA", slug: `money-${stamp}`, description: "Producto de prueba", price: "29.90", stock: 10 } });
  const cart = await prisma.cart.create({ data: { userId: user.id, items: { create: { productId: product.id, quantity: 3 } } } });
  t.after(async () => {
    await prisma.inventoryMovement.deleteMany({ where: { actorUserId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.product.delete({ where: { id: product.id } });
    await prisma.shippingZone.delete({ where: { id: zone.id } });
  });
  const snapshot = await loadCheckoutSnapshot(prisma, user.id, address.id);
  const input = { addressId: address.id, provider: "TRANSFER_MANUAL" as const, receiptType: "BOLETA" as const,
    checkoutQuote: createCheckoutQuote({ ...snapshot, userId: user.id }) };
  return { user, zone, product, cart, address, input };
}

