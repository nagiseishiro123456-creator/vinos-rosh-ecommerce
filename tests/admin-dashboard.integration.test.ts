import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { readAdminDashboard } from "../src/modules/admin/dashboard/queries";

test("dashboard counts confirmed orders once, keeps cents, excludes refunds and respects Peru day cutoffs", async t => {
  if (process.env.SMOKE_TEST_DATA !== "true") return t.skip("Isolated CI database required");
  const user = await prisma.user.create({ data: { email: `dashboard-${randomUUID()}@example.test`, firstName: "QA", lastName: "Dashboard", passwordHash: "not-a-login", createdAt: new Date("2090-11-01T12:00:00Z") } });
  try {
    const base = { userId: user.id, subtotal: "10.01", shippingAmount: "0.00", receiptType: "BOLETA" as const, shippingRecipient: "QA", shippingPhone: "999999999", shippingDepartment: "QA", shippingProvince: "QA", shippingDistrict: "QA", shippingAddress: "Synthetic dashboard fixture — no delivery" };
    for (const [status, date, amount] of [["PAID", "2090-10-26T05:00:00Z", "10.01"], ["DELIVERED", "2090-11-02T04:00:00Z", "20.02"], ["PAID", "2090-10-26T04:59:59Z", "99.99"], ["REFUNDED", "2090-11-01T10:00:00Z", "40.00"], ["PAYMENT_REVIEW", "2090-11-01T11:00:00Z", "50.00"]] as const) {
      await prisma.order.create({ data: { ...base, number: `QA-DASH-${randomUUID()}`, status, total: amount, paidAt: status === "PAYMENT_REVIEW" ? null : new Date(date), createdAt: new Date(date) } });
    }
    const data = await readAdminDashboard("7", new Date("2090-11-02T04:30:00Z"));
    assert.equal(data.sales, "30.03"); assert.equal(data.confirmedOrders, 2);
    assert.equal(data.orders, 4); assert.equal(data.customers, 1);
    assert.equal(data.series[0].day, "2090-10-26"); assert.equal(data.series[0].sales, "10.01");
    assert.equal(data.series.at(-1)?.day, "2090-11-01"); assert.equal(data.series.at(-1)?.sales, "20.02");
    assert.equal(data.series.filter(day => day.orders === 0).length, 5);
    assert(data.latest.some(order => order.number.startsWith("QA-DASH-")));
  } finally { await prisma.order.deleteMany({ where: { userId: user.id } }); await prisma.user.delete({ where: { id: user.id } }); }
});
