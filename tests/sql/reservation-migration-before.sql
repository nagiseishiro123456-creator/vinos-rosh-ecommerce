-- Minimal legacy fixtures in an isolated schema; run the ACTUAL migration next.
BEGIN;
CREATE SCHEMA rosh_reservation_migration_qa;
SET LOCAL search_path TO rosh_reservation_migration_qa;
CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "Payment" ("id" TEXT PRIMARY KEY, "operationCode" TEXT, "createdAt" TIMESTAMP(3) NOT NULL);
INSERT INTO "Order" SELECT state, state, '2026-10-01T10:00:00Z'::timestamp
FROM unnest(ARRAY['PENDING_PAYMENT','PAYMENT_REVIEW','PAID','PREPARING','SHIPPED','DELIVERED','CANCELLED','REFUNDED']) AS state;
INSERT INTO "Payment" VALUES ('reported','QA-LEGACY','2026-10-01T10:00:00Z'), ('unreported',NULL,'2026-10-01T10:00:00Z');
