import assert from "node:assert/strict";
import test, { after } from "node:test";
import { prisma } from "../src/lib/prisma";
import { checkoutFixture } from "./helpers/checkout";
import { CheckoutUnavailableError, loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { saveShippingZoneRecord, setShippingZoneActive, ShippingZoneError } from "../src/modules/shipping/service";
import { getPublicShippingCoverage } from "../src/modules/shipping/queries";
import { AdminOperationError } from "../src/modules/admin/transaction-auth";

after(() => prisma.$disconnect());
test("checkout accepts the same configured district regardless of letter case", async (t) => {
  const f = await checkoutFixture(t);
  await prisma.address.update({ where: { id: f.address.id }, data: { district: f.zone.district.toUpperCase(), department: "qa", province: " qa " } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  assert.equal(snapshot.shippingZone.id, f.zone.id);
  assert.equal(snapshot.amounts.shippingAmount.toFixed(2), "8.50");
});
test("saving a paused zone tariff preserves its activation and stale forms cannot reactivate it", async (t) => {
  const f = await checkoutFixture(t); await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  const paused = await setShippingZoneActive(f.user.id, f.zone.id, true, f.zone.updatedAt.toISOString());
  const saved = await saveShippingZoneRecord(f.user.id, { id: paused.id, expectedUpdatedAt: paused.updatedAt.toISOString(), department: paused.department, province: paused.province, district: paused.district, price: "9.50" });
  assert.equal(saved.active, false); assert.equal(saved.price.toFixed(2), "9.50");
  await assert.rejects(setShippingZoneActive(f.user.id, f.zone.id, true, f.zone.updatedAt.toISOString()), (error: unknown) => error instanceof ShippingZoneError && error.code === "CONFLICT");
  assert.equal((await prisma.shippingZone.findUniqueOrThrow({ where: { id: f.zone.id } })).active, false);
});
test("concurrent tariff creation rejects a normalized duplicate including a paused zone", async (t) => {
  const f = await checkoutFixture(t); await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  const input = { department: "QA", province: "QA", district: f.zone.district + " new", price: "0.00" };
  t.after(() => prisma.shippingZone.deleteMany({ where: { district: input.district } }));
  const results = await Promise.allSettled([saveShippingZoneRecord(f.user.id,input), saveShippingZoneRecord(f.user.id,{ ...input, district: input.district.toUpperCase() })]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof ShippingZoneError && rejected.reason.code === "DUPLICATE");
  const created = results.find((result) => result.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof saveShippingZoneRecord>>>;
  t.after(() => prisma.shippingZone.deleteMany({ where: { id: created.value.id } }));
  await setShippingZoneActive(f.user.id, created.value.id, true, created.value.updatedAt.toISOString());
  await assert.rejects(saveShippingZoneRecord(f.user.id,input), (error: unknown) => error instanceof ShippingZoneError && error.code === "DUPLICATE");
});
test("legacy ambiguous rates block checkout and public coverage until an operator pauses the duplicate", async (t) => {
  const f = await checkoutFixture(t); await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  const duplicate = await prisma.shippingZone.create({ data: { department: " qa ", province: "QA", district: f.zone.district.toUpperCase(), price: "1.00" } });
  t.after(() => prisma.shippingZone.deleteMany({ where: { id: duplicate.id } }));
  await assert.rejects(loadCheckoutSnapshot(prisma,f.user.id,f.address.id), (error: unknown) => error instanceof CheckoutUnavailableError && error.code === "UNSUPPORTED_ZONE");
  const publicData = await getPublicShippingCoverage();
  assert.equal(publicData.hasReview,true); assert.equal(publicData.zones.some((zone) => zone.id === f.zone.id || zone.id === duplicate.id),false);
  await setShippingZoneActive(f.user.id,duplicate.id,true,duplicate.updatedAt.toISOString());
  assert.equal((await loadCheckoutSnapshot(prisma,f.user.id,f.address.id)).amounts.shippingAmount.toFixed(2),"8.50");
});
test("revoked admins cannot change shipping prices or availability", async (t) => {
  const f = await checkoutFixture(t);
  await assert.rejects(saveShippingZoneRecord(f.user.id,{ id:f.zone.id,expectedUpdatedAt:f.zone.updatedAt.toISOString(),department:f.zone.department,province:f.zone.province,district:f.zone.district,price:"0" }), (error: unknown) => error instanceof AdminOperationError && error.code === "FORBIDDEN");
  await assert.rejects(setShippingZoneActive(f.user.id,f.zone.id,true,f.zone.updatedAt.toISOString()), (error: unknown) => error instanceof AdminOperationError && error.code === "FORBIDDEN");
  assert.equal((await prisma.shippingZone.findUniqueOrThrow({ where:{ id:f.zone.id } })).price.toFixed(2),"8.50");
});
test("stale tariff edits and location changes cannot overwrite the current zone", async (t) => {
  const f = await checkoutFixture(t); await prisma.user.update({ where: { id:f.user.id },data:{ role:"ADMIN" } });
  const input = { id:f.zone.id,expectedUpdatedAt:f.zone.updatedAt.toISOString(),department:f.zone.department,province:f.zone.province,district:f.zone.district,price:"9.50" };
  const saved = await saveShippingZoneRecord(f.user.id,input);
  await assert.rejects(saveShippingZoneRecord(f.user.id,{ ...input,price:"0.00" }), (error: unknown) => error instanceof ShippingZoneError && error.code === "CONFLICT");
  await assert.rejects(saveShippingZoneRecord(f.user.id,{ ...input,expectedUpdatedAt:saved.updatedAt.toISOString(),district:"Another location" }), (error: unknown) => error instanceof ShippingZoneError && error.code === "IDENTITY_CHANGED");
});
