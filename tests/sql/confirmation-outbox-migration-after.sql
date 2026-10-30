DO $$ BEGIN
  IF (SELECT COUNT(*) FROM "PaymentConfirmationOutbox") <> 0 THEN RAISE EXCEPTION 'Historical orders must not receive retroactive notices'; END IF;
  IF (SELECT stock FROM "Product" WHERE id='historical-product') <> 7 THEN RAISE EXCEPTION 'Stock changed'; END IF;
  IF (SELECT status FROM "Order" WHERE id='historical-order') <> 'PAID' THEN RAISE EXCEPTION 'Historical order changed'; END IF;
  INSERT INTO "PaymentConfirmationOutbox" ("id", "orderId", "recipient", "payload")
    VALUES ('00000000-0000-4000-8000-000000000001', 'historical-order', 'qa@example.test', '{"version":1}');
  BEGIN
    INSERT INTO "PaymentConfirmationOutbox" ("id", "orderId", "recipient", "payload")
      VALUES ('00000000-0000-4000-8000-000000000002', 'historical-order', 'qa@example.test', '{"version":1}');
    RAISE EXCEPTION 'Duplicate order notice allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentConfirmationOutbox" SET "status"='SENT';
    RAISE EXCEPTION 'Acceptance without receipt allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentConfirmationOutbox" SET "leaseToken"='00000000-0000-4000-8000-000000000003';
    RAISE EXCEPTION 'Partial lease allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  DELETE FROM "Order" WHERE id='historical-order';
  IF (SELECT COUNT(*) FROM "PaymentConfirmationOutbox") <> 0 THEN RAISE EXCEPTION 'Order deletion did not remove its test notice'; END IF;
END $$;
RESET search_path;
DROP SCHEMA rosh_confirmation_outbox_qa CASCADE;
