CREATE SCHEMA rosh_shipping_info_qa;
SET search_path TO rosh_shipping_info_qa;
CREATE TABLE "ShippingZone" ("id" TEXT PRIMARY KEY, "price" NUMERIC(10,2), "active" BOOLEAN);
CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "total" NUMERIC(10,2), "shippingAddress" TEXT);
INSERT INTO "ShippingZone" VALUES ('historic-zone', 8.50, false);
INSERT INTO "Order" VALUES ('historic-order', 98.20, 'Dirección QA histórica');
