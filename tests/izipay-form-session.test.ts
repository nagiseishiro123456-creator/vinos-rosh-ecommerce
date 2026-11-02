import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { PaymentFormSession, FormSessionChanged, type FormPorts, type FormView } from "../src/modules/payments/izipay/form-session";
import { isMicuentawebFormLabEnabled, isMicuentawebFormEnabled } from "../src/modules/payments/izipay/form-policy";
import { micuentawebLabCsp } from "../src/modules/payments/izipay/form-csp";
import type { PaymentStatusSnapshot } from "../src/modules/payments/izipay/status-contract";

function fixture(t: TestContext, overrides: Partial<FormPorts> = {}, state: PaymentStatusSnapshot["state"] = "reserved", timeout = 1000) {
  const initial: PaymentStatusSnapshot = { orderId: "cm123456789012345678901234", orderNumber: "ROSH-QA", total: "98.20", currency: "PEN",
    state, orderStatus: "PENDING_PAYMENT", reservationExpiresAt: new Date(Date.now() + 60000).toISOString(), confirmedAt: null, observedAt: new Date().toISOString() };
  let starts = 0, mounts = 0, clears = 0, submitted: (() => false) | undefined;
  let current: PaymentStatusSnapshot = initial;
  const views: FormView[] = [];
  const session = new PaymentFormSession(initial, {
    status: async () => current,
    initiate: async () => { starts++; current = { ...current, state: "prepared" }; return { kind: "token_ready", attemptId: "cm223456789012345678901234", formToken: "PRIVATE-QA-TOKEN", publicKey: "QA-PUBLIC-KEY" }; },
    mount: async (_token, _key, callback) => { mounts++; submitted = callback; },
    clear: () => { clears++; }, ...overrides,
  }, view => views.push(view), timeout);
  t.after(() => session.dispose());
  return { session, initial, views, setStatus: (value: PaymentStatusSnapshot) => { current = value; }, counts: () => ({ starts, mounts, clears }), submit: () => submitted!() };
}

test("Izipay form: a double click creates one initiation; tokens never enter the view", async t => {
  const f = fixture(t);
  await Promise.all([f.session.start(), f.session.start(), f.session.start()]);
  assert.equal(f.counts().starts, 1); assert.equal(f.counts().mounts, 1);
  assert.equal(f.session.current().phase, "form");
  assert.doesNotMatch(JSON.stringify(f.views), /PRIVATE-QA-TOKEN|QA-PUBLIC-KEY|formToken/);
});

test("Izipay form: SDK callback cannot approve payment or permit another initiation", async t => {
  const f = fixture(t); await f.session.start();
  assert.equal(f.submit(), false); assert.equal(f.session.current().phase, "waiting");
  assert.equal(f.submit(), false); await f.session.refresh(); await f.session.start();
  assert.equal(f.counts().starts, 1); assert.notEqual(f.session.current().phase, "confirmed");
});

test("Izipay form: only a consistent authenticated server snapshot confirms the order", async t => {
  const f = fixture(t); await f.session.start(); f.submit();
  f.setStatus({ ...f.initial, state: "confirmed", orderStatus: "PAID", confirmedAt: new Date().toISOString() });
  await f.session.refresh(); assert.equal(f.session.current().phase, "confirmed");
});

test("Izipay form: losing the initiation response locks retries, including after status refresh", async t => {
  let calls = 0;
  const f = fixture(t, { initiate: async () => { calls++; throw new Error("sensitive provider data"); } });
  await f.session.start(); await f.session.refresh(); await f.session.start();
  assert.equal(calls, 1); assert.equal(f.session.current().phase, "recovery");
  assert.doesNotMatch(JSON.stringify(f.views), /sensitive/);
});

for (const state of ["initiating", "prepared", "uncertain", "expired", "closed", "review"] as const) {
  test(`Izipay form: remount in ${state} cannot reopen or restart payment`, async t => {
    const f = fixture(t, {}, state); await f.session.start(); await f.session.refresh(); await f.session.start();
    assert.equal(f.counts().starts, 0); assert.equal(f.counts().mounts, 0);
  });
}

for (const field of ["orderId", "orderNumber", "total", "currency", "reservationExpiresAt"] as const) {
  test(`Izipay form: mismatched ${field} prevents initiation`, async t => {
    const f = fixture(t); f.setStatus({ ...f.initial, [field]: field === "total" ? "0.01" : "tampered" });
    await f.session.start(); assert.equal(f.counts().starts, 0); assert.equal(f.session.current().phase, "recovery");
  });
}

test("Izipay form: cancellation or session change after token issuance prevents mounting", async t => {
  let reads = 0;
  const f = fixture(t, { status: async () => { if (++reads === 2) throw new FormSessionChanged(); return f.initial; } });
  await f.session.start(); assert.equal(f.counts().starts, 1); assert.equal(f.counts().mounts, 0);
  assert.equal(f.session.current().phase, "session");
});

test("Izipay form: session change closes the open form and blocks all later starts", async t => {
  const f = fixture(t); await f.session.start();
  f.setStatus({ ...f.initial, state: "closed", orderStatus: "CANCELLED" });
  await f.session.refresh(); await f.session.start();
  assert.equal(f.session.current().phase, "closed"); assert.equal(f.counts().starts, 1); assert.ok(f.counts().clears > 0);
});

test("Izipay form: periodic prepared status preserves the same mounted form", async t => {
  const f = fixture(t); await f.session.start(); await f.session.refresh();
  assert.equal(f.session.current().phase, "form"); assert.equal(f.counts().mounts, 1); assert.equal(f.counts().clears, 0);
});

test("Izipay form: timeout during unresponsive SDK closes it without retrying", async t => {
  const f = fixture(t, { mount: async () => new Promise(() => {}) }, "reserved", 20);
  await f.session.start(); await f.session.start();
  assert.equal(f.session.current().phase, "recovery"); assert.equal(f.counts().starts, 1); assert.ok(f.counts().clears > 0);
});

test("Izipay form: disposal during initiation ignores late token and callbacks", async t => {
  let resolve!: (value: unknown) => void;
  const f = fixture(t, { initiate: async () => new Promise(done => { resolve = done; }) });
  const started = f.session.start(); await delay(1); f.session.dispose();
  resolve({ kind: "token_ready", attemptId: "cm223456789012345678901234", formToken: "LATE-SECRET", publicKey: "QA" });
  await started; assert.equal(f.counts().mounts, 0);
  assert.doesNotMatch(JSON.stringify(f.views), /LATE-SECRET/);
});

test("Izipay form: expired and already confirmed preflight never starts the provider", async t => {
  const f = fixture(t);
  f.setStatus({ ...f.initial, state: "confirmed", orderStatus: "PAID", confirmedAt: new Date().toISOString() });
  await f.session.start(); assert.equal(f.session.current().phase, "confirmed"); assert.equal(f.counts().starts, 0);
});

test("Izipay form: invalid successful response cannot mount a form", async t => {
  const f = fixture(t, { initiate: async () => ({ kind: "token_ready", formToken: "unbound-token" }) });
  await f.session.start(); assert.equal(f.counts().mounts, 0); assert.equal(f.session.current().phase, "recovery");
});

test("Izipay laboratory is hard-blocked in production and requires separate opt-in and test key formats", () => {
  const env = { NODE_ENV: "development", PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_MCW_INITIATE_ENABLED: "true", IZIPAY_MCW_FORM_ENABLED: "true",
    IZIPAY_INTEGRATION: "MICUENTAWEB_V4", IZIPAY_MODE: "TEST", IZIPAY_MCW_MERCHANT_ID: "qa", IZIPAY_MCW_REST_TEST_PASSWORD: "testpassword_fake", IZIPAY_MCW_PUBLIC_TEST_KEY: "qa:testpublickey_fake" };
  assert.equal(isMicuentawebFormLabEnabled(env), true);
  for (const patch of [{ NODE_ENV: "production" }, { NODE_ENV: "test" }, { IZIPAY_MCW_FORM_ENABLED: "false" },
    { IZIPAY_MCW_INITIATE_ENABLED: "false" }, { PAYMENTS_IZIPAY_ENABLED: "false" }, { IZIPAY_MODE: "PRODUCTION" },
    { IZIPAY_MCW_REST_TEST_PASSWORD: "prodpassword_fake" }, { IZIPAY_MCW_PUBLIC_TEST_KEY: "another:testpublickey_fake" }]) {
    assert.equal(isMicuentawebFormLabEnabled({ ...env, ...patch }), false);
  }
});

test("Izipay laboratory CSP keeps existing protections and limits frames to exact provider origins", () => {
  const policy = micuentawebLabCsp("default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'");
  assert.match(policy, /object-src 'none'/); assert.match(policy, /form-action 'self'/); assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /frame-src https:\/\/static\.micuentaweb\.pe https:\/\/api\.micuentaweb\.pe/);
  assert.doesNotMatch(policy, /\*|unsafe-eval|data:/);
});
test("Izipay live form needs separate activation and never accepts the shared demo merchant", () => {
  const env={NODE_ENV:'production',PAYMENTS_IZIPAY_ENABLED:'true',IZIPAY_MCW_FORM_ENABLED:'true',IZIPAY_MCW_INITIATE_ENABLED:'true',
    NEXT_PUBLIC_APP_URL:'https://rosh.example.test',
    IZIPAY_INTEGRATION:'MICUENTAWEB_V4',IZIPAY_MODE:'PRODUCTION',IZIPAY_PRODUCTION_ENABLED:'true',IZIPAY_MCW_MERCHANT_ID:'12345678',
    IZIPAY_MCW_REST_TEST_PASSWORD:'prodpassword_fake',IZIPAY_MCW_PUBLIC_TEST_KEY:'12345678:publickey_fake'};
  assert.equal(isMicuentawebFormEnabled(env),true);
  assert.equal(isMicuentawebFormEnabled({...env,IZIPAY_PRODUCTION_ENABLED:'false'}),false);
  assert.equal(isMicuentawebFormEnabled({...env,NODE_ENV:'development'}),false);
  assert.equal(isMicuentawebFormEnabled({...env,NEXT_PUBLIC_APP_URL:'http://rosh.example.test'}),false);
  assert.equal(isMicuentawebFormEnabled({...env,IZIPAY_MCW_MERCHANT_ID:'69876357',IZIPAY_MCW_PUBLIC_TEST_KEY:'69876357:publickey_fake'}),false);
});
