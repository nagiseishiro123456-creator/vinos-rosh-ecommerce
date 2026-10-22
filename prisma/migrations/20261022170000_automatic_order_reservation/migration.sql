-- Existing manual/legacy orders retain NULL; no payment or stock backfill.
ALTER TABLE "Order" ADD COLUMN "paymentIntegration" VARCHAR(32);
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentIntegration_supported"
  CHECK ("paymentIntegration" IS NULL OR "paymentIntegration" = 'MICUENTAWEB_V4');
