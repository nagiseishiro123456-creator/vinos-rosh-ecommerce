DO $$ BEGIN
  IF (SELECT count(*) FROM "CartMutation") <> 0 THEN RAISE EXCEPTION 'Legacy carts created command receipts'; END IF;
  IF (SELECT count(*) FROM "Cart") <> 1 OR
     (SELECT count(*) FROM "Cart" WHERE id = 'legacy-cart' AND "userId" = 'legacy-user' AND revision = 0) <> 1 OR
     (SELECT count(*) FROM "CartItem") <> 1 OR
     (SELECT count(*) FROM "CartItem" WHERE id = 'legacy-item' AND "cartId" = 'legacy-cart' AND "productId" = 'legacy-product' AND quantity = 3) <> 1 OR
     (SELECT count(*) FROM "Product" WHERE id = 'legacy-product' AND stock = 10) <> 1 OR
     (SELECT count(*) FROM "CartImport" WHERE id = 'legacy-import' AND "userId" = 'legacy-user') <> 1 OR
     (SELECT count(*) FROM "Order") <> 1 OR (SELECT count(*) FROM "Payment") <> 1 OR
     (SELECT count(*) FROM "User") <> 2 THEN RAISE EXCEPTION 'Legacy commerce data or revision changed'; END IF;
  BEGIN
    UPDATE "Cart" SET revision = -1 WHERE id = 'legacy-cart';
    RAISE EXCEPTION 'Negative revision accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
INSERT INTO "CartMutation" (id, "userId", "operationId", "requestHash", result)
VALUES ('receipt-a', 'legacy-user', '11111111-1111-4111-8111-111111111111', repeat('a',64), '{"quantity":4}'),
       ('receipt-b', 'other-user', '11111111-1111-4111-8111-111111111111', repeat('b',64), '{"quantity":1}');
DO $$ BEGIN
  BEGIN
    INSERT INTO "CartMutation" (id, "userId", "operationId", "requestHash", result)
    VALUES ('duplicate', 'legacy-user', '11111111-1111-4111-8111-111111111111', repeat('a',64), '{}');
    RAISE EXCEPTION 'Duplicate user/operation accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO "CartMutation" (id, "userId", "operationId", "requestHash", result)
    VALUES ('unknown-user', 'missing-user', '22222222-2222-4222-8222-222222222222', repeat('a',64), '{}');
    RAISE EXCEPTION 'Unknown owner accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
END $$;
DELETE FROM "User" WHERE id = 'other-user';
DO $$ BEGIN
  IF (SELECT count(*) FROM "CartMutation") <> 1 OR
     (SELECT count(*) FROM "CartMutation" WHERE id = 'receipt-a' AND "userId" = 'legacy-user') <> 1 OR
     (SELECT count(*) FROM "Cart" WHERE id = 'legacy-cart' AND revision = 0) <> 1 OR
     (SELECT count(*) FROM "CartImport") <> 1 THEN RAISE EXCEPTION 'Owner cascade or preserved state failed'; END IF;
END $$;
SELECT 'S2-05 cart commands migration contract passed' AS result;
ROLLBACK;
