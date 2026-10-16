DO $$ BEGIN
  IF (SELECT count(*) FROM "OrderEvent") <> 0 OR (SELECT count(*) FROM "PaymentReconciliation") <> 0 THEN
    RAISE EXCEPTION 'Historical events must not be fabricated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "Order" WHERE "id"='legacy' AND "status"='CANCELLED' AND "total"=98.20) OR
    NOT EXISTS (SELECT 1 FROM "Payment" WHERE "id"='legacy-payment' AND "status"='CANCELLED' AND "amount"=98.20) THEN
    RAISE EXCEPTION 'Existing money/state must not change';
  END IF;
  BEGIN
    INSERT INTO "PaymentReconciliation" ("id","paymentId","receivedAmount") VALUES ('bad','legacy-payment',0);
    RAISE EXCEPTION 'Nonpositive amount accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO "PaymentReconciliation" ("id","paymentId","receivedAmount","refundedAt") VALUES ('half','legacy-payment',1,now());
    RAISE EXCEPTION 'Refund without reference accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO "PaymentReconciliation" ("id","paymentId","receivedAmount") VALUES ('valid','legacy-payment',100.00);
DO $$ BEGIN
  BEGIN
    INSERT INTO "PaymentReconciliation" ("id","paymentId","receivedAmount") VALUES ('duplicate','legacy-payment',100.00);
    RAISE EXCEPTION 'Duplicate reconciliation accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
SELECT 'S1-05 reconciliation migration contract passed' AS result;
ROLLBACK;
