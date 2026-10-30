BEGIN;
CREATE TABLE "PaymentConfirmationOutbox" (
  "id" UUID NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'QUEUED',
  "recipient" VARCHAR(254) NOT NULL,
  "payload" JSONB NOT NULL,
  "envelope" JSONB,
  "senderConfigHash" CHAR(64),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "firstAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" UUID,
  "lockedUntil" TIMESTAMP(3),
  "providerMessageId" UUID,
  "acceptedAt" TIMESTAMP(3),
  "lastErrorCode" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentConfirmationOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_outbox_status" CHECK ("status" IN ('QUEUED','PROCESSING','SENT','RETRY','REVIEW','CANCELLED')),
  CONSTRAINT "payment_outbox_attempts" CHECK ("attempts" >= 0 AND ("attempts" = 0) = ("firstAttemptAt" IS NULL)),
  CONSTRAINT "payment_outbox_payload" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "payment_outbox_lease" CHECK (("status" = 'PROCESSING' AND "leaseToken" IS NOT NULL AND "lockedUntil" IS NOT NULL) OR ("status" <> 'PROCESSING' AND "leaseToken" IS NULL AND "lockedUntil" IS NULL)),
  CONSTRAINT "payment_outbox_acceptance" CHECK (("status" = 'SENT' AND "acceptedAt" IS NOT NULL AND "providerMessageId" IS NOT NULL) OR ("status" <> 'SENT' AND "acceptedAt" IS NULL AND "providerMessageId" IS NULL)),
  CONSTRAINT "PaymentConfirmationOutbox_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentConfirmationOutbox_orderId_key" ON "PaymentConfirmationOutbox"("orderId");
CREATE INDEX "PaymentConfirmationOutbox_status_nextAttemptAt_idx" ON "PaymentConfirmationOutbox"("status", "nextAttemptAt");
COMMIT;
