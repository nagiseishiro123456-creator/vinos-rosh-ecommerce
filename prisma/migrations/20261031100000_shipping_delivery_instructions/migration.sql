-- Optional operator-authored public information. No default policy or historical backfill.
BEGIN;
ALTER TABLE "ShippingZone" ADD COLUMN "deliveryInstructions" VARCHAR(600);
ALTER TABLE "Order" ADD COLUMN "shippingDeliveryInstructions" VARCHAR(600);
COMMIT;
