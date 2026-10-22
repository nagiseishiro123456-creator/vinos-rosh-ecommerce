import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";
import { createCheckoutKey } from "../../src/modules/checkout/idempotency";
import { createCheckoutQuote } from "../../src/modules/checkout/quote";
import { loadCheckoutSnapshot } from "../../src/modules/checkout/snapshot";
import type { AutomaticOrderInput } from "../../src/modules/orders/automatic-order-input";
import { reserveMicuentawebSandboxOrder } from "../../src/modules/orders/automatic-order-service";
import { beginMicuentawebSandboxAttempt } from "../../src/modules/payments/izipay/attempt-service";

type Context = { userId: string; productId: string; cartId: string; input: AutomaticOrderInput;
  orderId: string; number: string; expiresAt: string; attemptId: string; providerReference: string };
const contextPath = process.env.S302_CONTEXT_PATH;
assert.ok(contextPath);
assert.equal(process.env.CI, "true");
assert.match(new URL(process.env.DATABASE_URL ?? "").pathname, /^\/rosh_s302_(source|target)_\d+$/);

// Fake configuration only. Neither phase makes a network request to Izipay.
const sandbox = { PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_INTEGRATION: "MICUENTAWEB_V4", IZIPAY_MODE: "TEST",
  IZIPAY_MCW_MERCHANT_ID: "qa-recovery", IZIPAY_MCW_REST_TEST_PASSWORD: "qa-not-a-credential",
  IZIPAY_MCW_PUBLIC_TEST_KEY: "qa-not-a-public-key", NEXT_PUBLIC_APP_URL: "https://rosh.example.test" };

async function main() {
  if (process.argv[2] === "seed") {
    const stamp = randomUUID();
    const user = await prisma.user.create({ data: { email: "auto-restore-" + stamp + "@example.com",
      passwordHash: "synthetic-recovery-fixture-only", firstName: "QA", lastName: "Recovery", cart: { create: {} } }, include: { cart: true } });
    await prisma.shippingZone.create({ data: { department: "QA", province: "QA", district: stamp, price: "8.50" } });
    const address = await prisma.address.create({ data: { userId: user.id, recipient: "QA", phone: "000000000",
      department: "QA", province: "QA", district: stamp, addressLine1: "Dirección sintética" } });
    const product = await prisma.product.create({ data: { name: "QA automatic recovery", slug: "auto-restore-" + stamp,
      description: "Synthetic PostgreSQL recovery contract", price: "29.90", stock: 10 } });
    await prisma.cartItem.create({ data: { cartId: user.cart!.id, productId: product.id, quantity: 3 } });
    const snapshot = await loadCheckoutSnapshot(prisma, user.id, address.id);
    const checkoutQuote = createCheckoutQuote({ ...snapshot, userId: user.id });
    const input: AutomaticOrderInput = { expectedUserId: user.id, addressId: address.id, checkoutQuote,
      checkoutKey: createCheckoutKey(user.id, checkoutQuote), receiptType: "BOLETA" };
    const order = await reserveMicuentawebSandboxOrder(user.id, input, sandbox);
    assert.equal(order.replayed, false);
    const attempt = await beginMicuentawebSandboxAttempt(user.id, order.id, sandbox);
    assert.equal(attempt.created, true);
    const persisted = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    // A later cart must survive replay of an older checkout after restoration.
    await prisma.cartItem.create({ data: { cartId: user.cart!.id, productId: product.id, quantity: 2 } });
    const context: Context = { userId: user.id, productId: product.id, cartId: user.cart!.id, input,
      orderId: order.id, number: order.number, expiresAt: persisted.reservationExpiresAt!.toISOString(),
      attemptId: attempt.attempt.id, providerReference: attempt.attempt.providerReference };
    writeFileSync(contextPath!, JSON.stringify(context));
    return;
  }
  assert.equal(process.argv[2], "verify");
  const context = JSON.parse(readFileSync(contextPath!, "utf8")) as Context;
  const { userId, productId, cartId, orderId } = context;
  const migrations = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  assert.equal(Number(migrations[0].count), 14);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(order.paymentIntegration, "MICUENTAWEB_V4");
  assert.equal(order.status, "PENDING_PAYMENT");
  assert.equal(order.total.toFixed(2), "98.20");
  assert.equal(order.reservationExpiresAt!.toISOString(), context.expiresAt);
  assert.equal(order.stockReleasedAt, null); assert.equal(order.paidAt, null);
  const replay = await reserveMicuentawebSandboxOrder(userId, context.input, sandbox);
  assert.deepEqual(replay, { id: orderId, number: context.number, replayed: true });
  const attempt = await beginMicuentawebSandboxAttempt(userId, orderId, sandbox);
  assert.equal(attempt.created, false);
  assert.equal(attempt.attempt.id, context.attemptId);
  assert.equal(attempt.attempt.providerReference, context.providerReference);
  assert.equal(attempt.attempt.state, "INITIATING");
  assert.equal(attempt.attempt.amountMinor, "9820");
  assert.equal(attempt.attempt.currency, "PEN");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock, 7);
  const cart = await prisma.cart.findUniqueOrThrow({ where: { id: cartId }, include: { items: true } });
  assert.equal(cart.revision, 1); assert.equal(cart.items.length, 1); assert.equal(cart.items[0].quantity, 2);
  assert.equal(await prisma.order.count({ where: { userId } }), 1);
  assert.equal(await prisma.payment.count({ where: { orderId } }), 0);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId } }), 1);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId, type: "ORDER_RESERVATION" } }), 1);
  assert.equal(await prisma.orderEvent.count({ where: { orderId, kind: "AUTOMATIC_SANDBOX_RESERVED" } }), 1);
  console.log("S302_RESTORE_CONTRACT " + JSON.stringify({ passed: true, migrations: 14, orders: 1, payments: 0,
    attempts: 1, attemptState: "INITIATING", stock: 7, cartQuantity: 2, cartRevision: 1, outboundRequests: 0 }));
}
main().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
