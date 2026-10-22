import assert from "node:assert/strict";
import test, { after, type TestContext } from "node:test";
import { prisma } from "../src/lib/prisma";
import { consumeRateLimit, rateLimitKey } from "../src/lib/rate-limit";
import { unlockLocalRegistration } from "../src/modules/auth/local-registration-unlock";
import { registrationRateLimit } from "../src/modules/auth/registration-policy";

const database = new URL(process.env.DATABASE_URL ?? "");
assert.ok(["/vinos_rosh_test", "/vinos_rosh_ci"].includes(database.pathname), "Registration QA requires an isolated database");
const environment = { ...process.env, NODE_ENV: "development", LOCAL_REGISTRATION_TEST_MODE: "true",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000", NEXTAUTH_URL: "http://localhost:3000" };
after(() => prisma.$disconnect());

async function buckets(t: TestContext, pairs: Array<[string, string]>) {
  const keys = pairs.map(([scope, ip]) => rateLimitKey(scope, ip));
  await prisma.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
  t.after(() => prisma.rateLimitBucket.deleteMany({ where: { key: { in: keys } } }));
  for (const key of keys) await prisma.rateLimitBucket.create({ data: { key, count: 6,
    resetAt: new Date(Date.now() + 3_600_000) } });
  return keys;
}

test("local registration unlock removes only selected registration keys and preserves accounts and other protections", async (t) => {
  const ip = "192.0.2.205";
  const keys = await buckets(t, [["auth-register", "unknown"], ["auth-register-local", "127.0.0.1"],
    ["auth-register", ip], ["auth-login", "unknown:qa@example.test"], ["password-reset-submit", "unknown"],
    ["checkout", "unknown"], ["cart-account", "unknown"]]);
  const users = await prisma.user.count(); const orders = await prisma.order.count();
  assert.equal((await unlockLocalRegistration(environment)).count, 2);
  assert.equal(await prisma.rateLimitBucket.count({ where: { key: { in: keys.slice(2) } } }), 5);
  assert.equal((await unlockLocalRegistration(environment, [ip])).count, 1);
  assert.equal(await prisma.rateLimitBucket.count({ where: { key: { in: keys.slice(3) } } }), 4);
  assert.equal(await prisma.user.count(), users); assert.equal(await prisma.order.count(), orders);
});

test("a full legacy registration bucket does not block opt-in local development and remains recoverable", async (t) => {
  const [legacy] = await buckets(t, [["auth-register", "unknown"], ["auth-register-local", "unknown"]]);
  await prisma.rateLimitBucket.delete({ where: { key: rateLimitKey("auth-register-local", "unknown") } });
  assert.equal((await consumeRateLimit({ ...registrationRateLimit({}), identifier: "unknown" })).allowed, false);
  const policy = registrationRateLimit(environment);
  const result = await consumeRateLimit({ ...policy, identifier: "unknown" });
  assert.equal(result.allowed, true); assert.equal(result.remaining, 59);
  assert.equal((await prisma.rateLimitBucket.findUniqueOrThrow({ where: { key: legacy } })).count, 6);
  await unlockLocalRegistration(environment);
  assert.equal((await consumeRateLimit({ ...registrationRateLimit({}), identifier: "unknown" })).allowed, true);
});

test("local registration unlock rejects production, remote settings and invalid IPs without clearing a bucket", async (t) => {
  const [key] = await buckets(t, [["auth-register", "unknown"]]);
  for (const patch of [{ NODE_ENV: "production" }, { DATABASE_URL: "postgresql://qa:qa@remote.example/vinos_rosh" },
    { NEXT_PUBLIC_APP_URL: "https://rosh.example" }]) {
    await assert.rejects(unlockLocalRegistration({ ...environment, ...patch }), /LOCAL_REGISTRATION_ONLY/);
  }
  await assert.rejects(unlockLocalRegistration(environment, ["not-an-ip"]), /INVALID_LOCAL_REGISTRATION_IP/);
  assert.equal((await prisma.rateLimitBucket.findUniqueOrThrow({ where: { key } })).count, 6);
});
