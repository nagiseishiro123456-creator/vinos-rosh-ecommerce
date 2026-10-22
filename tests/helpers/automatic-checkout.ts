import type { TestContext } from "node:test";
import { checkoutFixture } from "./checkout";
import { reserveMicuentawebSandboxOrder } from "../../src/modules/orders/automatic-order-service";

// Fake test configuration. Reserving an order never contacts the payment provider.
export const automaticSandbox = {
  PAYMENTS_IZIPAY_ENABLED: "true", IZIPAY_MCW_INITIATE_ENABLED: "true", IZIPAY_INTEGRATION: "MICUENTAWEB_V4", IZIPAY_MODE: "TEST",
  IZIPAY_MCW_MERCHANT_ID: "qa-merchant", IZIPAY_MCW_REST_TEST_PASSWORD: "qa-not-a-credential",
  IZIPAY_MCW_PUBLIC_TEST_KEY: "qa-not-a-public-key", NEXT_PUBLIC_APP_URL: "https://rosh.example.test",
};
export function automaticInputFor(f: Awaited<ReturnType<typeof checkoutFixture>>) {
  return { addressId: f.input.addressId, checkoutQuote: f.input.checkoutQuote, checkoutKey: f.input.checkoutKey,
    receiptType: f.input.receiptType, expectedUserId: f.user.id };
}
export async function automaticCheckoutFixture(t: TestContext) {
  const f = await checkoutFixture(t);
  const automaticInput = automaticInputFor(f);
  const order = await reserveMicuentawebSandboxOrder(f.user.id, automaticInput, automaticSandbox);
  return { ...f, automaticInput, order };
}
