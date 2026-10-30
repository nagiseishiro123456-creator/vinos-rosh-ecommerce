import assert from "node:assert/strict";
import test, { after, type TestContext } from "node:test";

import { prisma } from "../src/lib/prisma";
import { clearRateLimit } from "../src/lib/rate-limit";
import { checkoutFixture } from "./helpers/checkout";
import { automaticInputFor, automaticSandbox as environment } from "./helpers/automatic-checkout";
import { reserveMicuentawebSandboxOrder } from "../src/modules/orders/automatic-order-service";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { cancelUnpaidReservation, expireUnpaidReservation } from "../src/modules/orders/reservation-service";
import { canRequestMicuentawebToken } from "../src/modules/payments/izipay/attempt-service";
import { requestMicuentawebSandboxFormToken } from "../src/modules/payments/izipay/micuentaweb-core";
import { initiateMicuentawebSandboxPayment, type InitiationPorts } from "../src/modules/payments/izipay/initiation-service";
import { createMicuentawebInitiationHandler } from "../src/modules/payments/izipay/initiation-handler";

const fakeToken = "opaque-fixture-token-not-from-izipay";
const reply = () => Response.json({ status: "SUCCESS", answer: { formToken: fakeToken } });
type Transport = NonNullable<NonNullable<Parameters<typeof requestMicuentawebSandboxFormToken>[2]>["fetch"]>;
process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());

async function fixture(t: TestContext, manual = false) {
  const f = await checkoutFixture(t);
  const order = manual ? await reserveManualOrder(f.user.id, f.input)
    : await reserveMicuentawebSandboxOrder(f.user.id, automaticInputFor(f), environment);
  t.after(() => clearRateLimit("izipay-sandbox-initiate", f.user.id));
  return { ...f, order };
}
function handler(userId: string, fetch: Transport, overrides: Partial<InitiationPorts> = {}, timeoutMs = 1000) {
  return createMicuentawebInitiationHandler({ authenticate: async () => userId, environment: () => environment,
    initiate: (user, order, env) => initiateMicuentawebSandboxPayment(user, order, env, {
      request: (snapshot, configuration) => requestMicuentawebSandboxFormToken(snapshot, configuration, { fetch, timeoutMs }), ...overrides,
    }),
  });
}
function request(userId: string, orderId: string) {
  return new Request("https://rosh.example.test/api/payment/initiate", { method: "POST",
    headers: { origin: "https://rosh.example.test", "content-type": "application/json" },
    body: JSON.stringify({ orderId, expectedUserId: userId }),
  });
}

test("Izipay API persists before transport and returns only a confirmed token without commerce effects", async (t) => {
  const f = await fixture(t); let calls = 0;
  const laterItem = await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
  const post = handler(f.user.id, async (_, init) => {
    calls += 1;
    const saved = await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: f.order.id } });
    assert.equal(saved.state, "INITIATING");
    assert.deepEqual(JSON.parse(String(init.body)), { amount: 9820, currency: "PEN", orderId: saved.providerReference,
      customer: { email: f.user.email } });
    return reply();
  });
  const response = await post(request(f.user.id, f.order.id));
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["attemptId", "formToken", "kind", "publicKey"]);
  assert.equal(body.formToken, fakeToken);
  assert.equal(body.publicKey, environment.IZIPAY_MCW_PUBLIC_TEST_KEY);
  const saved = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: body.attemptId } });
  assert.equal(saved.state, "TOKEN_READY");
  assert.ok(saved.tokenHash && saved.tokenReadyAt);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "PENDING_PAYMENT");
  assert.equal(await prisma.payment.count({ where: { orderId: f.order.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal((await prisma.cartItem.findUniqueOrThrow({ where: { id: laterItem.id } })).quantity, 1);
});

test("Izipay simultaneous requests and a lost success response never issue a second provider request", async (t) => {
  const f = await fixture(t); let calls = 0; let entered!: () => void; let release!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const post = handler(f.user.id, async () => { calls += 1; entered(); await gate; return reply(); });
  const first = post(request(f.user.id, f.order.id));
  await started;
  try {
    const duplicate = await post(request(f.user.id, f.order.id));
    assert.equal(duplicate.status, 202);
    assert.equal("formToken" in await duplicate.json(), false);
  } finally { release(); }
  assert.equal((await first).status, 200);
  const lostResponseRetry = await post(request(f.user.id, f.order.id));
  assert.equal(lostResponseRetry.status, 409);
  assert.equal("formToken" in await lostResponseRetry.json(), false);
  assert.equal(calls, 1);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 1);
});

test("Izipay transport timeout is persisted as uncertain and retries cannot send another request", async (t) => {
  const f = await fixture(t); let calls = 0;
  const post = handler(f.user.id, async (_, init) => {
    calls += 1;
    return new Promise<Response>((_, reject) => init.signal!.addEventListener("abort", () => reject(new Error("private-timeout-detail")), { once: true }));
  }, {}, 5);
  const response = await post(request(f.user.id, f.order.id));
  assert.equal(response.status, 409);
  assert.equal((await response.text()).includes("private-timeout"), false);
  assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: f.order.id } })).state, "UNCERTAIN");
  assert.equal((await post(request(f.user.id, f.order.id))).status, 409);
  assert.equal(calls, 1);
});

test("Izipay cancellation during network I/O does not hold a DB lock or expose a token afterwards", async (t) => {
  const f = await fixture(t);
  const post = handler(f.user.id, async () => {
    assert.equal(await cancelUnpaidReservation(f.user.id, f.order.number), true);
    return reply();
  });
  const response = await post(request(f.user.id, f.order.id));
  assert.equal(response.status, 409);
  assert.equal((await response.text()).includes(fakeToken), false);
  const attempt = await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: f.order.id } });
  assert.equal(attempt.state, "UNCERTAIN");
  assert.equal(attempt.tokenHash, null);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "CANCELLED");
});

test("Izipay reservation expiry during token issuance preserves released stock and withholds the token", async (t) => {
  const f = await fixture(t);
  const post = handler(f.user.id, async () => {
    await prisma.order.update({ where: { id: f.order.id }, data: { reservationExpiresAt: new Date(0) } });
    assert.equal(await expireUnpaidReservation(f.order.id), true);
    return reply();
  });
  const response = await post(request(f.user.id, f.order.id));
  assert.equal(response.status, 409);
  assert.equal((await response.text()).includes(fakeToken), false);
  assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: f.order.id } })).state, "UNCERTAIN");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  assert.equal(await prisma.payment.count({ where: { orderId: f.order.id } }), 0);
});

test("Izipay mismatch between persisted order and attempt prevents token handoff", async (t) => {
  const f = await fixture(t);
  const post = handler(f.user.id, async () => {
    await prisma.order.update({ where: { id: f.order.id }, data: { total: "1.00" } });
    return reply();
  });
  const response = await post(request(f.user.id, f.order.id));
  assert.equal(response.status, 409);
  assert.equal((await response.text()).includes(fakeToken), false);
  assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: f.order.id } })).state, "UNCERTAIN");
});

test("Izipay API ownership and manual-payment guards preserve existing records without transport", async (t) => {
  const f = await fixture(t, true); let calls = 0;
  const transport: Transport = async () => { calls += 1; return reply(); };
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: f.order.id } });
  assert.equal((await handler(f.user.id, transport)(request(f.user.id, f.order.id))).status, 404);
  const foreign = "cm123456789012345678901234";
  t.after(() => clearRateLimit("izipay-sandbox-initiate", foreign));
  assert.equal((await handler(foreign, transport)(request(foreign, f.order.id))).status, 404);
  assert.equal(calls, 0);
  assert.deepEqual(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }), payment);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 0);
});

test("Izipay invalidation between attempt commit and preflight never sends network traffic", async (t) => {
  const f = await fixture(t); let calls = 0;
  const post = handler(f.user.id, async () => { calls += 1; return reply(); }, {
    current: async (user, attempt) => {
      await cancelUnpaidReservation(f.user.id, f.order.number);
      return canRequestMicuentawebToken(user, attempt);
    },
  });
  assert.equal((await post(request(f.user.id, f.order.id))).status, 409);
  assert.equal(calls, 0);
  assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: f.order.id } })).state, "UNCERTAIN");
});
