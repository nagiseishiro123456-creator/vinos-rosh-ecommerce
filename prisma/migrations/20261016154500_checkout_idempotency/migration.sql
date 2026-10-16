ALTER TABLE "Order"
ADD COLUMN "checkoutKey" VARCHAR(68),
ADD COLUMN "checkoutRequestHash" CHAR(64);

-- Existing orders remain NULL: do not invent replay identities for historical purchases.
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkout_identity_check" CHECK (
  ("checkoutKey" IS NULL AND "checkoutRequestHash" IS NULL)
  OR (
    "checkoutKey" IS NOT NULL AND "checkoutRequestHash" IS NOT NULL
    AND "checkoutKey" ~ '^ck1:[a-f0-9]{64}$'
    AND "checkoutRequestHash" ~ '^[a-f0-9]{64}$'
  )
);
CREATE UNIQUE INDEX "Order_userId_checkoutKey_key" ON "Order"("userId", "checkoutKey");
