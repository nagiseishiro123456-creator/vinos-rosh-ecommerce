DO $$ BEGIN
  IF (SELECT count(*) FROM "PaymentAttempt") <> 0 OR
     (SELECT count(*) FROM "Order") <> 2 OR
     (SELECT count(*) FROM "Order" WHERE id='legacy-order' AND total=98.20 AND status='PENDING_PAYMENT') <> 1 OR
     (SELECT count(*) FROM "Payment" WHERE id='legacy-payment' AND "orderId"='legacy-order' AND status='PENDING') <> 1 OR
     (SELECT count(*) FROM "Product" WHERE id='legacy-product' AND stock=7) <> 1 OR
     (SELECT count(*) FROM "CartItem" WHERE id='legacy-item' AND quantity=2) <> 1
  THEN RAISE EXCEPTION 'Preparation migration changed existing commerce data'; END IF;
END $$;

INSERT INTO "PaymentAttempt" (id,"orderId","providerReference",integration,mode,"amountMinor",currency,"updatedAt")
VALUES ('qa-attempt','legacy-order','qa-reference','MICUENTAWEB_V4','TEST',9820,'PEN',CURRENT_TIMESTAMP);
DO $$ BEGIN
  BEGIN
    INSERT INTO "PaymentAttempt" (id,"orderId","providerReference",integration,mode,"amountMinor",currency,"updatedAt")
    VALUES ('duplicate-order','legacy-order','other-reference','MICUENTAWEB_V4','TEST',9820,'PEN',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'Duplicate attempt accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO "PaymentAttempt" (id,"orderId","providerReference",integration,mode,"amountMinor",currency,"updatedAt")
    VALUES ('duplicate-reference','another-order','qa-reference','MICUENTAWEB_V4','TEST',100,'PEN',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'Duplicate provider reference accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO "PaymentAttempt" (id,"orderId","providerReference",integration,mode,"amountMinor",currency,"updatedAt")
    VALUES ('orphan','missing-order','orphan-reference','MICUENTAWEB_V4','TEST',100,'PEN',CURRENT_TIMESTAMP);
    RAISE EXCEPTION 'Missing order accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentAttempt" SET "amountMinor"=0 WHERE id='qa-attempt';
    RAISE EXCEPTION 'Zero amount accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentAttempt" SET "amountMinor"=10000000000 WHERE id='qa-attempt';
    RAISE EXCEPTION 'Excess amount accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentAttempt" SET mode='PROD' WHERE id='qa-attempt';
    RAISE EXCEPTION 'Production preparation accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentAttempt" SET currency='USD' WHERE id='qa-attempt';
    RAISE EXCEPTION 'Other currency accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentAttempt" SET state='TOKEN_READY' WHERE id='qa-attempt';
    RAISE EXCEPTION 'Token readiness without hash/time accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentAttempt" SET state='UNCERTAIN' WHERE id='qa-attempt';
    RAISE EXCEPTION 'Uncertainty without time accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE "PaymentAttempt" SET state='TOKEN_READY', "tokenHash"=repeat('a',64), "tokenReadyAt"=CURRENT_TIMESTAMP WHERE id='qa-attempt';
DO $$ BEGIN
  IF (SELECT count(*) FROM "PaymentAttempt" WHERE state='TOKEN_READY' AND "amountMinor"=9820) <> 1
  THEN RAISE EXCEPTION 'Valid completion failed'; END IF;
END $$;
SELECT 'S3-02 payment attempt migration contract passed' AS result;
ROLLBACK;
