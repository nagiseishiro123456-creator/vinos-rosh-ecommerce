BEGIN;
CREATE SCHEMA rosh_reconciliation_migration_qa;
SET LOCAL search_path TO rosh_reconciliation_migration_qa;
CREATE TABLE "User" ("id" TEXT PRIMARY KEY);
CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "status" TEXT, "total" NUMERIC(10,2));
CREATE TABLE "Payment" ("id" TEXT PRIMARY KEY, "orderId" TEXT, "status" TEXT, "amount" NUMERIC(10,2));
INSERT INTO "User" VALUES ('admin');
INSERT INTO "Order" VALUES ('legacy','CANCELLED',98.20);
INSERT INTO "Payment" VALUES ('legacy-payment','legacy','CANCELLED',98.20);
