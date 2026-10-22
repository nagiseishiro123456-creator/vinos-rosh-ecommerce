DO $$ BEGIN
  IF (SELECT count(*) FROM "Order" WHERE id='legacy-order' AND total=98.20 AND status='PENDING_PAYMENT'
      AND "checkoutKey"='legacy-identity' AND "paymentIntegration" IS NULL) <> 1 OR
     (SELECT count(*) FROM "Payment" WHERE id='legacy-payment' AND "orderId"='legacy-order' AND status='PENDING') <> 1 OR
     (SELECT count(*) FROM "PaymentAttempt" WHERE id='legacy-attempt' AND "providerReference"='preserved-reference') <> 1 OR
     (SELECT stock FROM "Product" WHERE id='legacy-product') <> 7 OR
     (SELECT quantity FROM "CartItem" WHERE id='later-item') <> 2
  THEN RAISE EXCEPTION 'Automatic reservation migration rewrote commerce history'; END IF;
  BEGIN
    UPDATE "Order" SET "paymentIntegration"='UNKNOWN_GATEWAY' WHERE id='legacy-order';
    RAISE EXCEPTION 'Unknown integration accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE "Order" SET "paymentIntegration"='MICUENTAWEB_V4' WHERE id='legacy-order';
DO $$ BEGIN
  IF (SELECT count(*) FROM "Order" WHERE "paymentIntegration"='MICUENTAWEB_V4' AND total=98.20) <> 1
  THEN RAISE EXCEPTION 'Explicit integration cannot be persisted'; END IF;
END $$;
SELECT 'S3-02 automatic reservation migration contract passed' AS result;
ROLLBACK;
