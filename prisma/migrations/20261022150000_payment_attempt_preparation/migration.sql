CREATE TYPE "PaymentAttemptState" AS ENUM ('INITIATING', 'TOKEN_READY', 'UNCERTAIN');

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "providerReference" VARCHAR(64) NOT NULL,
  "integration" VARCHAR(32) NOT NULL,
  "mode" VARCHAR(4) NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "state" "PaymentAttemptState" NOT NULL DEFAULT 'INITIATING',
  "tokenHash" CHAR(64),
  "tokenReadyAt" TIMESTAMP(3),
  "uncertainAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId")
    REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_sandbox_contract" CHECK (
    "integration" = 'MICUENTAWEB_V4' AND "mode" = 'TEST' AND "currency" = 'PEN'
    AND "amountMinor" BETWEEN 1 AND 9999999999
    AND "providerReference" ~ '^[A-Za-z0-9_-]{1,64}$'
  ),
  CONSTRAINT "PaymentAttempt_state_data" CHECK (
    ("state" = 'INITIATING' AND "tokenHash" IS NULL AND "tokenReadyAt" IS NULL AND "uncertainAt" IS NULL)
    OR ("state" = 'TOKEN_READY' AND "tokenHash" IS NOT NULL AND "tokenHash" ~ '^[a-f0-9]{64}$'
      AND "tokenReadyAt" IS NOT NULL AND "uncertainAt" IS NULL)
    OR ("state" = 'UNCERTAIN' AND "tokenHash" IS NULL AND "tokenReadyAt" IS NULL AND "uncertainAt" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "PaymentAttempt_orderId_key" ON "PaymentAttempt"("orderId");
CREATE UNIQUE INDEX "PaymentAttempt_providerReference_key" ON "PaymentAttempt"("providerReference");
CREATE INDEX "PaymentAttempt_state_createdAt_idx" ON "PaymentAttempt"("state", "createdAt");
