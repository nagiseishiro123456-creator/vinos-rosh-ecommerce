import assert from "node:assert/strict";
import test from "node:test";

import { PaymentStatusUnavailableError, projectMicuentawebPaymentStatus } from "../src/modules/payments/izipay/status-service";
import { paymentStatusSchema } from "../src/modules/payments/izipay/status-contract";
import { createMicuentawebStatusHandler } from "../src/modules/payments/izipay/status-handler";

const now = new Date("2026-10-23T20:00:00Z");
const userId = "cm123456789012345678901235";
const orderId = "cm123456789012345678901234";
type Order = Parameters<typeof projectMicuentawebPaymentStatus>[0];
function order(overrides: Partial<Order> = {}): Order {
  return { id: orderId, number: "ROSH-TEST-0001", status: "PENDING_PAYMENT", total: { toFixed: () => "98.20" },
    paidAt: null, paymentIntegration: "MICUENTAWEB_V4", stockReservedAt: new Date(now.getTime() - 1_000),
    reservationExpiresAt: new Date(now.getTime() + 900_000), stockReleasedAt: null, reservationExpiredAt: null,
    paymentAttempt: null, ...overrides };
}
function attempt(state: "INITIATING" | "TOKEN_READY" | "UNCERTAIN"): NonNullable<Order["paymentAttempt"]> {
  return { state, integration: "MICUENTAWEB_V4", mode: "TEST", currency: "PEN", amountMinor: BigInt(9820) };
}
const project = (overrides: Partial<Order> = {}) => projectMicuentawebPaymentStatus(order(overrides), now);

test("status distinguishes reservation and all attempt states without claiming approval", () => {
  assert.equal(project().state, "reserved");
  for (const [state, expected] of [["INITIATING", "initiating"], ["TOKEN_READY", "prepared"], ["UNCERTAIN", "uncertain"]] as const) {
    const snapshot = project({ paymentAttempt: attempt(state) });
    assert.equal(snapshot.state, expected);
    assert.equal(snapshot.confirmedAt, null);
    assert.equal(snapshot.orderStatus, "PENDING_PAYMENT");
  }
});
test("status requires both a persisted paid state and paidAt for confirmation", () => {
  assert.equal(project({ status: "PAID" }).state, "review");
  assert.equal(project({ paidAt: now }).state, "review");
  for (const status of ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] as const) {
    assert.equal(project({ status, paidAt: now }).state, "confirmed");
  }
});
test("closed orders stay closed regardless of attempt or prior approval", () => {
  for (const status of ["CANCELLED", "REFUNDED"] as const) {
    assert.equal(project({ status, paidAt: now, paymentAttempt: attempt("TOKEN_READY") }).state, "closed");
  }
});
test("deadline is expired at the exact boundary and takes precedence over an uncertain attempt", () => {
  assert.equal(project({ reservationExpiresAt: now, paymentAttempt: attempt("UNCERTAIN") }).state, "expired");
  assert.equal(project({ stockReleasedAt: now }).state, "expired");
  assert.equal(project({ reservationExpiredAt: now }).state, "expired");
  assert.equal(project({ reservationExpiresAt: new Date(now.getTime() + 1) }).state, "reserved");
});
test("missing or inconsistent reservation information is sent for review", () => {
  assert.equal(project({ stockReservedAt: null }).state, "review");
  assert.equal(project({ stockReservedAt: new Date(now.getTime() + 1) }).state, "review");
  assert.equal(project({ reservationExpiresAt: null }).state, "review");
  assert.equal(project({ status: "PAYMENT_REVIEW" }).state, "review");
});
test("attempt amount, product, mode and currency mismatches cannot look ready", () => {
  for (const change of [{ amountMinor: BigInt(9821) }, { integration: "OTHER" }, { mode: "PRODUCTION" }, { currency: "USD" }]) {
    assert.equal(project({ paymentAttempt: { ...attempt("TOKEN_READY"), ...change } }).state, "review");
  }
});
test("manual orders are unavailable and the response contains only public progress fields", () => {
  assert.throws(() => project({ paymentIntegration: null }), PaymentStatusUnavailableError);
  const result = project();
  assert.deepEqual(Object.keys(result).sort(), ["orderId", "orderNumber", "orderStatus", "total", "currency", "state", "reservationExpiresAt", "confirmedAt", "observedAt"].sort());
  assert.equal(result.total, "98.20");
  assert.equal(result.observedAt, now.toISOString());
});
test("the client contract rejects token-only approval, unknown fields and malformed totals", () => {
  const snapshot = project();
  assert.equal(paymentStatusSchema.safeParse({ ...snapshot, state: "confirmed" }).success, false);
  assert.equal(paymentStatusSchema.safeParse({ ...snapshot, formToken: "secret" }).success, false);
  assert.equal(paymentStatusSchema.safeParse({ ...snapshot, total: "98.201" }).success, false);
});

const environment = { NEXT_PUBLIC_APP_URL: "https://rosh.example.test", PAYMENTS_IZIPAY_ENABLED: "false" };
const allowed = async () => ({ allowed: true, remaining: 29, retryAfterMs: 0 });
function handler(overrides: Partial<Parameters<typeof createMicuentawebStatusHandler>[0]> = {}) {
  return createMicuentawebStatusHandler({ authenticate: async () => userId, environment: () => environment,
    consume: allowed, read: async () => project(), ...overrides });
}
function request(query = `orderId=${orderId}&expectedUserId=${userId}`, headers: HeadersInit = {}) {
  return new Request(`https://rosh.example.test/api/payment/status?${query}`, { headers });
}
test("status stays readable with initiation disabled and cannot be cached", async () => {
  let read = 0;
  const response = await handler({ read: async (user, id) => { read++; assert.equal(user, userId); assert.equal(id, orderId); return project(); } })(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(read, 1);
  assert.deepEqual(await response.json(), project());
});
test("unauthenticated or switched accounts cannot read an order", async () => {
  const read = async () => { assert.fail("No database read permitted"); return project(); };
  assert.equal((await handler({ authenticate: async () => null, read })(request())).status, 401);
  assert.equal((await handler({ read })(request(`orderId=${orderId}&expectedUserId=cm123456789012345678901236`))).status, 409);
});
test("foreign origin and cross-site requests are rejected before authentication", async () => {
  const get = handler({ authenticate: async () => { assert.fail("No session read permitted"); return null; } });
  assert.equal((await get(request(undefined, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await get(request(undefined, { "sec-fetch-site": "cross-site" }))).status, 403);
  assert.equal((await get(request(undefined, { origin: "null" }))).status, 403);
});
test("strict query rejects duplicates, extra keys, missing fields and invalid identifiers", async () => {
  const get = handler({ read: async () => { assert.fail("No database read permitted"); return project(); } });
  for (const query of ["", `orderId=${orderId}`, `orderId=invalid&expectedUserId=${userId}`, `orderId=${orderId}&expectedUserId=${userId}&orderId=${orderId}`, `orderId=${orderId}&expectedUserId=${userId}&total=0.01`]) {
    assert.equal((await get(request(query))).status, 400);
  }
});
test("status has its own per-user persistent budget and retry guidance", async () => {
  const response = await handler({ consume: async (input) => {
    assert.deepEqual(input, { scope: "izipay-status-read", identifier: userId, limit: 30, windowMs: 60_000 });
    return { allowed: false, remaining: 0, retryAfterMs: 1_501 };
  }, read: async () => { assert.fail("No database read permitted"); return project(); } })(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "2");
});
test("unknown and foreign orders share one unavailable response", async () => {
  const response = await handler({ read: async () => { throw new PaymentStatusUnavailableError(); } })(request());
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Estado no disponible para este pedido." });
});
test("configuration and internal failures are sanitized and never cached", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const get of [handler({ environment: () => ({}) }), handler({ read: async () => { throw new Error("private-token-or-database-url"); } })]) {
    const response = await get(request());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal((await response.text()).includes("private-token"), false);
  }
});
