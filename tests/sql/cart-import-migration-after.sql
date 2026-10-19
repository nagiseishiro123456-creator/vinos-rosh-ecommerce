DO $$ BEGIN
  IF (SELECT count(*) FROM "CartImport") <> 0 THEN RAISE EXCEPTION 'Historical data must not create import receipts'; END IF;
  IF (SELECT quantity FROM "Cart" WHERE id = 'legacy-cart') <> 3 OR
     (SELECT stock FROM "Product" WHERE id = 'legacy-product') <> 10 OR
     (SELECT count(*) FROM "Order") <> 1 OR (SELECT count(*) FROM "Payment") <> 1 OR
     (SELECT count(*) FROM "User") <> 2 THEN RAISE EXCEPTION 'Historical commerce data changed'; END IF;
END $$;
INSERT INTO "CartImport" (id, "userId", "importId", "requestHash", result)
VALUES ('receipt-a', 'legacy-user', 'g2_' || repeat('a', 32), repeat('b', 64), '{"lines":[],"changes":[]}');
INSERT INTO "CartImport" (id, "userId", "importId", "requestHash", result)
VALUES ('receipt-b', 'other-user', 'g2_' || repeat('a', 32), repeat('c', 64), '{"lines":[],"changes":[]}');
DO $$ BEGIN
  BEGIN
    INSERT INTO "CartImport" (id, "userId", "importId", "requestHash", result)
    VALUES ('duplicate', 'legacy-user', 'g2_' || repeat('a', 32), repeat('b', 64), '{}');
    RAISE EXCEPTION 'Duplicate user/import identity accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "CartImport" (id, "userId", "importId", "requestHash", result)
    VALUES ('unknown-user', 'missing-user', 'g2_' || repeat('d', 32), repeat('e', 64), '{}');
    RAISE EXCEPTION 'Missing user accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;
DELETE FROM "User" WHERE id = 'other-user';
DO $$ BEGIN
  IF (SELECT count(*) FROM "CartImport") <> 1 THEN RAISE EXCEPTION 'User cascade did not remove only its receipt'; END IF;
END $$;
SELECT 'S2-04 cart import migration contract passed' AS result;
ROLLBACK;
