DO $$
BEGIN
  IF (SELECT "deliveryInstructions" FROM "ShippingZone" WHERE "id"='historic-zone') IS NOT NULL
    OR (SELECT "shippingDeliveryInstructions" FROM "Order" WHERE "id"='historic-order') IS NOT NULL THEN
    RAISE EXCEPTION 'No historical delivery conditions may be invented';
  END IF;
  IF (SELECT "price" FROM "ShippingZone" WHERE "id"='historic-zone') <> 8.50
    OR (SELECT "active" FROM "ShippingZone" WHERE "id"='historic-zone')
    OR (SELECT "total" FROM "Order" WHERE "id"='historic-order') <> 98.20
    OR (SELECT "shippingAddress" FROM "Order" WHERE "id"='historic-order') <> 'Dirección QA histórica' THEN
    RAISE EXCEPTION 'Existing data changed';
  END IF;
  UPDATE "ShippingZone" SET "deliveryInstructions"='Texto QA';
  UPDATE "Order" SET "shippingDeliveryInstructions"=(SELECT "deliveryInstructions" FROM "ShippingZone" WHERE "id"='historic-zone');
  UPDATE "ShippingZone" SET "deliveryInstructions"='Otro texto QA';
  IF (SELECT "shippingDeliveryInstructions" FROM "Order" WHERE "id"='historic-order') <> 'Texto QA' THEN
    RAISE EXCEPTION 'Order snapshot changed with the zone';
  END IF;
  BEGIN
    UPDATE "ShippingZone" SET "deliveryInstructions"=repeat('a',601);
    RAISE EXCEPTION 'Oversized information was accepted';
  EXCEPTION WHEN string_data_right_truncation THEN NULL; END;
  RAISE NOTICE 'S4-04 shipping information migration contract passed';
END $$;
RESET search_path;
DROP SCHEMA rosh_shipping_info_qa CASCADE;
