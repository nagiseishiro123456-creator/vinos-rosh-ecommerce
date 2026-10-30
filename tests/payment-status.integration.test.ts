import assert from "node:assert/strict";
import test, { after } from "node:test";

import { prisma } from "../src/lib/prisma";
import { clearRateLimit } from "../src/lib/rate-limit";
import { automaticCheckoutFixture, automaticSandbox } from "./helpers/automatic-checkout";
import { checkoutFixture } from "./helpers/checkout";
import { beginMicuentawebSandboxAttempt, recordMicuentawebAttemptUncertain, recordMicuentawebTokenReady } from "../src/modules/payments/izipay/attempt-service";
import { PaymentStatusUnavailableError, readMicuentawebPaymentStatus } from "../src/modules/payments/izipay/status-service";
import { createMicuentawebStatusHandler } from "../src/modules/payments/izipay/status-handler";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { cancelUnpaidReservation } from "../src/modules/orders/reservation-service";

after(() => prisma.$disconnect());

test("owned status follows the persisted attempt without changing payment or stock", async (t) => {
  const f = await automaticCheckoutFixture(t);
  const read = () => readMicuentawebPaymentStatus(f.user.id, f.order.id);
  assert.equal((await read()).state, "reserved");
  const started = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, automaticSandbox);
  assert.equal((await read()).state, "initiating");
  await recordMicuentawebTokenReady(started.attempt.id, "synthetic-form-token-not-for-provider");
  const prepared = await read();
  assert.equal(prepared.state, "prepared");
  assert.equal(JSON.stringify(prepared).includes("synthetic-form-token"), false);
  const saved = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id }, include: { payments: true } });
  assert.equal(saved.status, "PENDING_PAYMENT");
  assert.equal(saved.paidAt, null);
  assert.equal(saved.payments.length, 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});
test("uncertain status and exact expiry are read-only, without releasing stock or creating new attempts", async (t) => {
  const f = await automaticCheckoutFixture(t);
  const started = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, automaticSandbox);
  await recordMicuentawebAttemptUncertain(started.attempt.id);
  assert.equal((await readMicuentawebPaymentStatus(f.user.id, f.order.id)).state, "uncertain");
  await prisma.order.update({ where: { id: f.order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1) } });
  const before = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
  assert.equal((await readMicuentawebPaymentStatus(f.user.id, f.order.id)).state, "expired");
  assert.deepEqual(await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } }), before);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 1);
});
test("foreign, absent and manual orders are unavailable through the same ownership query", async (t) => {
  const own = await automaticCheckoutFixture(t);
  const other = await checkoutFixture(t);
  const manual = await reserveManualOrder(other.user.id, other.input);
  for (const id of [own.order.id, manual.id, "cm123456789012345678901234"]) {
    await assert.rejects(() => readMicuentawebPaymentStatus(other.user.id, id), PaymentStatusUnavailableError);
  }
});
test("persisted confirmation and subsequent cancellation use the server record", async (t) => {
  const f = await automaticCheckoutFixture(t);
  // Synthetic QA database only. This is not a provider notification or a business transition implementation.
  const paidAt = new Date();
  await prisma.order.update({ where: { id: f.order.id }, data: { status: "PAID", paidAt } });
  assert.equal((await readMicuentawebPaymentStatus(f.user.id, f.order.id)).state, "confirmed");
  await prisma.order.update({ where: { id: f.order.id }, data: { status: "PENDING_PAYMENT", paidAt: null } });
  await cancelUnpaidReservation(f.user.id, f.order.number);
  assert.equal((await readMicuentawebPaymentStatus(f.user.id, f.order.id)).state, "closed");
});
test("HTTP read works with disabled payment flags and enforces its persistent budget across handlers", async (t) => {
  const f = await automaticCheckoutFixture(t);
  t.after(() => clearRateLimit("izipay-status-read", f.user.id));
  const make = () => createMicuentawebStatusHandler({ authenticate: async () => f.user.id,
    environment: () => ({ NEXT_PUBLIC_APP_URL: "https://rosh.example.test", PAYMENTS_IZIPAY_ENABLED: "false" }) });
  const request = () => new Request(`https://rosh.example.test/api/payment/status?orderId=${f.order.id}&expectedUserId=${f.user.id}`);
  for (let i = 0; i < 30; i++) assert.equal((await make()(request())).status, 200);
  const limited = await make()(request());
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 0);
});
