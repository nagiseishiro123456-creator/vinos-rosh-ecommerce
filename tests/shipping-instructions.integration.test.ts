import assert from "node:assert/strict";
import test, { after } from "node:test";
import { prisma } from "../src/lib/prisma";
import { checkoutFixture, confirmationFor } from "./helpers/checkout";
import { automaticInputFor, automaticSandbox } from "./helpers/automatic-checkout";
import { saveShippingZoneRecord, ShippingZoneError } from "../src/modules/shipping/service";
import { loadCheckoutSnapshot } from "../src/modules/checkout/snapshot";
import { reserveManualOrder, ManualOrderError } from "../src/modules/orders/manual-order-service";
import { reserveMicuentawebSandboxOrder } from "../src/modules/orders/automatic-order-service";
import { getPublicShippingCoverage } from "../src/modules/shipping/queries";
import { buildBusinessBackup } from "../src/modules/admin/backup/export";

after(() => prisma.$disconnect());
test("editing delivery information preserves pause, checks versions and allows explicit removal", async (t) => {
  const f = await checkoutFixture(t); await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  const paused = await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { active: false } });
  const input = { id: paused.id, expectedUpdatedAt: paused.updatedAt.toISOString(), department: paused.department, province: paused.province, district: paused.district, price: "8.50", deliveryInstructions: "  Texto QA\r\nSin plazo comercial. " };
  const saved = await saveShippingZoneRecord(f.user.id, input);
  assert.equal(saved.deliveryInstructions, "Texto QA\nSin plazo comercial."); assert.equal(saved.active, false);
  await assert.rejects(saveShippingZoneRecord(f.user.id, input), (e: unknown) => e instanceof ShippingZoneError && e.code === "CONFLICT");
  const legacyInput = { id: input.id, department: input.department, province: input.province, district: input.district, price: input.price };
  const preserved = await saveShippingZoneRecord(f.user.id, { ...legacyInput, expectedUpdatedAt: saved.updatedAt.toISOString() });
  assert.equal(preserved.deliveryInstructions, saved.deliveryInstructions);
  const cleared = await saveShippingZoneRecord(f.user.id, { ...input, expectedUpdatedAt: preserved.updatedAt.toISOString(), deliveryInstructions: "" });
  assert.equal(cleared.deliveryInstructions, null); assert.equal(cleared.active, false);
});
test("new delivery information requires reviewing again before reserving and does not consume stock", async (t) => {
  const f = await checkoutFixture(t);
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { deliveryInstructions: "Información QA nueva" } });
  await assert.rejects(reserveManualOrder(f.user.id, f.input), (e: unknown) => e instanceof ManualOrderError && e.code === "QUOTE_CHANGED");
  assert.equal(await prisma.order.count({ where: { userId: f.user.id } }), 0);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 10);
});
test("manual orders preserve reviewed delivery information after editing or pausing the live zone", async (t) => {
  const f = await checkoutFixture(t); const text = "Texto público sintético QA\nEntrega por coordinar.";
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { deliveryInstructions: text } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const input = { ...f.input, ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) };
  const reserved = await reserveManualOrder(f.user.id, input);
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { deliveryInstructions: "Nueva información QA", active: false } });
  const replay = await reserveManualOrder(f.user.id, input);
  assert.equal(replay.id, reserved.id); assert.equal(replay.replayed, true);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: reserved.id } });
  assert.equal(order.shippingDeliveryInstructions, text); assert.equal(order.total.toFixed(2), "98.20");
  const backup = await buildBusinessBackup();
  assert.equal(backup.orders.find((item) => item.id === order.id)?.shippingDeliveryInstructions, text);
  assert.equal(backup.shippingZones.find((item) => item.id === f.zone.id)?.deliveryInstructions, "Nueva información QA");
});
test("automatic sandbox reservation uses the same authoritative delivery snapshot without contacting the provider", async (t) => {
  const f = await checkoutFixture(t); const text = "Información QA del sandbox";
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { deliveryInstructions: text } });
  const snapshot = await loadCheckoutSnapshot(prisma, f.user.id, f.address.id);
  const automatic = { ...automaticInputFor(f), ...confirmationFor({ ...snapshot, userId: f.user.id }, f.user.id) };
  const order = await reserveMicuentawebSandboxOrder(f.user.id, automatic, automaticSandbox);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).shippingDeliveryInstructions, text);
  assert.equal(await prisma.payment.count({ where: { orderId: order.id } }), 0);
});
test("public coverage exposes delivery information only for active unambiguous zones", async (t) => {
  const f = await checkoutFixture(t); const text = "Texto QA visible";
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { deliveryInstructions: text } });
  assert.equal((await getPublicShippingCoverage()).zones.find((zone) => zone.id === f.zone.id)?.deliveryInstructions, text);
  await prisma.shippingZone.update({ where: { id: f.zone.id }, data: { active: false } });
  assert.equal((await getPublicShippingCoverage()).zones.some((zone) => zone.id === f.zone.id), false);
});
