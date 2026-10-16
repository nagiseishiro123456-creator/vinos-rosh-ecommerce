import assert from "node:assert/strict";
import test from "node:test";

import { createCheckoutQuote, verifyCheckoutQuote } from "../src/modules/checkout/quote";

const secret = "test-only-checkout-key-with-32-characters";
function input() {
  return {
    userId: "customer-a",
    address: { id: "address-a", recipient: "QA", phone: "000000000", department: "QA", province: "QA", district: "QA", addressLine1: "Dirección ficticia", reference: null },
    cart: { id: "cart-a", items: [
      { id: "item-a", quantity: 1, product: { id: "a", name: "A", sku: null, price: "10.00" } },
      { id: "item-b", quantity: 1, product: { id: "b", name: "B", sku: null, price: "20.00" } },
    ] },
    shippingZone: { id: "zone-a", price: "8.50" },
  };
}

test("a quote is canonical across item order and decimal presentation", () => {
  const first = input(); const token = createCheckoutQuote(first, secret);
  first.cart.items.reverse(); first.shippingZone.price = "8.5";
  assert.equal(verifyCheckoutQuote(token, first, secret), true);
});

test("price changes cannot hide behind an identical aggregate total", () => {
  const changed = input(); const token = createCheckoutQuote(changed, secret);
  changed.cart.items[0].product.price = "11.00";
  changed.cart.items[1].product.price = "19.00";
  assert.equal(verifyCheckoutQuote(token, changed, secret), false);
});

test("quotes bind user, cart, quantity, shipping and delivery address", () => {
  const token = createCheckoutQuote(input(), secret);
  const variants = [
    () => { const v = input(); v.userId = "another-user"; return v; },
    () => { const v = input(); v.cart.id = "another-cart"; return v; },
    () => { const v = input(); v.cart.items[0].quantity = 2; return v; },
    () => { const v = input(); v.shippingZone.price = "9.00"; return v; },
    () => { const v = input(); v.address.addressLine1 = "Otra dirección"; return v; },
  ];
  for (const variant of variants) assert.equal(verifyCheckoutQuote(token, variant(), secret), false);
});

test("tampered tokens, wrong keys and missing signing keys fail closed", () => {
  const token = createCheckoutQuote(input(), secret);
  assert.equal(verifyCheckoutQuote("v1:" + "0".repeat(64), input(), secret), false);
  assert.equal(verifyCheckoutQuote("invalid", input(), secret), false);
  assert.equal(verifyCheckoutQuote(token, input(), secret + "other"), false);
  assert.throws(() => createCheckoutQuote(input(), ""), /SIGNING_SECRET_REQUIRED/);
});
