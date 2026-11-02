import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../src/lib/prisma";
import { consumeRateLimit, getClientIp, rateLimitKey } from "../src/lib/rate-limit";
import { randomUUID } from "node:crypto";

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
      where: { key: rateLimitKey("test", identifier) },
  });
});

test("concurrent rate-limit requests keep the exact allowance without failing cart or checkout on write conflicts", async () => {
  const scope = "test-concurrent", identifier = randomUUID();
  try {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => consumeRateLimit({ scope, identifier, limit: 3, windowMs: 60000 })));
    for (const result of results) assert.equal(result.status, "fulfilled", result.status === "rejected" ? String(result.reason) : undefined);
    const values = results.map(result => (result as PromiseFulfilledResult<Awaited<ReturnType<typeof consumeRateLimit>>>).value);
    assert.equal(values.filter(value => value.allowed).length, 3);
    assert.deepEqual(values.filter(value => value.allowed).map(value => value.remaining).sort(), [0, 1, 2]);
    assert(values.filter(value => !value.allowed).every(value => value.remaining === 0 && value.retryAfterMs > 0));
  } finally { await prisma.rateLimitBucket.deleteMany({ where: { key: rateLimitKey(scope, identifier) } }); }
});
