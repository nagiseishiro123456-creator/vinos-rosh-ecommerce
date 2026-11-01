import assert from "node:assert/strict";
import test from "node:test";
import { buildLaunchReport, collectLaunchSnapshot, type LaunchSnapshot } from "../src/modules/admin/launch/readiness";

const published = { NODE_ENV: "production", PREVIEW_MODE: "false", NEXT_PUBLIC_APP_URL: "https://rosh.example.test" };
const complete: LaunchSnapshot = { activeProducts: 3, inStockProducts: 2, activeZones: 2, zonesWithoutInstructions: 0,
  commerce: { yapeReady: false, transferReady: true, whatsappPhone: "+51999999999", contactEmail: "rosh@example.test" } };

test("complete local setup never certifies providers or customer acceptance", () => {
  const report = buildLaunchReport(complete, published);
  assert.equal(report.readyCount, 7); assert.equal(report.progress, 100); assert.equal(report.requiredPending, 0);
  assert.ok(report.reviews.length > 0); assert.ok(report.reviews.every((check) => check.status === "review"));
  assert.ok(report.integrations.every((check) => check.status !== "ready"));
});
test("HTTPS preview, development, missing publication flag and unsafe origins remain pending", () => {
  for (const changed of [{ PREVIEW_MODE: "true" }, { PREVIEW_MODE: undefined }, { NODE_ENV: "development" },
    { NEXT_PUBLIC_APP_URL: "https://127.0.0.1" }, { NEXT_PUBLIC_APP_URL: "https://user:private@rosh.example.test" },
    { NEXT_PUBLIC_APP_URL: "https://rosh.example.test/?secret=private" }]) {
    const check = buildLaunchReport(complete, { ...published, ...changed }).checks.find((check) => check.id === "public-mode")!;
    assert.equal(check.status, "pending"); assert.equal(check.description.includes("private"), false);
  }
});
test("empty catalog, stock and coverage are pending without guessing readiness", () => {
  const report = buildLaunchReport({ ...complete, activeProducts: 0, inStockProducts: 0, activeZones: 0 }, published);
  assert.deepEqual(report.checks.slice(0, 3).map((check) => check.status), ["pending", "pending", "pending"]);
  assert.equal(report.requiredPending, 3);
});
test("a failed observation stays unavailable while independent observations survive", async () => {
  const snapshot = await collectLaunchSnapshot({ activeProducts: async () => { throw new Error("private-db-detail"); },
    inStockProducts: async () => 2, activeZones: async () => 1,
    zonesWithoutInstructions: async () => { throw new Error("private-query-detail"); }, commerce: async () => complete.commerce! });
  const report = buildLaunchReport(snapshot, published);
  assert.equal(report.checks[0].status, "unavailable"); assert.equal(report.checks[1].status, "ready");
  assert.equal(report.unavailableCount, 1); assert.equal(report.requiredPending, 1);
  assert.equal(JSON.stringify(report).includes("private-"), false);
  assert.match(report.reviews[0].description, /No se pudieron consultar/);
});
test("unavailable commerce cannot be reported as unconfigured or ready", () => {
  const report = buildLaunchReport({ ...complete, commerce: null }, published);
  for (const id of ["payment", "support", "contact"]) assert.equal(report.checks.find((check) => check.id === id)?.status, "unavailable");
  assert.equal(report.unavailableCount, 3); assert.equal(report.requiredPending, 2);
});
test("manual readiness follows resolved checkout settings independently of provider flags", () => {
  assert.equal(buildLaunchReport(complete, { ...published, PAYMENTS_TRANSFER_MANUAL_ENABLED: "false" }).checks.find((check) => check.id === "payment")?.status, "ready");
  assert.equal(buildLaunchReport({ ...complete, commerce: { ...complete.commerce!, transferReady: false } },
    { ...published, PAYMENTS_TRANSFER_MANUAL_ENABLED: "true", PAYMENTS_IZIPAY_ENABLED: "true" }).checks.find((check) => check.id === "payment")?.status, "pending");
});
test("malformed support details remain actionable and do not expose the stored values", () => {
  const report = buildLaunchReport({ ...complete, commerce: { ...complete.commerce!, whatsappPhone: "private-phone", contactEmail: "private-email" } }, published);
  assert.equal(report.checks.find((check) => check.id === "support")?.status, "pending");
  assert.equal(report.checks.find((check) => check.id === "contact")?.status, "pending");
  assert.equal(JSON.stringify(report).includes("private-"), false);
});
test("prepared sandbox and email still require external verification and redact all credentials", () => {
  const environment = { ...published, PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_INTEGRATION: "MICUENTAWEB_V4", IZIPAY_MODE: "TEST",
    IZIPAY_MCW_MERCHANT_ID: "qa_private_merchant", IZIPAY_MCW_REST_TEST_PASSWORD: "private-password",
    IZIPAY_MCW_PUBLIC_TEST_KEY: "private-public-test-key", PAYMENT_CONFIRMATION_EMAIL_ENABLED: "true",
    RESEND_API_KEY: "private-resend-key", EMAIL_FROM: "Private <private@example.test>" };
  const report = buildLaunchReport(complete, environment);
  assert.deepEqual(report.integrations.map((check) => check.status), ["review", "review"]);
  assert.match(report.integrations[0].description, /sandbox presente/); assert.match(report.integrations[1].description, /completa/);
  for (const secret of [environment.IZIPAY_MCW_MERCHANT_ID, environment.IZIPAY_MCW_REST_TEST_PASSWORD, environment.IZIPAY_MCW_PUBLIC_TEST_KEY,
    environment.RESEND_API_KEY, environment.EMAIL_FROM]) assert.equal(JSON.stringify(report).includes(secret), false);
});
test("enabled but incomplete providers never become ready and every check has a next step", () => {
  const report = buildLaunchReport(complete, { ...published, PAYMENTS_IZIPAY_ENABLED: "true", PAYMENT_CONFIRMATION_EMAIL_ENABLED: "true" });
  assert.ok(report.integrations.every((check) => check.status === "review"));
  for (const check of [...report.checks, ...report.integrations, ...report.reviews]) {
    assert.ok(check.nextStep.length > 0); assert.ok(check.href.startsWith("/admin/")); assert.ok(check.linkLabel.length > 0);
  }
});
