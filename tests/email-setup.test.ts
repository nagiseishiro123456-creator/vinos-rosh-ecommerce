import assert from "node:assert/strict";
import test from "node:test";
import { inspectPaymentEmailSetup, readPaymentEmailConfig } from "../src/modules/notifications/email-config";

test("email setup reports missing prerequisites without enabling sending or claiming provider verification", () => {
  const result = inspectPaymentEmailSetup({});
  assert.equal(result.enabled, false); assert.equal(result.locallyReady, false); assert.equal(result.providerVerified, false);
  assert.equal(result.checks.filter((check) => check.ok).length, 0);
  assert.equal(readPaymentEmailConfig({}), null);
});
test("email diagnostics redact private environment values even when locally complete", () => {
  const env = { PAYMENT_CONFIRMATION_EMAIL_ENABLED: "true", RESEND_API_KEY: "qa-private-key", EMAIL_FROM: "ROSH <private@example.test>", NEXT_PUBLIC_APP_URL: "https://private.example.test" };
  const result = inspectPaymentEmailSetup(env);
  assert.equal(result.locallyReady, true); assert.equal(result.providerVerified, false);
  const rendered = JSON.stringify(result);
  for (const value of [env.RESEND_API_KEY, env.EMAIL_FROM, env.NEXT_PUBLIC_APP_URL]) assert.equal(rendered.includes(value), false);
  assert.ok(readPaymentEmailConfig(env));
});
test("header injection and malformed sender or shop URL keep the transport disabled", () => {
  const env = { PAYMENT_CONFIRMATION_EMAIL_ENABLED: "true", RESEND_API_KEY: "qa-key", EMAIL_FROM: "ROSH <qa@example.test>", NEXT_PUBLIC_APP_URL: "https://rosh.example.test" };
  for (const change of [{ RESEND_API_KEY: "key\r\ninjected" }, { EMAIL_FROM: "a<b<qa@example.test>" }, { EMAIL_FROM: "qa@example.test\ncc:x" }, { NEXT_PUBLIC_APP_URL: "https://user:password@example.test" }, { NEXT_PUBLIC_APP_URL: "javascript:alert(1)" }]) {
    assert.equal(readPaymentEmailConfig({ ...env, ...change }), null);
    assert.equal(inspectPaymentEmailSetup({ ...env, ...change }).locallyReady, false);
  }
});
