import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/rate-limit";
import { readBoundedRequestJson, RequestBodyError } from "@/lib/request-json";
import { MoneyError } from "@/modules/checkout/pricing";
import { CheckoutUnavailableError } from "@/modules/checkout/snapshot";
import { StockChangedError } from "@/modules/inventory/stock-service";
import { IzipayPreparationError, type SandboxEnvironment } from "@/modules/payments/izipay/micuentaweb-core";
import { automaticOrderSchema } from "./automatic-order-input";
import { reserveMicuentawebSandboxOrder } from "./automatic-order-service";
import { CheckoutConflictError, OrderReservationError } from "./order-reservation-core";

export const MAX_AUTOMATIC_RESERVATION_BYTES = 8_192;
const json = (body: unknown, status: number, headers: Record<string, string> = {}) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", ...headers },
});

type Options = {
  authenticate: () => Promise<string | null>;
  environment?: () => SandboxEnvironment;
  consume?: typeof consumeRateLimit;
  reserve?: typeof reserveMicuentawebSandboxOrder;
  bodyTimeoutMs?: number;
};

const reservationErrors = {
  QUOTE_CHANGED: { status: 409, message: "El resumen cambió. Revisa los productos y el envío antes de confirmar." },
  PENDING_LIMIT: { status: 409, message: "Ya tienes tres pedidos pendientes. Revisa tus pedidos antes de continuar." },
  BUSY: { status: 409, message: "La confirmación sigue en proceso. Conserva la misma confirmación para volver a intentar." },
  INVALID_CONFIRMATION: { status: 400, message: "La confirmación no es válida. Vuelve a revisar el resumen de compra." },
  PROVIDER_UNAVAILABLE: { status: 503, message: "La reserva de pruebas no está disponible." },
} as const;

/** Authenticated, separately gated TEST reservation. No token request or payment confirmation. */
export function createAutomaticOrderReservationHandler(options: Options) {
  const bodyTimeoutMs = options.bodyTimeoutMs ?? 5_000;
  if (!Number.isInteger(bodyTimeoutMs) || bodyTimeoutMs < 1 || bodyTimeoutMs > 5_000) throw new Error("INVALID_BODY_TIMEOUT");
  return async (request: Request) => {
    const environment = { ...(options.environment?.() ?? process.env) };
    if (environment.PAYMENTS_IZIPAY_ENABLED !== "true" || environment.IZIPAY_MCW_RESERVE_ENABLED !== "true") {
      return json({ message: "Recurso no disponible." }, 404);
    }
    let origin: string;
    try {
      const configured = new URL(environment.NEXT_PUBLIC_APP_URL ?? environment.NEXTAUTH_URL ?? "");
      if (!["https:", "http:"].includes(configured.protocol)) throw new Error("INVALID_PUBLIC_URL");
      origin = configured.origin;
    } catch { return json({ code: "RESERVATION_UNAVAILABLE", message: "La reserva de pruebas no está disponible." }, 503); }
    if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ message: "La solicitud debe realizarse desde esta tienda." }, 403);
    }
    if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
      return json({ message: "Envía la solicitud en formato JSON." }, 415);
    }
    try {
      const userId = await options.authenticate();
      if (!userId) return json({ message: "Vuelve a ingresar para continuar." }, 401);
      const limit = await (options.consume ?? consumeRateLimit)({ scope: "izipay-sandbox-reserve", identifier: userId,
        limit: 10, windowMs: 10 * 60 * 1000 });
      if (!limit.allowed) return json({ message: "Espera antes de volver a intentar." }, 429,
        { "Retry-After": String(Math.max(1, Math.ceil(limit.retryAfterMs / 1000))) });
      let body: unknown;
      try { body = await readBoundedRequestJson(request, { maxBytes: MAX_AUTOMATIC_RESERVATION_BYTES, timeoutMs: bodyTimeoutMs }); }
      catch (error) {
        return json({ code: "INVALID_INPUT", message: "Revisa la solicitud de reserva." }, error instanceof RequestBodyError ? error.status : 400);
      }
      const parsed = automaticOrderSchema.safeParse(body);
      if (!parsed.success) return json({ code: "INVALID_INPUT", message: "Revisa la solicitud de reserva." }, 400);
      if (parsed.data.expectedUserId !== userId) {
        return json({ code: "ACCOUNT_CHANGED", message: "La cuenta cambió. Vuelve a ingresar y revisa tu resumen." }, 409);
      }
      if (request.signal.aborted) return json({ message: "Solicitud interrumpida." }, 408);
      const order = await (options.reserve ?? reserveMicuentawebSandboxOrder)(userId, parsed.data, environment);
      // A replay can refer to a closed order: recovering it does not promise an active reservation.
      return json({ kind: order.replayed ? "recovered" : "reserved", orderId: order.id, orderNumber: order.number,
        replayed: order.replayed }, order.replayed ? 200 : 201);
    } catch (error) {
      if (error instanceof CheckoutConflictError) {
        return json({ code: "CHECKOUT_CONFLICT", orderNumber: error.orderNumber,
          message: "Esta confirmación ya corresponde a otro resumen o método. Revisa el pedido existente." }, 409);
      }
      if (error instanceof OrderReservationError) {
        const detail = reservationErrors[error.code];
        return json({ code: error.code, message: detail.message }, detail.status, error.code === "BUSY" ? { "Retry-After": "1" } : {});
      }
      if (error instanceof CheckoutUnavailableError) {
        const details = {
          ADDRESS_NOT_FOUND: { status: 404, message: "Dirección no disponible para esta cuenta." },
          EMPTY_CART: { status: 409, message: "Tu carrito está vacío. Revisa tu selección." },
          UNSUPPORTED_ZONE: { status: 409, message: "La dirección no tiene cobertura activa. Elige otra dirección." },
          STOCK_CHANGED: { status: 409, message: "La disponibilidad cambió. Revisa tu carrito." },
        } as const;
        const detail = details[error.code];
        return json({ code: error.code, message: detail.message }, detail.status);
      }
      if (error instanceof StockChangedError) return json({ code: "STOCK_CHANGED", message: "La disponibilidad cambió. Revisa tu carrito." }, 409);
      if (error instanceof MoneyError) return json({ code: "AMOUNT_INVALID", message: "No se pudo verificar el importe. Revisa tu carrito." }, 409);
      if (!(error instanceof IzipayPreparationError)) console.error("AUTOMATIC_RESERVATION_UNAVAILABLE");
      // A lost response can follow a successful commit. Never ask for a fresh checkout key.
      return json({ code: "RESERVATION_UNAVAILABLE",
        message: "No pudimos confirmar la reserva. Conserva la misma confirmación y consulta tus pedidos antes de reintentar." }, 503);
    }
  };
}
