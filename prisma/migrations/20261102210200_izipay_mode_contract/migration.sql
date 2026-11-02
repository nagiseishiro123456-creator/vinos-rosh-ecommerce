ALTER TABLE "PaymentAttempt" ALTER COLUMN "mode" TYPE VARCHAR(10);
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_sandbox_contract";
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_provider_contract" CHECK (
  "integration"='MICUENTAWEB_V4' AND "mode" IN ('TEST','PRODUCTION') AND "currency"='PEN'
  AND "amountMinor" BETWEEN 1 AND 9999999999 AND "providerReference" ~ '^[A-Za-z0-9_-]{1,64}$'
);
