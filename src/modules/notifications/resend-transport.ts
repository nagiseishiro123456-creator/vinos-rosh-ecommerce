import { z } from "zod";

export const mailEnvelopeSchema = z.object({ from: z.string().min(3).max(300).regex(/^[^\r\n]+$/), to: z.array(z.string().email().max(254)).length(1),
  subject: z.string().min(1).max(200).regex(/^[^\r\n]+$/), text: z.string().max(100_000), html: z.string().max(100_000) }).strict();
export type MailEnvelope = z.infer<typeof mailEnvelopeSchema>;
export type EmailEnvironment = Readonly<Record<string, string | undefined>>;
export class MailDeliveryError extends Error {
  constructor(public code: "RETRYABLE" | "PROVIDER_REJECTED") { super(code); }
}
export function readPaymentEmailConfig(environment: EmailEnvironment) {
  if (environment.PAYMENT_CONFIRMATION_EMAIL_ENABLED !== "true") return null;
  const apiKey = environment.RESEND_API_KEY?.trim();
  const from = environment.EMAIL_FROM?.trim();
  const appUrl = environment.NEXT_PUBLIC_APP_URL ?? environment.NEXTAUTH_URL;
  if (!apiKey || !from || !appUrl || /[\r\n]/.test(from)) return null;
  const address = from.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (!z.string().email().safeParse(address).success || from.length > 300) return null;
  try { const url = new URL(appUrl); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null; }
  catch { return null; }
  return { apiKey, from, appUrl };
}

/** Optional provider adapter. Never called while the feature/configuration is disabled. */
export async function sendConfirmationViaResend(envelope: MailEnvelope, key: string, apiKey: string, transport: typeof fetch = fetch) {
  const body = mailEnvelopeSchema.parse(envelope);
  if (!/^payment-confirmation\/[a-f0-9-]{36}$/.test(key)) throw new MailDeliveryError("PROVIDER_REJECTED");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await transport("https://api.resend.com/emails", { method: "POST", headers: {
      Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key,
    }, body: JSON.stringify(body), signal: controller.signal, redirect: "error", cache: "no-store" });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new MailDeliveryError(response.status === 429 || response.status >= 500 || response.status === 408 ? "RETRYABLE" : "PROVIDER_REJECTED");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new MailDeliveryError("RETRYABLE");
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      while (true) { const part = await reader.read(); if (part.done) break;
        bytes += part.value.byteLength; if (bytes > 8192) { await reader.cancel(); throw new MailDeliveryError("RETRYABLE"); } chunks.push(part.value); }
    } finally { reader.releaseLock(); }
    const parsed = z.object({ id: z.string().uuid() }).safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) throw new MailDeliveryError("RETRYABLE");
    return parsed.data.id;
  } catch (error) {
    if (error instanceof MailDeliveryError) throw error;
    throw new MailDeliveryError("RETRYABLE");
  } finally { clearTimeout(timeout); }
}
