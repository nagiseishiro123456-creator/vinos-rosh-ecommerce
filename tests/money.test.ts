import assert from "node:assert/strict";
import test from "node:test";

import { addMoney, formatPrice } from "../src/lib/money";
import { assertOrderAmountFits, calculateAmounts, money, moneyInputSchema, MoneyError } from "../src/modules/checkout/pricing";

test("3 bottles at 29.90 plus 8.50 shipping are exactly 98.20", () => {
  const amounts = calculateAmounts([{ unitPrice: "29.90", quantity: 3 }], "8.50");
  assert.equal(amounts.subtotal.toFixed(2), "89.70");
  assert.equal(amounts.total.toFixed(2), "98.20");
  assert.equal(amounts.lines[0].unitPrice.toFixed(2), "29.90");
});

test("mixed cents and repeated addition have no floating point drift", () => {
  const amounts = calculateAmounts([{ unitPrice: "0.10", quantity: 3 }, { unitPrice: "0.20", quantity: 1 }], "0.10");
  assert.equal(amounts.total.toFixed(2), "0.60");
  assert.equal(addMoney("0.10", "0.20"), "0.30");
  assert.equal(addMoney(...Array<string>(100).fill("0.01")), "1.00");
  assert.equal(calculateAmounts([]).total.toFixed(2), "0.00");
});

test("administrative amounts reject extra precision rather than silently rounding", () => {
  const schema = moneyInputSchema({ min: "0.01", max: "999999.00" });
  assert.equal(schema.parse(" 29.9 "), "29.90");
  for (const value of ["29.901", "29.900", "1e2", "-1", "NaN", "Infinity", "29,90", "", "0", "1000000", 29.9, null]) {
    assert.equal(schema.safeParse(value).success, false, String(value));
  }
  assert.equal(moneyInputSchema({ max: "10000.00" }).parse("0"), "0.00");
});

test("invalid precision, quantities and database overflow are rejected", () => {
  for (const amount of ["0.001", "-0.01", "NaN", "Infinity", "100000000.00"]) {
    assert.throws(() => money(amount), MoneyError);
  }
  for (const quantity of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateAmounts([{ unitPrice: "1.00", quantity }]), MoneyError);
  }
  assert.doesNotThrow(() => assertOrderAmountFits(money("99999999.99")));
  const overflow = calculateAmounts([{ unitPrice: "99999999.99", quantity: 2 }]);
  assert.throws(() => assertOrderAmountFits(overflow.total), MoneyError);
});

test("client-side formatting and preview sum remain exact for large amounts", () => {
  assert.equal(addMoney("99999999.99", "0.01"), "100000000.00");
  assert.equal(formatPrice("98.20"), "S/\u00a098.20");
  assert.equal(formatPrice("100000000.00"), "S/\u00a0100,000,000.00");
  assert.throws(() => addMoney("29.9"));
});
