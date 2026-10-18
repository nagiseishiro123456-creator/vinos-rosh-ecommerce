ALTER TABLE "Order"
ADD COLUMN "stockReservedAt" TIMESTAMP(3),
ADD COLUMN "reservationExpiresAt" TIMESTAMP(3),
ADD COLUMN "stockReleasedAt" TIMESTAMP(3),
ADD COLUMN "reservationExpiredAt" TIMESTAMP(3);

ALTER TABLE "Payment" ADD COLUMN "reportedAt" TIMESTAMP(3);

-- Legacy manual orders in these states already discounted stock. Do not reserve again.
-- Legacy PENDING_PAYMENT is intentionally excluded: its stock ownership is unknown.
UPDATE "Order" SET "stockReservedAt" = "createdAt"
WHERE "status" IN ('PAYMENT_REVIEW', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED');

UPDATE "Payment" SET "reportedAt" = "createdAt"
WHERE "operationCode" IS NOT NULL;

CREATE INDEX "Order_status_reservationExpiresAt_idx" ON "Order"("status", "reservationExpiresAt");
