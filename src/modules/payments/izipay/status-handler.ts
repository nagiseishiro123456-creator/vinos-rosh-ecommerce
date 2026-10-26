import { NextResponse } from "next/server";
import { z } from "zod";

import { consumeRateLimit } from "@/lib/rate-limit";
import { PaymentStatusUnavailableError, readMicuentawebPaymentStatus } from "./status-service";

const schema = z.object({ orderId: z.string().cuid(), expectedUserId: z.string().cuid() }).strict();
const json = (body: unknown, status: number, headers: Record<string, string> = {}) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", ...headers },
});
type Options = {
  authenticate: () => Promise<string | null>;
  environment?: () => Readonly<Record<string, string | undefined>>;
  consume?: typeof consumeRateLimit;
  read?: typeof readMicuentawebPaymentStatus;
};

/** Status remains readable when payment initiation is disabled, for owned automatic orders only. */
export function createMicuentawebStatusHandler(options: Options) {
  return async (request: Request) => {
    const environment = options.environment?.() ?? process.env;
    let origin: string;
    try {
      const configured = new URL(environment.NEXT_PUBLIC_APP_URL ?? environment.NEXTAUTH_URL ?? "");
      if (!["http:", "https:"].includes(configured.protocol)) throw new Error();
      origin = configured.origin;
    } catch { return json({ message: "La consulta no está disponible." }, 503); }
    const suppliedOrigin = request.headers.get("origin");
    if ((suppliedOrigin !== null && suppliedOrigin !== origin) || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ message: "Consulta el estado desde esta tienda." }, 403);
    }
    try {
      const userId = await options.authenticate();
      if (!userId) return json({ code: "SESSION_REQUIRED", message: "Vuelve a ingresar para consultar tu pedido." }, 401);
      const budget = await (options.consume ?? consumeRateLimit)({ scope: "izipay-status-read", identifier: userId, limit: 30, windowMs: 60_000 });
      if (!budget.allowed) return json({ message: "Espera antes de volver a consultar." }, 429,
        { "Retry-After": String(Math.max(1, Math.ceil(budget.retryAfterMs / 1000))) });
      const params = new URL(request.url).searchParams;
      const keys = [...params.keys()];
      if (new Set(keys).size !== keys.length) return json({ message: "Revisa la consulta." }, 400);
      const parsed = schema.safeParse(Object.fromEntries(params));
      if (!parsed.success) return json({ message: "Revisa la consulta." }, 400);
      if (parsed.data.expectedUserId !== userId) return json({ code: "ACCOUNT_CHANGED", message: "La cuenta cambió. Vuelve a ingresar." }, 409);
      const status = await (options.read ?? readMicuentawebPaymentStatus)(userId, parsed.data.orderId);
      return json(status, 200);
    } catch (error) {
      if (error instanceof PaymentStatusUnavailableError) return json({ message: "Estado no disponible para este pedido." }, 404);
      console.error("PAYMENT_STATUS_READ_UNAVAILABLE");
      return json({ message: "No pudimos consultar el estado. Inténtalo de nuevo más tarde." }, 503);
    }
  };
}
