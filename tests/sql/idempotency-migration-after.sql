DO $$ BEGIN
  IF (SELECT count(*) FROM "Order" WHERE "checkoutKey" IS NULL AND "checkoutRequestHash" IS NULL) <> 2 THEN
    RAISE EXCEPTION 'Legacy identities must stay null';
  END IF;
END $$;
INSERT INTO "Order" VALUES ('new-a','same-user','ck1:' || repeat('a',64),repeat('b',64));
-- Same key under another user is a separate namespace; application HMAC also binds its owner.
INSERT INTO "Order" VALUES ('new-b','other-user','ck1:' || repeat('a',64),repeat('c',64));
DO $$ BEGIN
  BEGIN
    INSERT INTO "Order" VALUES ('duplicate','same-user','ck1:' || repeat('a',64),repeat('b',64));
    RAISE EXCEPTION 'Duplicate checkout identity was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Order" VALUES ('bad-key','same-user','bad',repeat('b',64));
    RAISE EXCEPTION 'Malformed key was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Order" VALUES ('half-identity','same-user','ck1:' || repeat('d',64),NULL);
    RAISE EXCEPTION 'Half identity was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Order" VALUES ('half-hash','same-user',NULL,repeat('b',64));
    RAISE EXCEPTION 'Hash without key was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "Order" VALUES ('bad-hash','same-user','ck1:' || repeat('e',64),repeat('z',64));
    RAISE EXCEPTION 'Malformed hash was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
SELECT 'S1-04 idempotency migration contract passed' AS result;
ROLLBACK;
