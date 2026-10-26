import assert from "node:assert/strict";
import test, { after, type TestContext } from "node:test";

import { prisma } from "../src/lib/prisma";
import { clearRateLimit } from "../src/lib/rate-limit";
import { checkoutFixture } from "./helpers/checkout";
import { automaticInputFor, automaticSandbox } from "./helpers/automatic-checkout";
import { createAutomaticOrderReservationHandler } from "../src/modules/orders/automatic-order-handler";
import { reserveMicuentawebSandboxOrder } from "../src/modules/orders/automatic-order-service";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { cancelUnpaidReservation } from "../src/modules/orders/reservation-service";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
const environment = { ...automaticSandbox, IZIPAY_MCW_RESERVE_ENABLED: "true" };
after(() => prisma.$disconnect());

async function fixture(t: TestContext) {
  const f = await checkoutFixture(t);
  t.after(() => clearRateLimit("izipay-sandbox-reserve", f.user.id));
  return { ...f, automaticInput: automaticInputFor(f) };
}
function handler(userId: string, overrides: Partial<Parameters<typeof createAutomaticOrderReservationHandler>[0]> = {}) {
  return createAutomaticOrderReservationHandler({ authenticate: async () => userId, environment: () => environment, ...overrides });
}
function request(body: unknown) {
  return new Request("https://rosh.example.test/api/orders/reserve", { method: "POST", headers: {
    origin: "https://rosh.example.test", "content-type": "application/json",
  }, body: JSON.stringify(body) });
}

test("reservation API commits one order across concurrent HTTP confirmations with no payment or token", async (t) => {
  const f = await fixture(t);
  const post = handler(f.user.id);
  const responses = await Promise.all([post(request(f.automaticInput)), post(request(f.automaticInput))]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
  const bodies = await Promise.all(responses.map((r) => r.json()));
  assert.equal(new Set(bodies.map((b) => b.orderId)).size, 1);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: bodies[0].orderId }, include: { payments: true, paymentAttempt: true } });
  assert.equal(order.total.toFixed(2), "98.20");
  assert.equal(order.status, "PENDING_PAYMENT");
  assert.equal(order.paymentIntegration, "MICUENTAWEB_V4");
  assert.equal(order.paidAt, null);
  assert.equal(order.payments.length, 0);
  assert.equal(order.paymentAttempt, null);
  assert.equal(order.reservationExpiresAt!.getTime() - order.stockReservedAt!.getTime(), 900_000);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 1);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 0);
});

test("reservation API recovers after a response is lost following commit and preserves later cart edits", async (t) => {
  const f = await fixture(t);
  t.mock.method(console, "error", () => {});
  const lost = handler(f.user.id, { reserve: async (user, input, env) => {
    await reserveMicuentawebSandboxOrder(user, input, env);
    throw new Error("synthetic-response-lost-after-commit");
  } });
  assert.equal((await lost(request(f.automaticInput))).status, 503);
  const original = await prisma.order.findFirstOrThrow({ where: { userId: f.user.id } });
  const later = await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 2 } });
  const recovered = await handler(f.user.id)(request(f.automaticInput));
  assert.equal(recovered.status, 200);
  assert.deepEqual(await recovered.json(), { kind: "recovered", orderId: original.id, orderNumber: original.number, replayed: true });
  assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { id: later.id } })).quantity, 2);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal(await prisma.orderEvent.count({ where: { actorUserId: f.user.id, kind: "AUTOMATIC_SANDBOX_RESERVED" } }), 1);
});

test("reservation API recovers a cancelled order without re-reserving or extending its deadline", async (t) => {
  const f = await fixture(t);
  const created = await (await handler(f.user.id)(request(f.automaticInput))).json();
  const original = await prisma.order.findUniqueOrThrow({ where: { id: created.orderId } });
  assert.equal(await cancelUnpaidReservation(f.user.id, original.number), true);
  const post = handler(f.user.id, { environment: () => ({ PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_MCW_RESERVE_ENABLED: "true", NEXT_PUBLIC_APP_URL: environment.NEXT_PUBLIC_APP_URL }) });
  const replay = await post(request(f.automaticInput));
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).kind, "recovered");
  const saved = await prisma.order.findUniqueOrThrow({ where: { id: original.id } });
  assert.equal(saved.status, "CANCELLED");
  assert.deepEqual(saved.reservationExpiresAt, original.reservationExpiresAt);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
});

test("reservation API rejects changed prices and insufficient stock without consuming the cart", async (t) => {
  const f = await fixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "30.00" } });
  const post = handler(f.user.id);
  const changed = await post(request(f.automaticInput));
  assert.equal(changed.status, 409);
  assert.equal((await changed.json()).code, "QUOTE_CHANGED");
  await prisma.product.update({ where: { id: f.product.id }, data: { stock: 2 } });
  const stock = await post(request(f.automaticInput));
  assert.equal(stock.status, 409);
  assert.equal((await stock.json()).code, "STOCK_CHANGED");
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
  assert.equal((await prisma.cart.findUniqueOrThrow({ where: { id: f.cart.id } })).revision, 0);
});

test("reservation API does not expose or reserve another account's address or confirmation", async (t) => {
  const own = await fixture(t); const other = await fixture(t);
  const post = handler(own.user.id);
  const mismatch = await post(request(other.automaticInput));
  assert.equal(mismatch.status, 409);
  assert.equal((await mismatch.json()).code, "ACCOUNT_CHANGED");
  const foreign = await post(request({ ...own.automaticInput, addressId: other.address.id }));
  assert.equal(foreign.status, 404);
  assert.equal((await foreign.json()).code, "ADDRESS_NOT_FOUND");
  assert.equal(await prisma.order.count({ where: { userId: { in: [own.user.id, other.user.id] } } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: own.product.id } })).stock, 10);
});

test("reservation API cannot convert a manual order by reusing its checkout key", async (t) => {
  const f = await fixture(t);
  const manual = await reserveManualOrder(f.user.id, f.input);
  const response = await handler(f.user.id)(request(f.automaticInput));
  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.code, "CHECKOUT_CONFLICT");
  assert.equal(body.orderNumber, manual.number);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: manual.id } })).paymentIntegration, null);
  assert.equal(await prisma.payment.count({ where: { orderId: manual.id } }), 1);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: manual.id } }), 0);
});

test("reservation API enforces TEST configuration with rollback before any inventory effect", async (t) => {
  const f = await fixture(t);
  const post = handler(f.user.id, { environment: () => ({ ...environment, IZIPAY_MODE: "PRODUCTION" }) });
  const response = await post(request(f.automaticInput));
  assert.equal(response.status, 503);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal(await prisma.inventoryMovement.count({ where: { actorUserId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.cartItem.count({ where: { cartId: f.cart.id } }), 1);
});

test("reservation API throttles the eleventh request with one persistent reservation", async (t) => {
  const f = await fixture(t);
  const post = handler(f.user.id);
  assert.equal((await post(request(f.automaticInput))).status, 201);
  for (let i = 1; i < 10; i += 1) assert.equal((await post(request(f.automaticInput))).status, 200);
  const limited = await post(request(f.automaticInput));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 1);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});
