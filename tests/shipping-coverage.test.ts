import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLocation, resolveShippingCoverage, unambiguousShippingZones } from "../src/modules/shipping/coverage";
import { shippingZoneInputSchema } from "../src/modules/shipping/contract";
import { deliveryAddressSchema } from "../src/modules/addresses/contract";
const place = { department: "Lima", province: "Lima", district: "San Martín de Porres" };
test("shipping identity treats case, accents and repeated spaces consistently, including the province", () => {
  const zone = { id: "zone", ...place };
  assert.equal(normalizeLocation("  SAN   MARTÍN "), "san martin");
  assert.equal(resolveShippingCoverage({ department: "lima", province: " LIMA ", district: "san martin  de porres" }, [zone]).kind, "available");
  assert.equal(resolveShippingCoverage({ ...place, province: "Huaral" }, [zone]).kind, "unavailable");
});
test("ambiguous active rates are never selected, and paused rates are excluded", () => {
  const a = { id: "a", ...place }; const b = { id: "b", ...place, district: "SAN MARTIN DE PORRES" };
  assert.equal(resolveShippingCoverage(place, [a,b]).kind, "ambiguous");
  assert.deepEqual(unambiguousShippingZones([a,b]), []);
  assert.equal(resolveShippingCoverage(place, [a,{ ...b, active: false }]).kind, "available");
});
test("shipping tariff inputs preserve exact zero and cents and reject invalid or forged amounts", () => {
  const input = { ...place, price: "8.5" };
  assert.equal(shippingZoneInputSchema.parse(input).price, "8.50");
  assert.equal(shippingZoneInputSchema.parse({ ...input, price: "0" }).price, "0.00");
  for (const price of ["-1", "10000.01", "NaN", "1e2", "8,50", "0.001"]) assert.equal(shippingZoneInputSchema.safeParse({ ...input, price }).success, false);
  assert.equal(shippingZoneInputSchema.safeParse({ ...input, active: true }).success, false);
});
test("delivery phone feedback rejects eight digits and normalizes the Peru country prefix", () => {
  const input = { label: "Casa", recipient: "QA", phone: "+51 987-654-321", shippingZoneId: "cm000000000000000000000000", addressLine1: "Dirección QA", reference: "", isDefault: false };
  assert.equal(deliveryAddressSchema.parse(input).phone, "987654321");
  const invalid = deliveryAddressSchema.safeParse({ ...input, phone: "98765432" });
  assert.equal(invalid.success, false); if (!invalid.success) assert.equal(invalid.error.issues[0].path[0], "phone");
});
