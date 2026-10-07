const DEFAULT_MANUAL_PAYMENT_HOLD_MINUTES = 120;
const MIN_MANUAL_PAYMENT_HOLD_MINUTES = 15;
const MAX_MANUAL_PAYMENT_HOLD_MINUTES = 24 * 60;

export function normalizeManualPaymentHoldMinutes(value?: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_MANUAL_PAYMENT_HOLD_MINUTES;
  }

  return Math.min(
    MAX_MANUAL_PAYMENT_HOLD_MINUTES,
    Math.max(MIN_MANUAL_PAYMENT_HOLD_MINUTES, parsed),
  );
}

export function getManualPaymentHoldMinutes() {
  return normalizeManualPaymentHoldMinutes(process.env.MANUAL_PAYMENT_HOLD_MINUTES);
}

export function getManualPaymentCutoff(
  now = new Date(),
  holdMinutes = getManualPaymentHoldMinutes(),
) {
  return new Date(now.getTime() - holdMinutes * 60 * 1000);
}
