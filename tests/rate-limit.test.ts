import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../src/lib/prisma";
import { consumeRateLimit, getClientIp } from "../src/lib/rate-limit";

test("getClientIp uses the first forwarded address", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.10, 10.0.0.4",
    "x-real-ip": "10.0.0.9",
  });

  assert.equal(getClientIp(headers), "203.0.113.10");
});

test("consumeRateLimit blocks requests after the configured limit", async () => {
  const identifier = `ci-${Date.now()}-${Math.random()}`;

  const first = await consumeRateLimit({
    scope: "test",
    identifier,
    limit: 2,
    windowMs: 60_000,
  });
  const second = await consumeRateLimit({
    scope: "test",
    identifier,
    limit: 2,
    windowMs: 60_000,
  });
  const third = await consumeRateLimit({
    scope: "test",
    identifier,
    limit: 2,
    windowMs: 60_000,
  });

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterMs > 0);

  await prisma.rateLimitBucket.deleteMany({
    where: { key: { not: "" }, resetAt: { gt: new Date(0) } },
  });
});
