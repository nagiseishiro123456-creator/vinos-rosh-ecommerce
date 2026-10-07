import assert from "node:assert/strict";
import test from "node:test";

import {
  getManualPaymentCutoff,
  normalizeManualPaymentHoldMinutes,
} from "../src/modules/orders/hold";

test("manual payment hold defaults to 120 minutes", () => {
  assert.equal(normalizeManualPaymentHoldMinutes(undefined), 120);
  assert.equal(normalizeManualPaymentHoldMinutes("not-a-number"), 120);
});

test("manual payment hold is clamped to a safe range", () => {
  assert.equal(normalizeManualPaymentHoldMinutes("1"), 15);
  assert.equal(normalizeManualPaymentHoldMinutes("30"), 30);
  assert.equal(normalizeManualPaymentHoldMinutes("99999"), 1440);
});

test("manual payment cutoff subtracts the configured hold", () => {
  const now = new Date("2026-10-07T12:00:00.000Z");
  const cutoff = getManualPaymentCutoff(now, 90);

  assert.equal(cutoff.toISOString(), "2026-10-07T10:30:00.000Z");
});
