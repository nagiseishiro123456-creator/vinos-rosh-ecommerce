-- Historical orders keep NULL; only legacy TEST attempts may use that marker.
ALTER TABLE "Order" ADD COLUMN "paymentMode" VARCHAR(10)
  CHECK ("paymentMode" IS NULL OR "paymentMode" IN ('TEST','PRODUCTION'));
