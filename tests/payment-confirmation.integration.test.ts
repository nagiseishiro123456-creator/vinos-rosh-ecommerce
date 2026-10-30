import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, type TestContext } from "node:test";
import { prisma } from "../src/lib/prisma";
import { checkoutFixture } from "./helpers/checkout";
import { reserveManualOrder } from "../src/modules/orders/manual-order-service";
import { reportManualPayment } from "../src/modules/orders/reservation-service";
import { approveManualPaymentRecord } from "../src/modules/payments/review-service";
import { refundPaidOrder } from "../src/modules/orders/refund-service";
import { AdminOperationError } from "../src/modules/admin/transaction-auth";
import { dispatchPaymentConfirmation, listPaymentConfirmations, readPaymentConfirmation } from "../src/modules/notifications/outbox-service";

after(() => prisma.$disconnect());
const environment = { PAYMENT_CONFIRMATION_EMAIL_ENABLED: "true", RESEND_API_KEY: "qa-not-a-key", EMAIL_FROM: "ROSH <qa@example.test>", NEXT_PUBLIC_APP_URL: "https://rosh.example.test" };
async function fixture(t: TestContext, approve = true) {
  const f = await checkoutFixture(t);
  await prisma.user.update({ where: { id: f.user.id }, data: { role: "ADMIN" } });
  const order = await reserveManualOrder(f.user.id, f.input);
  await reportManualPayment(f.user.id, order.number, `QA-${randomUUID()}`);
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
  if (approve) await approveManualPaymentRecord(f.user.id, payment.id);
  const jobs = await listPaymentConfirmations(f.user.id);
  return { ...f, order, payment, job: jobs.find((job) => job.orderId === order.id)! };
}
async function state(id: string) {
  const rows = await prisma.$queryRaw<Array<{ status: string; attempts: number; envelope: unknown; firstAttemptAt: Date | null }>>`SELECT "status", "attempts", "envelope", "firstAttemptAt" FROM "PaymentConfirmationOutbox" WHERE "id"=${id}::uuid`;
  return rows[0];
}
test("approval and duplicate concurrent approval persist exactly one confirmation in the same commit", async (t) => {
  const f = await fixture(t, false);
  await Promise.all([approveManualPaymentRecord(f.user.id, f.payment.id), approveManualPaymentRecord(f.user.id, f.payment.id)]);
  const jobs = (await listPaymentConfirmations(f.user.id)).filter((job) => job.orderId === f.order.id);
  assert.equal(jobs.length, 1); assert.equal(jobs[0].status, "QUEUED"); assert.equal(jobs[0].attempts, 0);
  const view = await readPaymentConfirmation(f.user.id, jobs[0].id);
  assert.equal(view?.payload.total, "98.20"); assert.equal(view?.payload.items[0].quantity, 3);
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});
test("outbox insertion failure rolls back payment, order and audit together", async (t) => {
  const f = await fixture(t, false);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PaymentConfirmationOutbox" ADD CONSTRAINT qa_outbox_enqueue_fail CHECK ("status" <> 'QUEUED') NOT VALID`);
  try { await assert.rejects(approveManualPaymentRecord(f.user.id, f.payment.id)); }
  finally { await prisma.$executeRawUnsafe(`ALTER TABLE "PaymentConfirmationOutbox" DROP CONSTRAINT qa_outbox_enqueue_fail`); }
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "PAYMENT_REVIEW");
  assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: f.payment.id } })).status, "UNDER_REVIEW");
  assert.equal(await prisma.orderEvent.count({ where: { orderId: f.order.id, kind: "PAYMENT_APPROVED" } }), 0);
});
test("disabled sending leaves the queue untouched and performs no provider request", async (t) => {
  const f = await fixture(t);
  const before = await state(f.job.id);
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment: {}, send: async () => assert.fail("No provider request") }), "DISABLED");
  assert.deepEqual(await state(f.job.id), before);
});
test("one active lease blocks concurrent requests and accepted messages cannot be sent again", async (t) => {
  const f = await fixture(t); const providerId = randomUUID(); let calls = 0;
  let release!: (id: string) => void; let entered!: () => void;
  const requested = new Promise<void>((resolve) => { entered = resolve; });
  const send = async () => { calls++; entered(); return new Promise<string>((resolve) => { release = resolve; }); };
  const first = dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send });
  await requested;
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send }), "BUSY");
  release(providerId); assert.equal(await first, "SENT");
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send }), "UNCHANGED");
  assert.equal(calls, 1); assert.equal((await state(f.job.id)).status, "SENT");
});
test("retry preserves the frozen envelope/key and payment; it respects its schedule", async (t) => {
  const f = await fixture(t); const start = new Date(); let clock = start; const calls: Array<{ body: unknown; key: string }> = [];
  const send = async (body: unknown, key: string) => { calls.push({ body, key }); if (calls.length === 1) throw new Error("simulated-timeout"); return randomUUID(); };
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, now: () => clock, send }), "RETRY");
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, now: () => clock, send }), "WAIT");
  clock = new Date(start.getTime() + 120_001);
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, now: () => clock, send }), "SENT");
  assert.deepEqual(calls[0], calls[1]);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "PAID");
  assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 7);
});
test("uncertain operations stop before provider idempotency expiry and after sender configuration changes", async (t) => {
  const f = await fixture(t); const start = new Date(); let calls = 0;
  const send = async () => { calls++; throw new Error("simulated-timeout"); };
  await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, now: () => start, send });
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, now: () => new Date(start.getTime()+23*3600_000), send }), "REVIEW");
  assert.equal(calls, 1);
  const other = await fixture(t); const otherStart = new Date();
  assert.equal(await dispatchPaymentConfirmation(other.user.id, other.job.id, { environment, now: () => otherStart, send }), "RETRY");
  assert.equal(await dispatchPaymentConfirmation(other.user.id, other.job.id, { environment: { ...environment, RESEND_API_KEY: "qa-other-account" }, now: () => new Date(otherStart.getTime()+120_001), send }), "REVIEW");
  assert.equal(calls, 2);
});
test("the fifth failed attempt requires review and cannot trigger a sixth send", async (t) => {
  const f = await fixture(t); const start = new Date(); let calls = 0;
  const send = async () => { calls++; throw new Error("simulated-network-failure"); };
  for (let i = 0; i < 5; i++) {
    const result = await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, now: () => new Date(start.getTime()+i*3600_000), send });
    assert.equal(result, i === 4 ? "REVIEW" : "RETRY");
  }
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send }), "UNCHANGED");
  assert.equal(calls, 5);
});
test("provider acceptance followed by DB failure is recovered with the same idempotency key", async (t) => {
  const f = await fixture(t); const accepted = new Map<string, string>(); let requests = 0;
  const send = async (_body: unknown, key: string) => { requests++; const id = accepted.get(key) ?? randomUUID(); accepted.set(key, id); return id; };
  await prisma.$executeRawUnsafe(`ALTER TABLE "PaymentConfirmationOutbox" ADD CONSTRAINT qa_outbox_accept_fail CHECK ("status" <> 'SENT') NOT VALID`);
  try { await assert.rejects(dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send })); }
  finally { await prisma.$executeRawUnsafe(`ALTER TABLE "PaymentConfirmationOutbox" DROP CONSTRAINT qa_outbox_accept_fail`); }
  assert.equal((await state(f.job.id)).status, "PROCESSING");
  await prisma.$executeRaw`UPDATE "PaymentConfirmationOutbox" SET "lockedUntil"=${new Date(Date.now()-1)} WHERE "id"=${f.job.id}::uuid`;
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send }), "SENT");
  assert.equal(requests, 2); assert.equal(accepted.size, 1);
});
test("revoked administrators cannot list, preview or dispatch another confirmation", async (t) => {
  const f = await fixture(t); await prisma.user.update({ where: { id: f.user.id }, data: { role: "CUSTOMER" } });
  for (const action of [() => listPaymentConfirmations(f.user.id), () => readPaymentConfirmation(f.user.id, f.job.id),
    () => dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send: async () => assert.fail("No provider request") })]) {
    await assert.rejects(action, (e: unknown) => e instanceof AdminOperationError && e.code === "FORBIDDEN");
  }
});
test("refunded orders stop their queued notice; changed recipients require review", async (t) => {
  const f = await fixture(t); await refundPaidOrder({ adminId: f.user.id, orderId: f.order.id, refundReference: "QA-REF" });
  assert.equal(await dispatchPaymentConfirmation(f.user.id, f.job.id, { environment, send: async () => assert.fail("No provider request") }), "CANCELLED");
  const other = await fixture(t); await prisma.user.update({ where: { id: other.user.id }, data: { email: `changed-${randomUUID()}@example.test` } });
  assert.equal(await dispatchPaymentConfirmation(other.user.id, other.job.id, { environment, send: async () => assert.fail("No provider request") }), "REVIEW");
});
