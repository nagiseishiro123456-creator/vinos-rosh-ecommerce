import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  buildMicuentawebPayment,
  IzipayPreparationError,
  MICUENTAWEB_CREATE_PAYMENT_URL,
  readMicuentawebSandboxConfig,
  requestMicuentawebSandboxFormToken,
  toMicuentawebMinorUnits,
  verifyMicuentawebIpnSignature,
} from "../src/modules/payments/izipay/micuentaweb-core";

// All values are synthetic. Every request uses an injected in-process transport.
const environment = {
  PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_INTEGRATION: "MICUENTAWEB_V4", IZIPAY_MODE: "TEST",
  IZIPAY_MCW_MERCHANT_ID: "QA_ROSH", IZIPAY_MCW_REST_TEST_PASSWORD: "QA-NOT-A-REAL-SECRET",
  IZIPAY_MCW_PUBLIC_TEST_KEY: "QA-NOT-A-REAL-PUBLIC-KEY",
};
const snapshot = { orderReference: "QA_ROSH_ATTEMPT_1", total: "98.20", currency: "PEN" as const, customerEmail: "buyer@example.test" };
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } }); }
const expectedFailure = (code: string) => (error: unknown) => error instanceof IzipayPreparationError && error.code === code;

test("Izipay converts persisted amounts to exact integer cents", () => {
  assert.equal(toMicuentawebMinorUnits("98.20"), 9820);
  assert.equal(toMicuentawebMinorUnits("0.01"), 1);
  assert.equal(toMicuentawebMinorUnits("0.30"), 30);
  assert.equal(toMicuentawebMinorUnits("99999999.99"), 9_999_999_999);
});

test("Izipay rejects rounded, zero, floating-point and out-of-range inputs", () => {
  for (const value of [98.2, "98.2", "98.201", "0.00", "-1.00", "01.00", "1e2", "NaN", "100000000.00", null]) {
    assert.throws(() => toMicuentawebMinorUnits(value), expectedFailure("INVALID_ORDER_SNAPSHOT"));
  }
});

test("Izipay payload uses the order snapshot and excludes card data", () => {
  assert.deepEqual(buildMicuentawebPayment(snapshot), {
    amount: 9820, currency: "PEN", orderId: snapshot.orderReference, customer: { email: snapshot.customerEmail },
  });
  assert.throws(() => buildMicuentawebPayment({ ...snapshot, amount: 1 }), expectedFailure("INVALID_ORDER_SNAPSHOT"));
});

test("Izipay rejects unsupported currency and invalid order references", () => {
  assert.throws(() => buildMicuentawebPayment({ ...snapshot, currency: "USD" }), expectedFailure("INVALID_ORDER_SNAPSHOT"));
  assert.throws(() => buildMicuentawebPayment({ ...snapshot, orderReference: "../other" }), expectedFailure("INVALID_ORDER_SNAPSHOT"));
});

test("Izipay is disabled by default without an outbound request", async () => {
  let calls = 0;
  await assert.rejects(requestMicuentawebSandboxFormToken(snapshot, {}, { fetch: async () => { calls++; return json({}); } }), expectedFailure("DISABLED"));
  assert.equal(calls, 0);
});

test("Izipay requires the explicit product and TEST mode before accepting credentials", () => {
  assert.throws(() => readMicuentawebSandboxConfig({ ...environment, IZIPAY_INTEGRATION: "PUNTOWEB" }), expectedFailure("PRODUCT_UNCONFIRMED"));
  assert.throws(() => readMicuentawebSandboxConfig({ ...environment, IZIPAY_MODE: "PRODUCTION" }), expectedFailure("TEST_CONFIG_REQUIRED"));
  assert.throws(() => readMicuentawebSandboxConfig({ ...environment, IZIPAY_MCW_REST_TEST_PASSWORD: "" }), expectedFailure("TEST_CONFIG_REQUIRED"));
});

test("Izipay formToken request pins HTTPS destination and sends server Basic Auth", async () => {
  let calls = 0;
  const result = await requestMicuentawebSandboxFormToken(snapshot, environment, { fetch: async (url, init) => {
    calls++;
    assert.equal(url, MICUENTAWEB_CREATE_PAYMENT_URL);
    assert.equal(init.redirect, "error");
    assert.equal(init.cache, "no-store");
    assert.equal(init.method, "POST");
    assert.equal(new Headers(init.headers).get("authorization"), `Basic ${Buffer.from("QA_ROSH:QA-NOT-A-REAL-SECRET").toString("base64")}`);
    assert.deepEqual(JSON.parse(init.body as string), buildMicuentawebPayment(snapshot));
    return json({ status: "SUCCESS", answer: { formToken: "QA-OPAQUE-TOKEN", ignored: "not-returned" } });
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result, { formToken: "QA-OPAQUE-TOKEN", publicKey: environment.IZIPAY_MCW_PUBLIC_TEST_KEY });
});

test("Izipay provider HTTP errors do not leak response bodies or retry", async () => {
  let calls = 0;
  await assert.rejects(requestMicuentawebSandboxFormToken(snapshot, environment, { fetch: async () => {
    calls++; return json({ secret: "MUST-NOT-LEAK" }, 503);
  } }), expectedFailure("UPSTREAM_HTTP"));
  assert.equal(calls, 1);
});

test("Izipay provider failure and missing token are never treated as success", async () => {
  for (const response of [{ status: "ERROR", answer: { errorMessage: "DO-NOT-EXPOSE" } }, { status: "SUCCESS", answer: {} }, { status: "SUCCESS", answer: { formToken: " " } }]) {
    await assert.rejects(requestMicuentawebSandboxFormToken(snapshot, environment, { fetch: async () => json(response) }), expectedFailure("UPSTREAM_RESPONSE"));
  }
});

test("Izipay rejects HTML, malformed JSON and oversized response bodies", async () => {
  for (const response of [new Response("<html>unexpected</html>"), new Response("{bad-json", { headers: { "content-type": "application/json" } }), json({ padding: "x".repeat(131_073) })]) {
    await assert.rejects(requestMicuentawebSandboxFormToken(snapshot, environment, { fetch: async () => response }), expectedFailure("UPSTREAM_RESPONSE"));
  }
});

test("Izipay network failures are sanitized and are not automatically retried", async () => {
  let calls = 0;
  await assert.rejects(requestMicuentawebSandboxFormToken(snapshot, environment, { fetch: async () => {
    calls++; throw new Error("NETWORK-ERROR-WITH-SENSITIVE-DETAILS");
  } }), expectedFailure("UPSTREAM_NETWORK"));
  assert.equal(calls, 1);
});

test("Izipay timeout aborts the attempt without a second outbound request", async () => {
  let calls = 0;
  await assert.rejects(requestMicuentawebSandboxFormToken(snapshot, environment, { timeoutMs: 20, fetch: async (_url, init) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  } }), expectedFailure("UPSTREAM_TIMEOUT"));
  assert.equal(calls, 1);
});

test("Izipay invalid timeout is rejected before a request", async () => {
  let calls = 0;
  for (const timeoutMs of [0, -1, 30_001, NaN]) {
    await assert.rejects(requestMicuentawebSandboxFormToken(snapshot, environment, { timeoutMs, fetch: async () => { calls++; return json({}); } }), expectedFailure("INVALID_TIMEOUT"));
  }
  assert.equal(calls, 0);
});

test("Izipay IPN verifies the original UTF-8 answer and REST password", () => {
  const answer = '{"orderStatus":"PAID","label":"Viña ROSH","url":"https:\\/\\/example.test"}';
  const hash = createHmac("sha256", environment.IZIPAY_MCW_REST_TEST_PASSWORD).update(answer, "utf8").digest("hex");
  assert.equal(verifyMicuentawebIpnSignature(answer, hash, environment.IZIPAY_MCW_REST_TEST_PASSWORD), true);
  assert.equal(verifyMicuentawebIpnSignature(answer, hash.toUpperCase(), environment.IZIPAY_MCW_REST_TEST_PASSWORD), true);
  assert.equal(verifyMicuentawebIpnSignature(answer.replace("PAID", "UNPAID"), hash, environment.IZIPAY_MCW_REST_TEST_PASSWORD), false);
  assert.equal(verifyMicuentawebIpnSignature(JSON.stringify(JSON.parse(answer)), hash, environment.IZIPAY_MCW_REST_TEST_PASSWORD), false);
});

test("Izipay IPN rejects another key, invalid digest formats and invalid inputs", () => {
  const answer = '{"orderStatus":"PAID"}';
  const hash = createHmac("sha256", "DIFFERENT-CONTEXT-KEY").update(answer).digest("hex");
  assert.equal(verifyMicuentawebIpnSignature(answer, hash, environment.IZIPAY_MCW_REST_TEST_PASSWORD), false);
  for (const digest of [null, "", "00", "g".repeat(64), Buffer.alloc(32).toString("base64")]) {
    assert.equal(verifyMicuentawebIpnSignature(answer, digest, environment.IZIPAY_MCW_REST_TEST_PASSWORD), false);
  }
  assert.equal(verifyMicuentawebIpnSignature("x".repeat(131_073), "0".repeat(64), environment.IZIPAY_MCW_REST_TEST_PASSWORD), false);
  assert.equal(verifyMicuentawebIpnSignature(null, "0".repeat(64), environment.IZIPAY_MCW_REST_TEST_PASSWORD), false);
  assert.equal(verifyMicuentawebIpnSignature(answer, "0".repeat(64), ""), false);
});
