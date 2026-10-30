import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test, { after } from "node:test";

import { prisma } from "../src/lib/prisma";
import { checkoutFixture } from "./helpers/checkout";
import { automaticCheckoutFixture as automaticFixture, automaticSandbox as sandbox } from "./helpers/automatic-checkout";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { cancelUnpaidReservation } from "../src/modules/orders/reservation-service";
import {
  beginMicuentawebSandboxAttempt, PaymentAttemptError,
  recordMicuentawebAttemptUncertain, recordMicuentawebTokenReady,
} from "../src/modules/payments/izipay/attempt-service";

process.env.NEXTAUTH_SECRET ||= "integration-only-signing-secret-at-least-32-chars";
after(() => prisma.$disconnect());

const unavailable = (e: unknown) => e instanceof PaymentAttemptError && e.code === "ORDER_UNAVAILABLE";

test("Izipay preparation persists server totals and a unique reference without changing commerce or calling a provider", async (t) => {
  const f = await automaticFixture(t);
  await prisma.product.update({ where: { id: f.product.id }, data: { price: "999.00" } });
  await prisma.cartItem.create({ data: { cartId: f.cart.id, productId: f.product.id, quantity: 1 } });
  const result = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox);
  assert.equal(result.created, true);
  if (!result.created) assert.fail("Expected a new attempt");
  assert.equal(result.attempt.amountMinor, "9820");
  assert.equal(result.snapshot.total, "98.20");
  assert.equal(result.snapshot.orderReference, result.attempt.providerReference);
  assert.equal(result.snapshot.customerEmail, f.user.email);
  assert.equal(result.attempt.state, "INITIATING");
  const saved = await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: f.order.id } });
  assert.equal(saved.integration, "MICUENTAWEB_V4");
  assert.equal(saved.mode, "TEST");
  assert.equal(saved.tokenHash, null);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "PENDING_PAYMENT");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
  assert.equal(await prisma.payment.count({ where: { orderId: f.order.id } }), 0);
  assert.equal(await prisma.inventoryMovement.count({ where: { orderId: f.order.id } }), 1);
  assert.equal((await prisma.cartItem.findFirstOrThrow({ where: { cartId: f.cart.id } })).quantity, 1);
  assert.doesNotThrow(() => JSON.stringify(result.attempt));
});

test("Izipay preparation refuses disabled/configuration mismatches, foreign owners and missing orders before persistence", async (t) => {
  const f = await automaticFixture(t);
  await assert.rejects(beginMicuentawebSandboxAttempt(f.user.id, f.order.id, {}), /DISABLED/);
  await assert.rejects(beginMicuentawebSandboxAttempt(f.user.id, f.order.id, { ...sandbox, IZIPAY_MODE: "PRODUCTION" }), /TEST_CONFIG_REQUIRED/);
  await assert.rejects(beginMicuentawebSandboxAttempt("foreign-user", f.order.id, sandbox), unavailable);
  await assert.rejects(beginMicuentawebSandboxAttempt(f.user.id, "missing-order", sandbox), unavailable);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 0);
});

test("Izipay preparation leaves existing manual orders in their current payment flow", async (t) => {
  const f = await checkoutFixture(t);
  const order = await reserveManualOrder(f.user.id, f.input);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  await assert.rejects(beginMicuentawebSandboxAttempt(f.user.id, order.id, sandbox), unavailable);
  assert.deepEqual(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }), payment);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: order.id } }), 0);
});

test("Izipay preparation rejects expired, released, unreserved, paid and review orders without creating an attempt", async (t) => {
  const f = await automaticFixture(t);
  const original = await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } });
  const reset = {
    status: original.status, stockReservedAt: original.stockReservedAt, stockReleasedAt: null,
    reservationExpiresAt: original.reservationExpiresAt, reservationExpiredAt: null, paidAt: null,
  };
  for (const patch of [
    { reservationExpiresAt: new Date(0) }, { reservationExpiresAt: null }, { stockReservedAt: null },
    { stockReleasedAt: new Date() }, { reservationExpiredAt: new Date() }, { paidAt: new Date() },
    { status: "PAID" as const }, { status: "PAYMENT_REVIEW" as const }, { status: "CANCELLED" as const },
    { stockReservedAt: new Date(Date.now() + 60_000) }, { total: "0.00" },
  ]) {
    await prisma.order.update({ where: { id: f.order.id }, data: { ...reset, total: original.total, ...patch } });
    await assert.rejects(beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox));
  }
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 0);
});

test("Izipay concurrent starts have one creator and replay the same persisted identity", async (t) => {
  const f = await automaticFixture(t);
  const results = await Promise.all(Array.from({ length: 3 }, () => beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox)));
  assert.equal(results.filter((r) => r.created).length, 1);
  assert.equal(new Set(results.map((r) => r.attempt.id)).size, 1);
  assert.equal(new Set(results.map((r) => r.attempt.providerReference)).size, 1);
  assert.equal(await prisma.paymentAttempt.count({ where: { orderId: f.order.id } }), 1);
  for (const r of results.filter((r) => !r.created)) assert.equal("snapshot" in r, false);
});

test("Izipay an uncompleted attempt survives lost responses and later order cancellation without granting another request", async (t) => {
  const f = await automaticFixture(t);
  const first = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox);
  assert.equal(await cancelUnpaidReservation(f.user.id, f.order.number), true);
  const recovered = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox);
  assert.equal(recovered.created, false);
  assert.deepEqual(recovered.attempt, first.attempt);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "CANCELLED");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
  await assert.rejects(beginMicuentawebSandboxAttempt("foreign-user", f.order.id, sandbox), unavailable);
});

test("Izipay token completion stores only a hash once and never confirms a payment", async (t) => {
  const f = await automaticFixture(t);
  const { attempt } = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox);
  const token = "opaque-fixture-token-not-from-izipay";
  assert.equal(await recordMicuentawebTokenReady(attempt.id, token), true);
  const saved = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  assert.equal(saved.state, "TOKEN_READY");
  assert.equal(saved.tokenHash, createHash("sha256").update(token).digest("hex"));
  assert.ok(saved.tokenReadyAt);
  assert.equal(JSON.stringify({ ...saved, amountMinor: saved.amountMinor.toString() }).includes(token), false);
  assert.equal(await recordMicuentawebTokenReady(attempt.id, "another-fixture-token"), false);
  assert.equal(await recordMicuentawebAttemptUncertain(attempt.id), false);
  assert.equal((await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox)).created, false);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).paidAt, null);
});

test("Izipay uncertainty blocks reinitiation and late token completion; invalid tokens preserve the initial state", async (t) => {
  const f = await automaticFixture(t);
  const { attempt } = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox);
  for (const token of [undefined, " ", "x".repeat(65_537)]) {
    await assert.rejects(recordMicuentawebTokenReady(attempt.id, token), /INVALID_COMPLETION/);
  }
  assert.equal(await recordMicuentawebAttemptUncertain(attempt.id), true);
  assert.equal(await recordMicuentawebAttemptUncertain(attempt.id), false);
  assert.equal(await recordMicuentawebTokenReady(attempt.id, "late-fixture-token"), false);
  const replay = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox);
  assert.equal(replay.created, false);
  assert.equal(replay.attempt.state, "UNCERTAIN");
  const saved = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  assert.ok(saved.uncertainAt);
  assert.equal(saved.tokenHash, null);
});

test("Izipay competing completion and uncertainty use one atomic transition", async (t) => {
  const f = await automaticFixture(t);
  const { attempt } = await beginMicuentawebSandboxAttempt(f.user.id, f.order.id, sandbox);
  const results = await Promise.all([
    recordMicuentawebTokenReady(attempt.id, "racing-fixture-token"), recordMicuentawebAttemptUncertain(attempt.id),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  const saved = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  assert.ok(saved.state === "TOKEN_READY" || saved.state === "UNCERTAIN");
  assert.equal(await prisma.payment.count({ where: { orderId: f.order.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});
