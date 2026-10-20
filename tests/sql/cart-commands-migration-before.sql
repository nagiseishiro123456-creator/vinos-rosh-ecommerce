BEGIN;
CREATE SCHEMA rosh_cart_commands_migration_qa;
SET LOCAL search_path TO rosh_cart_commands_migration_qa;
CREATE TABLE "User" ("id" TEXT PRIMARY KEY);
CREATE TABLE "Product" ("id" TEXT PRIMARY KEY, "stock" INTEGER NOT NULL);
CREATE TABLE "Cart" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE);
CREATE TABLE "CartItem" ("id" TEXT PRIMARY KEY, "cartId" TEXT NOT NULL REFERENCES "Cart"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id"), "quantity" INTEGER NOT NULL);
CREATE TABLE "CartImport" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "importId" VARCHAR(80) NOT NULL, "requestHash" CHAR(64) NOT NULL, "result" JSONB NOT NULL,
  UNIQUE ("userId", "importId"));
CREATE TABLE "Order" ("id" TEXT PRIMARY KEY);
CREATE TABLE "Payment" ("id" TEXT PRIMARY KEY);
INSERT INTO "User" VALUES ('legacy-user'), ('other-user');
INSERT INTO "Product" VALUES ('legacy-product', 10);
INSERT INTO "Cart" VALUES ('legacy-cart', 'legacy-user');
INSERT INTO "CartItem" VALUES ('legacy-item', 'legacy-cart', 'legacy-product', 3);
INSERT INTO "CartImport" VALUES ('legacy-import', 'legacy-user', 'g2_' || repeat('a',32), repeat('b',64), '{"lines":[]}');
INSERT INTO "Order" VALUES ('legacy-order');
INSERT INTO "Payment" VALUES ('legacy-payment');
