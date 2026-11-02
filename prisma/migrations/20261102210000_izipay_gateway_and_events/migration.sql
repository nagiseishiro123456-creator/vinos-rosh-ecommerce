ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'IZIPAY';
CREATE TABLE "IzipayGatewayVersion" (
  "id" UUID PRIMARY KEY, "mode" VARCHAR(10) NOT NULL CHECK ("mode" IN ('SANDBOX','PRODUCTION')),
  "merchantId" VARCHAR(64) NOT NULL, "secretBox" TEXT NOT NULL,
  "fingerprint" CHAR(64) NOT NULL UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "IzipayGatewayConfiguration" (
  "id" TEXT PRIMARY KEY DEFAULT 'izipay' CHECK ("id"='izipay'),
  "versionId" UUID NOT NULL REFERENCES "IzipayGatewayVersion"("id") ON DELETE RESTRICT,
  "enabled" BOOLEAN NOT NULL DEFAULT false, "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0),
  "updatedBy" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "IzipayConfigurationAudit" (
  "id" UUID PRIMARY KEY, "actorId" TEXT NOT NULL, "revision" INTEGER NOT NULL,
  "mode" VARCHAR(10) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "PaymentAttempt" ADD COLUMN "gatewayVersionId" UUID
  REFERENCES "IzipayGatewayVersion"("id") ON DELETE RESTRICT;
CREATE TABLE "IzipayPaymentEvent" (
  "id" UUID PRIMARY KEY, "attemptId" TEXT NOT NULL REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT,
  "transactionUuid" VARCHAR(64) NOT NULL, "eventHash" CHAR(64) NOT NULL UNIQUE,
  "outcome" VARCHAR(24) NOT NULL CHECK ("outcome" IN ('TEST_APPROVED','APPROVED','REVIEW','NONFINAL')),
  "mode" VARCHAR(10) NOT NULL CHECK ("mode" IN ('TEST','PRODUCTION')),
  "amountMinor" BIGINT NOT NULL CHECK ("amountMinor">0), "currency" CHAR(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "IzipayPaymentEvent_attemptId_createdAt_idx" ON "IzipayPaymentEvent"("attemptId","createdAt");
CREATE UNIQUE INDEX "IzipayPaymentEvent_transaction_applied" ON "IzipayPaymentEvent"("transactionUuid")
  WHERE "outcome" IN ('TEST_APPROVED','APPROVED');
