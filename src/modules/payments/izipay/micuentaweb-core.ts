import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Mi Cuenta Web V4 only. Punto Web's session-token SDK has a different contract.
export const MICUENTAWEB_CREATE_PAYMENT_URL = "https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment";
const MAX_BODY_BYTES = 131_072;
const DEFAULT_TIMEOUT_MS = 8_000;

type Failure = "DISABLED" | "PRODUCT_UNCONFIRMED" | "TEST_CONFIG_REQUIRED" | "INVALID_ORDER_SNAPSHOT"
  | "INVALID_TIMEOUT" | "UPSTREAM_HTTP" | "UPSTREAM_RESPONSE" | "UPSTREAM_TIMEOUT" | "UPSTREAM_NETWORK";

export class IzipayPreparationError extends Error {
  constructor(public readonly code: Failure) {
    super(code);
    this.name = "IzipayPreparationError";
  }
}

export type SandboxEnvironment = Readonly<Record<string, string | undefined>>;
const credentialsSchema = z.object({
  merchantId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  restTestPassword: z.string().min(1).max(4096).refine((s) => s.trim().length > 0),
  publicTestKey: z.string().min(1).max(8192).refine((s) => s.trim().length > 0),
});

export function readMicuentawebSandboxConfig(environment: SandboxEnvironment) {
  if (environment.PAYMENTS_IZIPAY_ENABLED !== "true") throw new IzipayPreparationError("DISABLED");
  if (environment.IZIPAY_INTEGRATION !== "MICUENTAWEB_V4") throw new IzipayPreparationError("PRODUCT_UNCONFIRMED");
  if (environment.IZIPAY_MODE !== "TEST") throw new IzipayPreparationError("TEST_CONFIG_REQUIRED");
  const parsed = credentialsSchema.safeParse({
    merchantId: environment.IZIPAY_MCW_MERCHANT_ID,
    restTestPassword: environment.IZIPAY_MCW_REST_TEST_PASSWORD,
    publicTestKey: environment.IZIPAY_MCW_PUBLIC_TEST_KEY,
  });
  // Never propagate a Zod error with a credential's input or any provider response body.
  if (!parsed.success) throw new IzipayPreparationError("TEST_CONFIG_REQUIRED");
  return parsed.data;
}

/** Canonical persisted PEN amounts become integers without multiplying a JS float. */
export function toMicuentawebMinorUnits(value: unknown): number {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(value)) {
    throw new IzipayPreparationError("INVALID_ORDER_SNAPSHOT");
  }
  const cents = BigInt(value.replace(".", ""));
  if (cents < BigInt(1) || cents > BigInt("9999999999")) throw new IzipayPreparationError("INVALID_ORDER_SNAPSHOT");
  return Number(cents);
}

const snapshotSchema = z.object({
  orderReference: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  total: z.string(),
  currency: z.literal("PEN"),
  customerEmail: z.string().email().max(254),
}).strict();

export type PersistedPaymentSnapshot = z.infer<typeof snapshotSchema>;

/**
 * The caller must load/authorize this snapshot and persist an attempt.
 * This function is a transport payload builder, not an HTTP request-body validator.
 */
export function buildMicuentawebPayment(snapshot: unknown) {
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success) throw new IzipayPreparationError("INVALID_ORDER_SNAPSHOT");
  return {
    amount: toMicuentawebMinorUnits(parsed.data.total),
    currency: parsed.data.currency,
    orderId: parsed.data.orderReference,
    customer: { email: parsed.data.customerEmail },
  };
}

type FetchTransport = (url: string, init: RequestInit) => Promise<Response>;
type Dependencies = { fetch?: FetchTransport; timeoutMs?: number };

async function readBoundedJson(response: Response, controller: AbortController): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" || !response.body) {
    controller.abort();
    throw new IzipayPreparationError("UPSTREAM_RESPONSE");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        controller.abort();
        throw new IzipayPreparationError("UPSTREAM_RESPONSE");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}

const tokenResponseSchema = z.object({
  status: z.literal("SUCCESS"),
  answer: z.object({ formToken: z.string().min(1).max(65_536).refine((s) => s.trim().length > 0) }),
});

/**
 * Adapter used by a separately gated sandbox-initiation route; no live checkout/SDK.
 * TEST is a local guard: Izipay's test credentials determine the upstream environment.
 * A timeout is an uncertain outcome. This function intentionally performs NO retries.
 */
export async function requestMicuentawebSandboxFormToken(
  snapshot: PersistedPaymentSnapshot,
  environment: SandboxEnvironment,
  dependencies: Dependencies = {},
): Promise<{ formToken: string; publicKey: string }> {
  const config = readMicuentawebSandboxConfig(environment);
  const payload = buildMicuentawebPayment(snapshot);
  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new IzipayPreparationError("INVALID_TIMEOUT");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await (dependencies.fetch ?? fetch)(MICUENTAWEB_CREATE_PAYMENT_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${config.merchantId}:${config.restTestPassword}`, "utf8").toString("base64")}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error", // Do not forward credentials to an unexpected redirect target.
      signal: controller.signal,
    });
    if (!response.ok) {
      controller.abort();
      throw new IzipayPreparationError("UPSTREAM_HTTP");
    }
    let parsed: ReturnType<typeof tokenResponseSchema.safeParse>;
    try { parsed = tokenResponseSchema.safeParse(await readBoundedJson(response, controller)); }
    catch (error) {
      if (error instanceof IzipayPreparationError) throw error;
      if (controller.signal.aborted) throw new IzipayPreparationError("UPSTREAM_TIMEOUT");
      throw new IzipayPreparationError("UPSTREAM_RESPONSE");
    }
    if (!parsed.success) throw new IzipayPreparationError("UPSTREAM_RESPONSE");
    return { formToken: parsed.data.answer.formToken, publicKey: config.publicTestKey };
  } catch (error) {
    if (error instanceof IzipayPreparationError) throw error;
    throw new IzipayPreparationError(controller.signal.aborted ? "UPSTREAM_TIMEOUT" : "UPSTREAM_NETWORK");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mi Cuenta Web IPN: REST password, decoded kr-answer string, hex HMAC-SHA256.
 * The browser-return HMAC key and Punto Web's Base64 signature are different contracts.
 * Authenticity alone does not authorize a database transition or prevent replay.
 */
export function verifyMicuentawebIpnSignature(answer: unknown, hash: unknown, restTestPassword: unknown): boolean {
  if (typeof answer !== "string" || !answer || Buffer.byteLength(answer, "utf8") > MAX_BODY_BYTES
    || typeof hash !== "string" || !/^[0-9a-fA-F]{64}$/.test(hash)
    || typeof restTestPassword !== "string" || !restTestPassword.trim()) return false;
  const expected = createHmac("sha256", restTestPassword).update(answer, "utf8").digest();
  return timingSafeEqual(expected, Buffer.from(hash, "hex"));
}
