import assert from "node:assert/strict";
import test from "node:test";

import { createCheckoutKey, verifyCheckoutKey, checkoutRequestHash } from "../src/modules/checkout/idempotency";
import { manualOrderSchema } from "../src/modules/orders/manual-order-input";

const secret = "idempotency-test-only-key-at-least-32-chars";
const quote = "v1:" + "1".repeat(64);
function payload(overrides = {}) {
  return manualOrderSchema.parse({ addressId: "cmockaddress123456789012345", checkoutQuote: quote,
    checkoutKey: createCheckoutKey("user-a", quote, secret), provider: "TRANSFER_MANUAL", receiptType: "BOLETA", ...overrides });
}

test("checkout identity is stable across views and bound to user, quote and signing domain", () => {
  const key = createCheckoutKey("user-a", quote, secret);
  assert.equal(createCheckoutKey("user-a", quote, secret), key);
  assert.equal(verifyCheckoutKey(key, "user-a", quote, secret), true);
  assert.equal(verifyCheckoutKey(key, "user-b", quote, secret), false);
  assert.equal(verifyCheckoutKey(key, "user-a", "v1:" + "2".repeat(64), secret), false);
  assert.equal(verifyCheckoutKey(key, "user-a", quote, secret + "rotated"), false);
  assert.notEqual(key.slice(4), quote.slice(3));
});

test("malformed identities and missing signing secrets fail closed", () => {
  assert.equal(verifyCheckoutKey("bad", "user-a", quote, secret), false);
  assert.equal(verifyCheckoutKey("ck1:" + "0".repeat(64), "user-a", quote, secret), false);
  assert.equal(verifyCheckoutKey("ck1:" + "0".repeat(64), "user-a", "bad", secret), false);
  assert.throws(() => createCheckoutKey("user-a", quote, ""), /SIGNING_SECRET_REQUIRED/);
  assert.throws(() => payload({ checkoutKey: undefined }));
  assert.throws(() => payload({ receiptType: "FACTURA" }));
});

test("request fingerprint normalizes optional whitespace and ignores client amounts and unknown fields", () => {
  const original = payload();
  const normalized = payload({ customerNotes: "  ", documentNumber: "", businessName: " ", taxAddress: "", total: "0.01", shippingAmount: "0.00", extra: "ignored" });
  assert.equal(checkoutRequestHash("user-a", normalized), checkoutRequestHash("user-a", original));
  assert.equal(checkoutRequestHash("user-a", payload({ customerNotes: " entrega por la tarde " })), checkoutRequestHash("user-a", payload({ customerNotes: "entrega por la tarde" })));
});

test("fingerprint binds the full accepted request including every invoice field", () => {
  const invoice = payload({ receiptType: "FACTURA", documentNumber: "20123456789", businessName: "QA", taxAddress: "Dirección QA" });
  const hash = checkoutRequestHash("user-a", invoice);
  for (const changes of [
    { checkoutQuote: "v1:" + "2".repeat(64) }, { addressId: "canotheraddress1234567890" },
    { provider: "YAPE_MANUAL" }, { receiptType: "BOLETA" },
    { documentNumber: "20987654321" }, { businessName: "Otra QA" },
    { taxAddress: "Otra dirección" }, { customerNotes: "Otra entrega" },
  ]) assert.notEqual(checkoutRequestHash("user-a", payload({ ...invoice, ...changes })), hash);
  assert.notEqual(checkoutRequestHash("user-b", invoice), hash);
});
