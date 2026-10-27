CREATE SCHEMA rosh_confirmation_outbox_qa;
SET search_path TO rosh_confirmation_outbox_qa;
CREATE TABLE "Order" (id TEXT PRIMARY KEY, status TEXT, total NUMERIC(10,2));
CREATE TABLE "Product" (id TEXT PRIMARY KEY, stock INTEGER);
INSERT INTO "Order" VALUES ('historical-order', 'PAID', 98.20);
INSERT INTO "Product" VALUES ('historical-product', 7);
