import assert from "node:assert/strict";
import test from "node:test";

import { CheckoutUnavailableError } from "../src/modules/checkout/snapshot";
import { MoneyError } from "../src/modules/checkout/pricing";
import { StockChangedError } from "../src/modules/inventory/stock-service";
import { IzipayPreparationError } from "../src/modules/payments/izipay/micuentaweb-core";
import { createAutomaticOrderReservationHandler, MAX_AUTOMATIC_RESERVATION_BYTES } from "../src/modules/orders/automatic-order-handler";
import { CheckoutConflictError, OrderReservationError } from "../src/modules/orders/order-reservation-core";

const userId = "cm123456789012345678901234";
const order = { id: "cm323456789012345678901234", number: "ROSH-QA-RESERVE", replayed: false };
const body = { expectedUserId: userId, addressId: "cm223456789012345678901234", checkoutQuote: "v1:" + "1".repeat(64),
  checkoutKey: "ck1:" + "2".repeat(64), receiptType: "BOLETA" };
const environment = { PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_MCW_RESERVE_ENABLED: "true", NEXT_PUBLIC_APP_URL: "https://rosh.example.test" };

function request(value: unknown = body, headers: Record<string, string> = {}) {
  return new Request("https://rosh.example.test/api/orders/reserve", { method: "POST", headers: {
    origin: "https://rosh.example.test", "content-type": "application/json", ...headers,
  }, body: JSON.stringify(value) });
}
function fixture(overrides: Partial<Parameters<typeof createAutomaticOrderReservationHandler>[0]> = {}) {
  let reservations = 0; let authenticated = 0;
  const post = createAutomaticOrderReservationHandler({
    environment: () => environment,
    authenticate: async () => { authenticated += 1; return userId; },
    consume: async () => ({ allowed: true, remaining: 9, retryAfterMs: 0 }),
    reserve: async () => { reservations += 1; return order; }, ...overrides,
  });
  return { post, reservations: () => reservations, authenticated: () => authenticated };
}

test("reservation endpoint is off by default and needs its own opt-in, before authentication", async () => {
  for (const env of [{}, { ...environment, PAYMENTS_IZIPAY_ENABLED: "false" },
    { ...environment, IZIPAY_MCW_RESERVE_ENABLED: "false", IZIPAY_MCW_INITIATE_ENABLED: "true" }]) {
    const f = fixture({ environment: () => env });
    assert.equal((await f.post(request())).status, 404);
    assert.equal(f.authenticated(), 0);
    assert.equal(f.reservations(), 0);
  }
});

test("reservation requires the configured HTTP(S) origin and refuses cross-site requests", async () => {
  const origins: Record<string, string>[] = [{ origin: "" }, { origin: "https://other.example.test" }, { "sec-fetch-site": "cross-site" }];
  for (const headers of origins) {
    const f = fixture();
    assert.equal((await f.post(request(body, headers))).status, 403);
    assert.equal(f.authenticated(), 0);
  }
  for (const url of ["", "invalid", "file:///tmp/private"]) {
    const f = fixture({ environment: () => ({ ...environment, NEXT_PUBLIC_APP_URL: url }) });
    assert.equal((await f.post(request())).status, 503);
    assert.equal(f.reservations(), 0);
  }
});

test("reservation requires JSON, a session and persistent per-user traffic budget", async () => {
  const wrongType = fixture();
  assert.equal((await wrongType.post(request(body, { "content-type": "text/plain" }))).status, 415);
  assert.equal(wrongType.authenticated(), 0);
  const guest = fixture({ authenticate: async () => null });
  assert.equal((await guest.post(request())).status, 401);
  assert.equal(guest.reservations(), 0);
  let budget;
  const limited = fixture({ consume: async (input) => { budget = input; return { allowed: false, remaining: 0, retryAfterMs: 1501 }; } });
  const response = await limited.post(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "2");
  assert.deepEqual(budget, { scope: "izipay-sandbox-reserve", identifier: userId, limit: 10, windowMs: 600_000 });
  assert.equal(limited.reservations(), 0);
});

test("reservation binds the rendered account to the session and rejects browser money or payment data", async () => {
  const f = fixture();
  assert.equal((await f.post(request({ ...body, expectedUserId: order.id }))).status, 409);
  for (const extra of [{ total: "0.01" }, { amount: "0.01" }, { currency: "USD" }, { provider: "TRANSFER_MANUAL" },
    { formToken: "browser-token" }, { cardNumber: "not-a-card" }, { kind: "manual" }]) {
    assert.equal((await f.post(request({ ...body, ...extra }))).status, 400);
  }
  for (const value of [null, [], {}, { ...body, receiptType: "FACTURA" }, { ...body, addressId: "invalid" }]) {
    assert.equal((await f.post(request(value))).status, 400);
  }
  assert.equal(f.reservations(), 0);
});

test("reservation passes the authenticated identity and normalized fiscal input to the ACID service", async () => {
  let received;
  const f = fixture({ reserve: async (user, input, env) => { received = { user, input, env }; return order; } });
  const invoice = { ...body, receiptType: "FACTURA", documentNumber: "20123456789", businessName: " Empresa QA ",
    taxAddress: " Dirección QA ", customerNotes: " Nota QA " };
  const response = await f.post(request(invoice));
  assert.equal(response.status, 201);
  assert.deepEqual(received, { user: userId, input: { ...invoice, businessName: "Empresa QA", taxAddress: "Dirección QA", customerNotes: "Nota QA" }, env: environment });
  assert.deepEqual(await response.json(), { kind: "reserved", orderId: order.id, orderNumber: order.number, replayed: false });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
});

test("reservation replay recovers identity without claiming a closed reservation is active", async () => {
  const f = fixture({ reserve: async () => ({ ...order, replayed: true }) });
  const response = await f.post(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { kind: "recovered", orderId: order.id, orderNumber: order.number, replayed: true });
});

test("reservation rejects oversized bytes with missing or misleading Content-Length, not just string length", async () => {
  const f = fixture();
  assert.equal((await f.post(request({}, { "content-length": String(MAX_AUTOMATIC_RESERVATION_BYTES + 1) }))).status, 413);
  assert.equal((await f.post(request({ extra: "x".repeat(MAX_AUTOMATIC_RESERVATION_BYTES) }, { "content-length": "1" }))).status, 413);
  assert.equal((await f.post(request({ extra: "🍇".repeat(MAX_AUTOMATIC_RESERVATION_BYTES / 3) }))).status, 413);
  assert.equal(f.reservations(), 0);
});

test("reservation rejects malformed bodies, invalid UTF-8 and invalid Content-Length without echoing input", async () => {
  const f = fixture();
  const headers = { origin: "https://rosh.example.test", "content-type": "application/json" };
  for (const value of ["{private-address", new Uint8Array([0xff])]) {
    const response = await f.post(new Request("https://rosh.example.test", { method: "POST", headers, body: value }));
    assert.equal(response.status, 400);
    assert.equal((await response.text()).includes("private-address"), false);
  }
  assert.equal((await f.post(request(body, { "content-length": "-1" }))).status, 400);
  assert.equal(f.reservations(), 0);
});

test("reservation cancels a stalled request body within its deadline, without reserving", async () => {
  let cancelled = 0;
  const stream = new ReadableStream<Uint8Array>({ cancel: () => { cancelled += 1; } });
  const init: RequestInit & { duplex: "half" } = { method: "POST", duplex: "half", body: stream,
    headers: { origin: "https://rosh.example.test", "content-type": "application/json" } };
  const f = fixture({ bodyTimeoutMs: 5 });
  assert.equal((await f.post(new Request("https://rosh.example.test", init))).status, 408);
  assert.equal(cancelled, 1);
  assert.equal(f.reservations(), 0);
});

test("reservation aborts an in-flight body read and cancels its stream without reserving", async () => {
  const controller = new AbortController();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(writer) { writer.enqueue(new TextEncoder().encode("{")); setTimeout(() => controller.abort(), 5); },
    cancel() { cancelled = true; },
  });
  const init: RequestInit & { duplex: "half" } = { method: "POST", duplex: "half", body: stream, signal: controller.signal,
    headers: { origin: "https://rosh.example.test", "content-type": "application/json" } };
  const f = fixture();
  assert.equal((await f.post(new Request("https://rosh.example.test", init))).status, 408);
  assert.equal(cancelled, true);
  assert.equal(f.reservations(), 0);
});

test("reservation rejects an already aborted client before changing stock", async () => {
  const controller = new AbortController(); controller.abort();
  const f = fixture();
  assert.equal((await f.post(new Request(request(), { signal: controller.signal }))).status, 408);
  assert.equal(f.reservations(), 0);
});

test("reservation bounds the sum of streamed chunks even when the declared length lies", async () => {
  let cancelled = false;
  let reads = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(writer) { reads += 1; writer.enqueue(new Uint8Array(3000).fill(32)); },
    cancel() { cancelled = true; },
  });
  const init: RequestInit & { duplex: "half" } = { method: "POST", duplex: "half", body: stream,
    headers: { origin: "https://rosh.example.test", "content-type": "application/json", "content-length": "1" } };
  const f = fixture();
  assert.equal((await f.post(new Request("https://rosh.example.test", init))).status, 413);
  assert.ok(reads <= 4);
  assert.equal(cancelled, true);
  assert.equal(f.reservations(), 0);
});

test("reservation maps business failures and never exposes arbitrary private error details", async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { logs.push(args); });
  const cases = [
    [new OrderReservationError("QUOTE_CHANGED"), 409, "QUOTE_CHANGED"],
    [new OrderReservationError("INVALID_CONFIRMATION"), 400, "INVALID_CONFIRMATION"],
    [new OrderReservationError("PENDING_LIMIT"), 409, "PENDING_LIMIT"],
    [new OrderReservationError("BUSY"), 409, "BUSY"],
    [new OrderReservationError("PROVIDER_UNAVAILABLE"), 503, "PROVIDER_UNAVAILABLE"],
    [new CheckoutUnavailableError("ADDRESS_NOT_FOUND"), 404, "ADDRESS_NOT_FOUND"],
    [new CheckoutUnavailableError("UNSUPPORTED_ZONE"), 409, "UNSUPPORTED_ZONE"],
    [new CheckoutUnavailableError("EMPTY_CART"), 409, "EMPTY_CART"],
    [new CheckoutUnavailableError("STOCK_CHANGED"), 409, "STOCK_CHANGED"],
    [new StockChangedError(), 409, "STOCK_CHANGED"],
    [new MoneyError("private-money-detail"), 409, "AMOUNT_INVALID"],
    [new IzipayPreparationError("TEST_CONFIG_REQUIRED"), 503, "RESERVATION_UNAVAILABLE"],
    [new Error("private-db-password"), 503, "RESERVATION_UNAVAILABLE"],
  ] as const;
  for (const [error, status, code] of cases) {
    const f = fixture({ reserve: async () => { throw error; } });
    const response = await f.post(request());
    assert.equal(response.status, status);
    const value = await response.json();
    assert.equal(value.code, code);
    assert.equal(JSON.stringify(value).includes("private-"), false);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
  assert.deepEqual(logs, [["AUTOMATIC_RESERVATION_UNAVAILABLE"]]);
});

test("reservation conflict returns only the authenticated account's existing order reference", async () => {
  const f = fixture({ reserve: async () => { throw new CheckoutConflictError(order.number); } });
  const response = await f.post(request());
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { code: "CHECKOUT_CONFLICT", orderNumber: order.number,
    message: "Esta confirmación ya corresponde a otro resumen o método. Revisa el pedido existente." });
});

test("reservation validates the configured request deadline", () => {
  for (const bodyTimeoutMs of [0, -1, 5001, NaN]) assert.throws(() => fixture({ bodyTimeoutMs }), /INVALID_BODY_TIMEOUT/);
});
