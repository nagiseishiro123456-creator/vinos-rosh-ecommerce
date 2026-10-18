DO $$ BEGIN
  IF (SELECT count(*) FROM "Order" WHERE "stockReservedAt" = "createdAt") <> 5 THEN
    RAISE EXCEPTION 'Expected five legacy reserved states';
  END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "status" IN ('PENDING_PAYMENT','CANCELLED','REFUNDED') AND "stockReservedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Unknown or closed legacy stock must not be inferred';
  END IF;
  IF EXISTS (SELECT 1 FROM "Order" WHERE "reservationExpiresAt" IS NOT NULL OR "stockReleasedAt" IS NOT NULL OR "reservationExpiredAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Legacy orders must not acquire deadlines or release timestamps';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "Payment" WHERE "id" = 'reported' AND "reportedAt" = "createdAt") OR
     EXISTS (SELECT 1 FROM "Payment" WHERE "id" = 'unreported' AND "reportedAt" IS NOT NULL) THEN
    RAISE EXCEPTION 'Legacy reported timestamp backfill mismatch';
  END IF;
END $$;
SELECT 'S1-03 legacy migration contract passed' AS result;
ROLLBACK;
