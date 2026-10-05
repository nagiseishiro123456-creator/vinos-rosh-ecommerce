import { createHash } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type HeadersLike = Headers | Record<string, string | string[] | undefined>;

type ConsumeRateLimitInput = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

function readHeader(headersLike: HeadersLike | undefined, name: string) {
  if (!headersLike) return null;

  if (headersLike instanceof Headers) {
    return headersLike.get(name);
  }

  const direct = headersLike[name] ?? headersLike[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0] ?? null;
  return direct ?? null;
}

export function getClientIp(headersLike?: HeadersLike) {
  const forwarded = readHeader(headersLike, "x-forwarded-for");
  const realIp = readHeader(headersLike, "x-real-ip");

  const candidate = forwarded?.split(",")[0]?.trim() || realIp?.trim();
  return candidate || "unknown";
}

function bucketKey(scope: string, identifier: string) {
  return createHash("sha256")
    .update(`${scope}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

function isRetryableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2034" || error.code === "P2002")
  );
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: ConsumeRateLimitInput): Promise<RateLimitResult> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("RATE_LIMIT_INVALID_LIMIT");
  }
  if (!Number.isFinite(windowMs) || windowMs < 1_000) {
    throw new Error("RATE_LIMIT_INVALID_WINDOW");
  }

  const key = bucketKey(scope, identifier || "unknown");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const resetAt = new Date(now.getTime() + windowMs);
          const bucket = await tx.rateLimitBucket.findUnique({ where: { key } });

          if (!bucket) {
            await tx.rateLimitBucket.create({
              data: {
                key,
                count: 1,
                resetAt,
              },
            });

            return {
              allowed: true,
              remaining: Math.max(0, limit - 1),
              retryAfterMs: 0,
            };
          }

          if (bucket.resetAt.getTime() <= now.getTime()) {
            await tx.rateLimitBucket.update({
              where: { id: bucket.id },
              data: {
                count: 1,
                resetAt,
              },
            });

            return {
              allowed: true,
              remaining: Math.max(0, limit - 1),
              retryAfterMs: 0,
            };
          }

          if (bucket.count >= limit) {
            return {
              allowed: false,
              remaining: 0,
              retryAfterMs: Math.max(1_000, bucket.resetAt.getTime() - now.getTime()),
            };
          }

          const updated = await tx.rateLimitBucket.update({
            where: { id: bucket.id },
            data: { count: { increment: 1 } },
            select: { count: true },
          });

          return {
            allowed: true,
            remaining: Math.max(0, limit - updated.count),
            retryAfterMs: 0,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new Error("RATE_LIMIT_UNAVAILABLE");
}

export async function clearRateLimit(scope: string, identifier: string) {
  const key = bucketKey(scope, identifier || "unknown");
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}

export async function cleanupExpiredRateLimits() {
  return prisma.rateLimitBucket.deleteMany({
    where: { resetAt: { lt: new Date() } },
  });
}
