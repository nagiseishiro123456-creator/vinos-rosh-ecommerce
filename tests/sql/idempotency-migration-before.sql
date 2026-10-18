BEGIN;
CREATE SCHEMA rosh_idempotency_migration_qa;
SET LOCAL search_path TO rosh_idempotency_migration_qa;
CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL);
INSERT INTO "Order" VALUES ('legacy-a','same-user'), ('legacy-b','same-user');
