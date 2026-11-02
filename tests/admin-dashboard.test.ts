import assert from "node:assert/strict";
import test from "node:test";
import { completeDashboardDays, dashboardWindow, peruDay } from "../src/modules/admin/dashboard/period";
import { currentAdminItem } from "../src/modules/admin/navigation";

test("dashboard calendar uses complete Peru days across a UTC date boundary", () => {
  const now = new Date("2026-11-02T04:59:59Z"), window = dashboardWindow("7", now);
  assert.equal(peruDay(now), "2026-11-01");
  assert.equal(window.start.toISOString(), "2026-10-26T05:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-11-02T05:00:00.000Z");
  assert.equal(window.dates.length, 7); assert.equal(window.dates.at(-1), "2026-11-01");
  assert.equal(peruDay(new Date("2026-11-02T05:00:00Z")), "2026-11-02");
});
test("dashboard period accepts only its three supported ranges", () => {
  for (const value of [undefined, "0", "-1", "999999", "7;SELECT", ["7", "90"]]) assert.equal(dashboardWindow(value).days, 30);
  assert.equal(dashboardWindow("90").dates.length, 90); assert.equal(dashboardWindow("30").dates.length, 30);
});
test("daily chart fills gaps with zero rather than inventing activity", () => {
  assert.deepEqual(completeDashboardDays(["2026-11-01", "2026-11-02"], [{ day: "2026-11-02", orders: 2, sales: "30.03" }]), [
    { day: "2026-11-01", orders: 0, sales: "0.00" }, { day: "2026-11-02", orders: 2, sales: "30.03" },
  ]);
});
test("admin navigation resolves detail pages and keeps legacy catalogs outside the menu", () => {
  assert.equal(currentAdminItem("/admin/notificaciones/configuracion")?.label, "Confirmaciones");
  assert.equal(currentAdminItem("/admin/pedidos/qa-id")?.label, "Pedidos");
  assert.equal(currentAdminItem("/admin/productos"), undefined);
  assert.equal(currentAdminItem("/admin/categorias"), undefined);
  assert.equal(currentAdminItem("/admin")?.label, "Resumen");
});
