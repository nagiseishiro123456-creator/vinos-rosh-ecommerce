import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeRateLimit } from "@/lib/rate-limit";
import { PaymentAttemptError } from "./attempt-service";
import { IzipayPreparationError, type SandboxEnvironment } from "./micuentaweb-core";
import { initiateMicuentawebSandboxPayment, PaymentInitiationError } from "./initiation-service";

export const MAX_PAYMENT_INITIATION_BYTES = 2048;
const inputSchema = z.object({ orderId: z.string().cuid(), expectedUserId: z.string().cuid() }).strict();
class BodyError extends Error {
  constructor(public readonly status: number) { super("INVALID_PAYMENT_BODY"); }
}
const json = (body: unknown, status: number, headers: Record<string, string> = {}) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", ...headers },
});
async function readBody(request: Request, timeoutMs: number) {
  if (Number(request.headers.get("content-length")) > MAX_PAYMENT_INITIATION_BYTES) throw new BodyError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError(400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new BodyError(408));
        void reader.cancel().catch(() => {});
      }, timeoutMs);
    });
    return await Promise.race([deadline, (async () => {
      let size = 0; let text = "";
      const decoder = new TextDecoder("utf-8", { fatal: true });
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_PAYMENT_INITIATION_BYTES) {
          void reader.cancel().catch(() => {});
          throw new BodyError(413);
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
      return JSON.parse(text) as unknown;
    })()]);
  } finally { clearTimeout(timer); reader.releaseLock(); }
}

type Options = {
  authenticate: () => Promise<string | null>;
  environment?: () => SandboxEnvironment;
  consume?: typeof consumeRateLimit;
  initiate?: typeof initiateMicuentawebSandboxPayment;
  bodyTimeoutMs?: number;
};

/** POST only. Default flags are off; no script/UI or automatic order creation is enabled. */
export function createMicuentawebInitiationHandler(options: Options) {
  const timeoutMs = options.bodyTimeoutMs ?? 5_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5_000) throw new Error("INVALID_BODY_TIMEOUT");
  return async (request: Request) => {
    const environment = { ...(options.environment?.() ?? process.env) };
    if (environment.PAYMENTS_IZIPAY_ENABLED !== "true" || environment.IZIPAY_MCW_INITIATE_ENABLED !== "true") {
      return json({ message: "Recurso no disponible." }, 404);
    }
    let origin: string;
    try {
      const configured = new URL(environment.NEXT_PUBLIC_APP_URL ?? environment.NEXTAUTH_URL ?? "");
      if (!["https:", "http:"].includes(configured.protocol)) throw new Error("INVALID_PUBLIC_URL");
      origin = configured.origin;
    }
    catch { return json({ message: "Inicio de pago no disponible." }, 503); }
    if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ message: "La solicitud debe realizarse desde esta tienda." }, 403);
    }
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
      return json({ message: "Envía la solicitud en formato JSON." }, 415);
    }
    try {
      const userId = await options.authenticate();
      if (!userId) return json({ message: "Vuelve a ingresar para continuar." }, 401);
      const limit = await (options.consume ?? consumeRateLimit)({ scope: "izipay-sandbox-initiate", identifier: userId,
        limit: 10, windowMs: 10 * 60 * 1000 });
      if (!limit.allowed) return json({ message: "Espera antes de volver a intentar." }, 429,
        { "Retry-After": String(Math.max(1, Math.ceil(limit.retryAfterMs / 1000))) });
      let body: unknown;
      try { body = await readBody(request, timeoutMs); }
      catch (error) { return json({ message: "Revisa la solicitud de pago." }, error instanceof BodyError ? error.status : 400); }
      const parsed = inputSchema.safeParse(body);
      if (!parsed.success) return json({ message: "Revisa la solicitud de pago." }, 400);
      if (parsed.data.expectedUserId !== userId) return json({ code: "ACCOUNT_CHANGED", message: "La cuenta cambió. Vuelve a ingresar." }, 409);
      if (request.signal.aborted) return json({ message: "Solicitud interrumpida." }, 408);
      const result = await (options.initiate ?? initiateMicuentawebSandboxPayment)(userId, parsed.data.orderId, environment);
      if (result.kind === "token_ready") return json(result, 200);
      if (result.kind === "pending") return json({ ...result, message: "El inicio anterior sigue pendiente de verificación." }, 202);
      return json({ ...result, message: "Este intento requiere recuperación. No se inició otro pago." }, 409);
    } catch (error) {
      if (error instanceof PaymentAttemptError && error.code === "ORDER_UNAVAILABLE") return json({ message: "Pedido no disponible para este pago." }, 404);
      if (error instanceof PaymentInitiationError) return json({ code: "RECOVERY_REQUIRED", message: "No se pudo confirmar el inicio. Conservamos el intento para verificarlo." }, 409);
      if (error instanceof IzipayPreparationError || error instanceof PaymentAttemptError) return json({ message: "Inicio de pago no disponible." }, 503);
      // A thrown error may contain provider/DB secrets; never print its message or stack.
      console.error("PAYMENT_INITIATION_UNAVAILABLE");
      return json({ message: "Inicio de pago no disponible." }, 503);
    }
  };
}
