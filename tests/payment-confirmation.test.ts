import assert from "node:assert/strict";
import test from "node:test";
import { confirmationSchema, outboxCopy, type ConfirmationSnapshot } from "../src/modules/notifications/confirmation-contract";
import { confirmationOrderUrl, renderPaymentConfirmation } from "../src/modules/notifications/confirmation-template";
import { MailDeliveryError, readPaymentEmailConfig, sendConfirmationViaResend } from "../src/modules/notifications/resend-transport";

export const example: ConfirmationSnapshot = { version: 1, orderNumber: "ROSH-DEMO-0001", firstName: "Cliente de prueba",
  subtotal: "89.70", shippingAmount: "8.50", total: "98.20", currency: "PEN", paidAt: "2026-10-27T15:00:00.000Z",
  items: [{ name: "ROSH · Bebida de uva", quantity: 3, unitPrice: "29.90", subtotal: "89.70" }] };
const config = { PAYMENT_CONFIRMATION_EMAIL_ENABLED: "true", RESEND_API_KEY: "qa-not-a-key", EMAIL_FROM: "ROSH <qa@example.test>", NEXT_PUBLIC_APP_URL: "https://rosh.example.test" };
const envelope = { from: config.EMAIL_FROM, to: ["buyer@example.test"], ...renderPaymentConfirmation(example, config.NEXT_PUBLIC_APP_URL) };
const key = "payment-confirmation/12345678-1234-4234-9234-123456789012";
const providerId = "12345678-1234-4234-9234-123456789013";

test("confirmation template preserves exact totals and neutral fiscal language", () => {
  const result = renderPaymentConfirmation(example, config.NEXT_PUBLIC_APP_URL);
  assert.match(result.text, /Total: S\/ 98\.20/);
  assert.match(result.text, /3 × ROSH/);
  assert.match(result.text, /no es una boleta ni una factura fiscal/);
  assert.match(result.html, /https:\/\/rosh.example.test\/pedidos\/ROSH-DEMO-0001/);
  assert.doesNotMatch(result.html, /tarjeta|CVV|código Yape/i);
  assert.match(outboxCopy.SENT.message, /no acredita su entrega/);
});
test("confirmation escapes customer/product HTML and constrains links", () => {
  const result = renderPaymentConfirmation({ ...example, firstName: '<script>alert("x")</script>',
    items: [{ ...example.items[0], name: '<img src=x onerror="alert(1)">' }] }, config.NEXT_PUBLIC_APP_URL);
  assert.doesNotMatch(result.html, /<script>|<img/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.throws(() => confirmationOrderUrl("javascript:alert(1)", "ORDER"));
  assert.throws(() => confirmationOrderUrl("https://user:secret@example.test", "ORDER"));
});
test("snapshot rejects inconsistent or malformed amounts without throwing outside validation", () => {
  for (const total of ["98.201", "98.21", "NaN", "-1.00"]) assert.equal(confirmationSchema.safeParse({ ...example, total }).success, false);
  assert.equal(confirmationSchema.safeParse({ ...example, items: [{ ...example.items[0], quantity: 2 }] }).success, false);
  assert.equal(confirmationSchema.safeParse({ ...example, orderNumber: "ROSH\r\nBcc: other" }).success, false);
});
test("email configuration is opt-in and rejects incomplete or unsafe sender/origin", () => {
  assert.equal(readPaymentEmailConfig({}), null);
  assert.equal(readPaymentEmailConfig({ ...config, PAYMENT_CONFIRMATION_EMAIL_ENABLED: "false" }), null);
  for (const change of [{ RESEND_API_KEY: "" }, { EMAIL_FROM: "bad" }, { EMAIL_FROM: "sender@example.test\r\nBcc: x@example.test" }, { NEXT_PUBLIC_APP_URL: "file:///x" }]) {
    assert.equal(readPaymentEmailConfig({ ...config, ...change }), null);
  }
  assert.equal(readPaymentEmailConfig(config)?.from, config.EMAIL_FROM);
});
test("transport uses the official endpoint and stable key without following redirects", async () => {
  const id = await sendConfirmationViaResend(envelope, key, config.RESEND_API_KEY, async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(new Headers(init?.headers).get("Idempotency-Key"), key);
    assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    assert.deepEqual(JSON.parse(String(init?.body)), envelope);
    return Response.json({ id: providerId });
  });
  assert.equal(id, providerId);
});
test("transient failures are retryable; provider refusals require review and never leak bodies", async () => {
  for (const status of [429, 500, 408, 422, 401, 409]) {
    await assert.rejects(sendConfirmationViaResend(envelope, key, config.RESEND_API_KEY, async () => new Response("private-provider-body", { status })),
      (error: unknown) => error instanceof MailDeliveryError && error.code === ([429,500,408].includes(status) ? "RETRYABLE" : "PROVIDER_REJECTED") && !error.message.includes("private"));
  }
});
test("network, malformed success and oversized success remain uncertain retryable outcomes", async () => {
  for (const transport of [async () => { throw new Error("private-token"); }, async () => Response.json({ id: "bad" }),
    async () => new Response("x".repeat(8193))]) {
    await assert.rejects(sendConfirmationViaResend(envelope, key, config.RESEND_API_KEY, transport), (e: unknown) => e instanceof MailDeliveryError && e.code === "RETRYABLE");
  }
});
