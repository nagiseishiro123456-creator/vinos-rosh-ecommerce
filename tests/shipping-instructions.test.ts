import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import { deliveryInstructionsSchema } from "../src/modules/shipping/contract";
import { createCheckoutQuote, verifyCheckoutQuote } from "../src/modules/checkout/quote";

const secret = "qa-only-shipping-instructions-signing-key";
function quoteInput() {
  return { userId: "qa", address: { id: "a", recipient: "QA", phone: "987654321", department: "QA", province: "QA", district: "QA", addressLine1: "Dirección sintética", reference: null },
    cart: { id: "c", items: [{ id: "i", quantity: 1, product: { id: "p", name: "QA", sku: null, price: "10.00" } }] }, shippingZone: { id: "z", price: "8.50" } };
}
test("delivery information accepts empty text and normalizes lines with a bounded public text", () => {
  assert.equal(deliveryInstructionsSchema.parse("  Texto QA\r\nSegunda línea.  "), "Texto QA\nSegunda línea.");
  assert.equal(deliveryInstructionsSchema.parse("  "), "");
  assert.equal(deliveryInstructionsSchema.safeParse("a".repeat(601)).success, false);
  assert.equal(deliveryInstructionsSchema.safeParse("QA\u0000oculto").success, false);
});
test("quotes without delivery information keep the original v1 signature", () => {
  const input = quoteInput();
  const legacyPayload = { version: 1, currency: "PEN", userId: "qa", cartId: "c",
    delivery: ["a", "QA", "987654321", "QA", "QA", "QA", "Dirección sintética", null],
    shipping: ["z", "8.50"], items: [["i", "p", "QA", null, 1, "10.00"]] };
  const expected = "v1:" + createHmac("sha256", secret).update("rosh-checkout-quote:v1\n").update(JSON.stringify(legacyPayload)).digest("hex");
  assert.equal(createCheckoutQuote(input, secret), expected);
  assert.equal(createCheckoutQuote({ ...input, shippingZone: { ...input.shippingZone, deliveryInstructions: null } }, secret), expected);
});
test("changing or removing delivery information invalidates the reviewed quote", () => {
  const input = quoteInput(); const original = { ...input, shippingZone: { ...input.shippingZone, deliveryInstructions: "Texto acordado QA" } };
  const quote = createCheckoutQuote(original, secret);
  assert.equal(verifyCheckoutQuote(quote, original, secret), true);
  assert.equal(verifyCheckoutQuote(quote, { ...input, shippingZone: { ...input.shippingZone, deliveryInstructions: "Otro texto QA" } }, secret), false);
  assert.equal(verifyCheckoutQuote(quote, input, secret), false);
});
