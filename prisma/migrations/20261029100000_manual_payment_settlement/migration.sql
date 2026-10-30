BEGIN;
CREATE TABLE "PaymentSettlement" (
  "id" UUID NOT NULL,
  "paymentId" TEXT NOT NULL,
  "grossAmount" DECIMAL(10,2) NOT NULL,
  "commissionAmount" DECIMAL(10,2),
  "depositedAmount" DECIMAL(10,2),
  "depositReference" VARCHAR(120),
  "depositDate" DATE,
  "sourceReference" VARCHAR(120) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentSettlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "settlement_amounts" CHECK ("grossAmount" > 0 AND ("commissionAmount" IS NULL OR ("commissionAmount" >= 0 AND "commissionAmount" <= "grossAmount")) AND ("depositedAmount" IS NULL OR "depositedAmount" >= 0)),
  CONSTRAINT "settlement_deposit_evidence" CHECK (("depositedAmount" IS NULL AND "depositReference" IS NULL AND "depositDate" IS NULL) OR ("depositedAmount" IS NOT NULL AND length(btrim("depositReference")) >= 3 AND "depositReference" IS NOT NULL AND "depositDate" IS NOT NULL)),
  CONSTRAINT "settlement_source" CHECK (length(btrim("sourceReference")) >= 4),
  CONSTRAINT "settlement_revision" CHECK ("revision" >= 1),
  CONSTRAINT "PaymentSettlement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentSettlement_paymentId_key" ON "PaymentSettlement"("paymentId");
COMMIT;
