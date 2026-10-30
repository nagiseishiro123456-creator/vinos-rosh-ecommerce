import assert from "node:assert/strict";
import test from "node:test";
import { automaticOrderSchema, automaticOrderRequestHash } from "../src/modules/orders/automatic-order-input";
import { manualOrderSchema } from "../src/modules/orders/manual-order-input";
import { checkoutRequestHash } from "../src/modules/checkout/idempotency";
import { reserveMicuentawebSandboxOrder } from "../src/modules/orders/automatic-order-service";

const userId = "cm123456789012345678901234";
const raw = { expectedUserId: userId, addressId: "cm223456789012345678901234", checkoutQuote: "v1:" + "1".repeat(64),
  checkoutKey: "ck1:" + "2".repeat(64), receiptType: "BOLETA" };

test("automatic reservation input normalizes optional fields and preserves a stable fingerprint", () => {
  const a = automaticOrderSchema.parse(raw);
  const b = automaticOrderSchema.parse({ ...raw, documentNumber: "", businessName: " ", taxAddress: "", customerNotes: "  " });
  assert.equal(automaticOrderRequestHash(userId, a), automaticOrderRequestHash(userId, b));
});
test("automatic reservation input rejects browser totals, method switches and unexpected data", () => {
  for (const extra of [{ total: "0.01" }, { currency: "USD" }, { provider: "TRANSFER_MANUAL" }, { kind: "manual" }, { formToken: "fake" }]) {
    assert.equal(automaticOrderSchema.safeParse({ ...raw, ...extra }).success, false);
  }
});
test("automatic reservation requires the same invoice fields as manual checkout", () => {
  assert.equal(automaticOrderSchema.safeParse({ ...raw, receiptType: "FACTURA" }).success, false);
  const invoice = { ...raw, receiptType: "FACTURA", documentNumber: "20123456789", businessName: " QA ", taxAddress: " Dirección QA " };
  assert.equal(automaticOrderSchema.parse(invoice).businessName, "QA");
  assert.equal(manualOrderSchema.parse({ ...invoice, provider: "TRANSFER_MANUAL" }).taxAddress, "Dirección QA");
});
test("automatic reservation fingerprint binds account, quote, address and fiscal fields and has a separate method domain", () => {
  const input = automaticOrderSchema.parse({ ...raw, receiptType: "FACTURA", documentNumber: "20123456789", businessName: "QA", taxAddress: "QA" });
  const original = automaticOrderRequestHash(userId, input);
  for (const patch of [{ addressId: "cm323456789012345678901234" }, { checkoutQuote: "v1:" + "3".repeat(64) },
    { documentNumber: "20987654321" }, { businessName: "Other" }, { taxAddress: "Other" }, { customerNotes: "Other" }]) {
    assert.notEqual(automaticOrderRequestHash(userId, automaticOrderSchema.parse({ ...input, ...patch })), original);
  }
  assert.notEqual(automaticOrderRequestHash("other-user", input), original);
  assert.notEqual(checkoutRequestHash(userId, manualOrderSchema.parse({ ...input, provider: "TRANSFER_MANUAL" })), original);
});
test("automatic reservation refuses a mismatched current account before database access", () => {
  assert.throws(() => reserveMicuentawebSandboxOrder("different-user", automaticOrderSchema.parse(raw), {}), /INVALID_CONFIRMATION/);
});
