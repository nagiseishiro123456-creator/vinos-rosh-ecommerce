import assert from "node:assert/strict";
import test from "node:test";
import { isLocalRegistrationEnvironment, registrationRateLimit, registrationWait } from "../src/modules/auth/registration-policy";

const local = { NODE_ENV: "development", LOCAL_REGISTRATION_TEST_MODE: "true",
  DATABASE_URL: "postgresql://qa:qa@localhost:5432/vinos_rosh", NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000" };
const normal = { scope: "auth-register", limit: 6, windowMs: 3_600_000 };

test("registration defaults preserve six attempts per hour", () => {
  assert.deepEqual(registrationRateLimit({}), normal);
  assert.deepEqual(registrationRateLimit({ ...local, LOCAL_REGISTRATION_TEST_MODE: "false" }), normal);
});
test("registration local opt-in has its own bounded ten-minute bucket", () => {
  assert.deepEqual(registrationRateLimit(local), { scope: "auth-register-local", limit: 60, windowMs: 600_000 });
});
test("registration production cannot enable the local policy even with loopback configuration", () => {
  const environment = { ...local, NODE_ENV: "production" };
  assert.equal(isLocalRegistrationEnvironment(environment), false);
  assert.deepEqual(registrationRateLimit(environment), normal);
});
test("registration refuses relaxation for remote, malformed, renamed or overridden databases", () => {
  for (const DATABASE_URL of ["", "not-a-url", "postgresql://qa:qa@remote.example/vinos_rosh",
    "postgresql://qa:qa@127.0.0.1/vinos_rosh_prod", "https://localhost/vinos_rosh",
    "postgresql://qa:qa@localhost/vinos_rosh?host=remote.example"]) {
    assert.deepEqual(registrationRateLimit({ ...local, DATABASE_URL }), normal);
  }
});
test("registration requires both application URLs to be loopback", () => {
  for (const field of ["NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL"]) {
    for (const value of ["", "https://rosh.example", "file://localhost/a", "http://localhost.evil.example"]) {
      assert.deepEqual(registrationRateLimit({ ...local, [field]: value }), normal);
    }
  }
});
test("registration accepts IPv4 and IPv6 loopback for named local QA databases", () => {
  for (const host of ["127.0.0.1", "[::1]"]) {
    for (const name of ["vinos_rosh", "vinos_rosh_test", "vinos_rosh_ci"]) {
      const environment = { ...local, DATABASE_URL: `postgresql://qa:qa@${host}:5433/${name}`,
        NEXTAUTH_URL: `http://${host}:3000`, NEXT_PUBLIC_APP_URL: `http://${host}:3000` };
      assert.equal(isLocalRegistrationEnvironment(environment), true);
    }
  }
});
test("registration never enables local relaxation in test or unspecified runtime", () => {
  for (const NODE_ENV of [undefined, "test"]) assert.deepEqual(registrationRateLimit({ ...local, NODE_ENV }), normal);
});
test("registration feedback gives a positive Retry-After and rounds minutes upward", () => {
  assert.equal(registrationWait(0).retryAfterSeconds, 1);
  assert.match(registrationWait(1).message, /en 1 minuto\./);
  assert.equal(registrationWait(60_001).retryAfterSeconds, 61);
  assert.match(registrationWait(60_001).message, /en 2 minutos\./);
  assert.match(registrationWait(3_600_000).message, /en 60 minutos\./);
});
test("local unlock configuration may omit NODE_ENV but still rejects production", () => {
  assert.equal(isLocalRegistrationEnvironment({ ...local, NODE_ENV: undefined }), true);
  assert.equal(isLocalRegistrationEnvironment({ ...local, NODE_ENV: "production" }), false);
});
