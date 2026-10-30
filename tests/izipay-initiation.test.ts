import assert from "node:assert/strict";
import test from "node:test";

import { PaymentAttemptError } from "../src/modules/payments/izipay/attempt-service";
import { IzipayPreparationError } from "../src/modules/payments/izipay/micuentaweb-core";
import { initiateMicuentawebSandboxPayment, PaymentInitiationError, type InitiationPorts } from "../src/modules/payments/izipay/initiation-service";
import { createMicuentawebInitiationHandler } from "../src/modules/payments/izipay/initiation-handler";

const userId = "cm123456789012345678901234";
const orderId = "cm223456789012345678901234";
const attemptId = "cm323456789012345678901234";
const environment = {
  PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_MCW_INITIATE_ENABLED: "true", NEXT_PUBLIC_APP_URL: "https://rosh.example.test",
};
const snapshot = { orderReference: "11111111-1111-4111-8111-111111111111" as const, total: "98.20", currency: "PEN" as const, customerEmail: "qa@example.test" };
const metadata = { id: attemptId, providerReference: snapshot.orderReference, amountMinor: "9820", currency: "PEN",
  state: "INITIATING" as const, createdAt: new Date(), tokenReadyAt: null, uncertainAt: null };
const ready = { kind: "token_ready" as const, attemptId, formToken: "qa-fake-token", publicKey: "qa-fake-public" };

function ports(changes: Partial<InitiationPorts> = {}) {
  const calls: string[] = [];
  const dependencies: InitiationPorts = {
    begin: async () => { calls.push("begin"); return { created: true, attempt: metadata, snapshot }; },
    current: async () => { calls.push("current"); return true; },
    request: async () => { calls.push("request"); return { formToken: ready.formToken, publicKey: ready.publicKey }; },
    ready: async () => { calls.push("ready"); return true; },
    uncertain: async () => { calls.push("uncertain"); return true; },
    ...changes,
  };
  return { calls, dependencies };
}
function request(body: unknown = { orderId, expectedUserId: userId }, headers: Record<string, string> = {}) {
  return new Request("https://rosh.example.test/api/payment/initiate", { method: "POST",
    headers: { origin: "https://rosh.example.test", "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}
function handler(changes: Partial<Parameters<typeof createMicuentawebInitiationHandler>[0]> = {}) {
  let started = 0; let authenticated = 0;
  const post = createMicuentawebInitiationHandler({
    environment: () => environment,
    authenticate: async () => { authenticated += 1; return userId; },
    consume: async () => ({ allowed: true, remaining: 9, retryAfterMs: 0 }),
    initiate: async () => { started += 1; return ready; }, ...changes,
  });
  return { post, started: () => started, authenticated: () => authenticated };
}

test("Izipay initiation persists before request and confirms storage before returning a token", async () => {
  const f = ports();
  assert.deepEqual(await initiateMicuentawebSandboxPayment(userId, orderId, environment, f.dependencies), ready);
  assert.deepEqual(f.calls, ["begin", "current", "request", "ready"]);
});

test("Izipay initiation replays have no token and never request or store another one", async () => {
  for (const state of ["INITIATING", "TOKEN_READY", "UNCERTAIN"] as const) {
    const f = ports({ begin: async () => ({ created: false, attempt: { ...metadata, state } }) });
    const result = await initiateMicuentawebSandboxPayment(userId, orderId, environment, f.dependencies);
    assert.equal(result.kind, state === "INITIATING" ? "pending" : "recovery_required");
    assert.equal("formToken" in result, false);
    assert.deepEqual(f.calls, []);
  }
});

test("Izipay an invalidated reservation prevents outbound request and preserves the attempt for recovery", async () => {
  const f = ports({ current: async () => false });
  await assert.rejects(initiateMicuentawebSandboxPayment(userId, orderId, environment, f.dependencies), PaymentInitiationError);
  assert.deepEqual(f.calls, ["begin", "uncertain"]);
});

test("Izipay network errors produce one uncertain outcome without exposing the underlying exception", async () => {
  let requests = 0;
  const f = ports({ request: async () => { requests += 1; throw new Error("private-password-and-response"); } });
  await assert.rejects(initiateMicuentawebSandboxPayment(userId, orderId, environment, f.dependencies), (error: unknown) => {
    assert.ok(error instanceof PaymentInitiationError);
    assert.equal(error.message, "PAYMENT_RECOVERY_REQUIRED");
    assert.equal(String(error.stack).includes("private-password"), false);
    return true;
  });
  assert.equal(requests, 1);
  assert.deepEqual(f.calls, ["begin", "current", "uncertain"]);
});

test("Izipay missing or failed token persistence never returns the provider token", async () => {
  for (const ready of [async () => false, async () => { throw new Error("database-private-detail"); }]) {
    const f = ports({ ready });
    await assert.rejects(initiateMicuentawebSandboxPayment(userId, orderId, environment, f.dependencies), PaymentInitiationError);
    assert.deepEqual(f.calls, ["begin", "current", "request", "uncertain"]);
  }
});

test("Izipay failure to record uncertainty does not retry network or leak the database error", async () => {
  let requests = 0;
  const f = ports({ request: async () => { requests += 1; throw new Error("private-network"); },
    uncertain: async () => { throw new Error("private-database"); } });
  await assert.rejects(initiateMicuentawebSandboxPayment(userId, orderId, environment, f.dependencies), PaymentInitiationError);
  assert.equal(requests, 1);
});

test("Izipay endpoint defaults off and requires a separate route opt-in before authentication", async () => {
  for (const env of [{}, { ...environment, IZIPAY_MCW_INITIATE_ENABLED: "false" }, { ...environment, PAYMENTS_IZIPAY_ENABLED: "false" }]) {
    const f = handler({ environment: () => env });
    assert.equal((await f.post(request())).status, 404);
    assert.equal(f.authenticated(), 0);
    assert.equal(f.started(), 0);
  }
});

test("Izipay endpoint rejects absent/foreign Origin and cross-site requests", async () => {
  const cases: Record<string, string>[] = [{ origin: "" }, { origin: "https://other.example.test" }, { "sec-fetch-site": "cross-site" }];
  for (const headers of cases) {
    const f = handler();
    assert.equal((await f.post(request(undefined, headers))).status, 403);
    assert.equal(f.authenticated(), 0);
    assert.equal(f.started(), 0);
  }
  for (const url of ["invalid-url", "file:///tmp/test"]) {
    const f = handler({ environment: () => ({ ...environment, NEXT_PUBLIC_APP_URL: url }) });
    assert.equal((await f.post(request())).status, 503);
  }
});

test("Izipay endpoint requires JSON, authenticated session and traffic budget", async () => {
  const wrongType = handler();
  assert.equal((await wrongType.post(request(undefined, { "content-type": "text/plain" }))).status, 415);
  assert.equal(wrongType.authenticated(), 0);
  const guest = handler({ authenticate: async () => null });
  assert.equal((await guest.post(request())).status, 401);
  assert.equal(guest.started(), 0);
  const limited = handler({ consume: async () => ({ allowed: false, remaining: 0, retryAfterMs: 1_500 }) });
  const response = await limited.post(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "2");
  assert.equal(limited.started(), 0);
});

test("Izipay endpoint refuses client amounts, sensitive fields and a different current account", async () => {
  const f = handler();
  for (const extra of [{ amount: 1 }, { currency: "USD" }, { formToken: "browser-token" }, { cardNumber: "fake-not-a-card" }]) {
    assert.equal((await f.post(request({ orderId, expectedUserId: userId, ...extra }))).status, 400);
  }
  assert.equal((await f.post(request({ orderId, expectedUserId: orderId }))).status, 409);
  assert.equal((await f.post(request({ orderId: "not-an-id", expectedUserId: userId }))).status, 400);
  assert.equal(f.started(), 0);
});

test("Izipay endpoint bounds streamed bodies and handles malformed JSON and UTF-8", async () => {
  const f = handler();
  const headers = { origin: "https://rosh.example.test", "content-type": "application/json" };
  assert.equal((await f.post(new Request("https://rosh.example.test", { method: "POST", headers, body: "{" }))).status, 400);
  assert.equal((await f.post(new Request("https://rosh.example.test", { method: "POST", headers, body: new Uint8Array([0xff]) }))).status, 400);
  assert.equal((await f.post(request({}, { "content-length": "2049" }))).status, 413);
  assert.equal((await f.post(request({ value: "x".repeat(2049) }))).status, 413);
  assert.equal(f.started(), 0);
});

test("Izipay endpoint cancels a slow body without starting payment", async () => {
  let cancelled = 0;
  const stream = new ReadableStream<Uint8Array>({ cancel: () => { cancelled += 1; } });
  const init: RequestInit & { duplex: "half" } = { method: "POST", duplex: "half", body: stream,
    headers: { origin: "https://rosh.example.test", "content-type": "application/json" } };
  const f = handler({ bodyTimeoutMs: 5 });
  assert.equal((await f.post(new Request("https://rosh.example.test", init))).status, 408);
  assert.equal(cancelled, 1);
  assert.equal(f.started(), 0);
});

test("Izipay successful response is private/no-store and only exposes token, public key and attempt identity", async () => {
  const f = handler();
  const response = await f.post(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.deepEqual(await response.json(), ready);
  assert.equal(f.started(), 1);
});

test("Izipay pending/recovery responses never expose a token or offer a new attempt", async () => {
  for (const kind of ["pending", "recovery_required"] as const) {
    const f = handler({ initiate: async () => ({ kind, attemptId }) });
    const response = await f.post(request());
    assert.equal(response.status, kind === "pending" ? 202 : 409);
    assert.equal("formToken" in await response.json(), false);
  }
});

test("Izipay endpoint sanitizes provider, order and database errors", async (t) => {
  const messages: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => { messages.push(args); });
  for (const [error, status] of [
    [new PaymentAttemptError("ORDER_UNAVAILABLE"), 404], [new PaymentAttemptError("BUSY"), 503],
    [new IzipayPreparationError("TEST_CONFIG_REQUIRED"), 503], [new PaymentInitiationError(), 409],
    [new Error("secret-password-response"), 503],
  ] as const) {
    const f = handler({ initiate: async () => { throw error; } });
    const response = await f.post(request());
    assert.equal(response.status, status);
    assert.equal((await response.text()).includes("secret-password"), false);
  }
  assert.deepEqual(messages, [["PAYMENT_INITIATION_UNAVAILABLE"]]);
});

test("Izipay endpoint does not start a request whose client already disconnected", async () => {
  const controller = new AbortController(); controller.abort();
  const f = handler();
  const r = request();
  const aborted = new Request(r, { signal: controller.signal });
  assert.equal((await f.post(aborted)).status, 408);
  assert.equal(f.started(), 0);
});
