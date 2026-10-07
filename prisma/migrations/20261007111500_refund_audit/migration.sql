-- Refund audit fields for manual payment operations.
ALTER TABLE "Order"
ADD COLUMN "refundedAt" TIMESTAMP(3);

ALTER TABLE "Payment"
ADD COLUMN "refundReference" TEXT,
ADD COLUMN "refundedAt" TIMESTAMP(3);
