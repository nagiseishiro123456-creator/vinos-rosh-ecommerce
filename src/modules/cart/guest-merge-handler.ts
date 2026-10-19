import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { MAX_GUEST_BYTES } from "./guest-selection";
import { CartMergeError, guestMergeRequest, mergeGuestCart } from "./guest-merge-service";

function json(value: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
export function createGuestMergeHandler(authenticate: () => Promise<string | null>) {
  return async function POST(request: Request) {
    if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ message: "La solicitud debe realizarse desde esta tienda." }, 403);
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return json({ message: "Envía la selección en formato JSON." }, 415);
    }
    try {
      const userId = await authenticate();
      if (!userId) return json({ message: "Tu sesión venció. Ingresa nuevamente; conservamos la selección pendiente." }, 401);
      const limit = await consumeRateLimit({ scope: "guest-cart-merge", identifier: userId, limit: 60, windowMs: 60_000 });
      if (!limit.allowed) return json({ message: "Espera un momento antes de volver a integrar tu selección." }, 429,
        { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) });
      if (Number(request.headers.get("content-length")) > MAX_GUEST_BYTES) return json({ message: "La selección es demasiado grande." }, 413);
      const reader = request.body?.getReader();
      if (!reader) return json({ message: "Revisa los productos y cantidades." }, 400);
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_GUEST_BYTES) { await reader.cancel(); return json({ message: "La selección es demasiado grande." }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let body: unknown;
      try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { return json({ message: "Revisa los productos y cantidades." }, 400); }
      const parsed = guestMergeRequest.safeParse(body);
      if (!parsed.success) return json({ message: "Revisa la selección y su identidad antes de reintentar." }, 400);
      if (parsed.data.expectedUserId !== userId) return json({ message: "La cuenta cambió. Vuelve a ingresar con la cuenta de la selección pendiente." }, 409);
      return json(await mergeGuestCart(userId, parsed.data));
    } catch (error) {
      if (error instanceof CartMergeError) {
        if (error.code === "CONFLICT") return json({ message: "La identidad de la selección ya se utilizó con otros productos. Conservamos el pendiente; revisa el carrito de tu cuenta antes de continuar." }, 409);
        if (error.code === "UNAUTHORIZED") return json({ message: "Tu sesión ya no está disponible. Ingresa nuevamente." }, 401);
        if (error.code === "INVALID") return json({ message: "La selección contiene datos inválidos." }, 400);
      } else if (!request.signal.aborted) console.error("GUEST_CART_MERGE_ERROR", error);
      return json({ message: "No pudimos confirmar la integración. Conservamos la selección pendiente; reintenta para comprobar el resultado sin duplicarla." }, 503);
    }
  };
}
