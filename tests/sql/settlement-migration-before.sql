CREATE SCHEMA rosh_settlement_qa;
SET search_path TO rosh_settlement_qa;
CREATE TABLE "Payment" ("id" TEXT PRIMARY KEY, "amount" NUMERIC(10,2), "status" TEXT);
INSERT INTO "Payment" VALUES ('historic-paid', 98.20, 'PAID'), ('historic-pending', 29.90, 'PENDING');
