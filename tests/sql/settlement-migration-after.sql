DO $$
BEGIN
  IF (SELECT count(*) FROM "PaymentSettlement") <> 0 THEN RAISE EXCEPTION 'No backfill permitted'; END IF;
  IF (SELECT "amount" FROM "Payment" WHERE "id"='historic-paid') <> 98.20 THEN RAISE EXCEPTION 'Historical payment changed'; END IF;
  INSERT INTO "PaymentSettlement" ("id","paymentId","grossAmount","sourceReference") VALUES ('00000000-0000-4000-8000-000000000001','historic-paid',98.20,'QA-report');
  BEGIN
    INSERT INTO "PaymentSettlement" ("id","paymentId","grossAmount","sourceReference") VALUES ('00000000-0000-4000-8000-000000000002','historic-paid',98.20,'QA-report');
    RAISE EXCEPTION 'Duplicate settlement accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentSettlement" SET "commissionAmount"=98.21;
    RAISE EXCEPTION 'Fee above gross accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE "PaymentSettlement" SET "depositedAmount"=95.70;
    RAISE EXCEPTION 'Deposit without evidence accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  DELETE FROM "Payment" WHERE "id"='historic-paid';
  IF EXISTS (SELECT FROM "PaymentSettlement") THEN RAISE EXCEPTION 'Cascade failed'; END IF;
  RAISE NOTICE 'S3-04 settlement migration contract passed';
END $$;
RESET search_path;
DROP SCHEMA rosh_settlement_qa CASCADE;
