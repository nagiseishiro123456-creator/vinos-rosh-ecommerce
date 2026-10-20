import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { CartCommandError, cartCommandSchema, executeCartCommand, readAccountCart } from "./account-service";
export const MAX_CART_COMMAND_BYTES = 2048;
const messages = {
  INVALID: "Revisa el producto y la cantidad.", UNAUTHORIZED: "Tu sesión venció. Vuelve a ingresar para revisar tu carrito.",
  CONFLICT: "El carrito o la identidad de la operación cambió. Actualiza el carrito antes de continuar.",
  UNAVAILABLE: "Este producto ya no está disponible. Actualiza el carrito para revisar sus cantidades.",
  LIMIT: "Tu carrito admite hasta 50 productos distintos. Elimina uno antes de añadir otro.",
  BUSY: "No pudimos confirmar el cambio. Reintenta la misma operación para comprobarla sin repetirla.",
};
const json = (data: unknown, status = 200, headers?: Record<string, string>) => NextResponse.json(data,
  { status, headers: { "Cache-Control": "no-store", ...headers } });
export function createAccountCartHandlers(authenticate: () => Promise<string | null>, publicUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL) {
  async function respond(request: Request, mutate: boolean) {
    if (mutate && (request.headers.get("origin") !== new URL(publicUrl ?? request.url).origin || request.headers.get("sec-fetch-site") === "cross-site")) {
      return json({ message: "La solicitud debe realizarse desde esta tienda." }, 403);
    }
    if (mutate && request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ message: "Envía el cambio en formato JSON." }, 415);
    try {
      const userId = await authenticate();
      if (!userId) return json({ message: messages.UNAUTHORIZED }, 401);
      const scope = mutate ? "account-cart-write" : "account-cart-read";
      const limit = await consumeRateLimit({ scope, identifier: userId, limit: 120, windowMs: 60_000 });
      if (!limit.allowed) return json({ message: "Espera un momento y vuelve a intentar." }, 429,
        { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) });
      if (!mutate) return json(await readAccountCart(userId));
      if (Number(request.headers.get("content-length")) > MAX_CART_COMMAND_BYTES) return json({ message: messages.INVALID }, 413);
      const reader = request.body?.getReader();
      if (!reader) return json({ message: messages.INVALID }, 400);
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > MAX_CART_COMMAND_BYTES) { await reader.cancel(); return json({ message: messages.INVALID }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let data: unknown;
      try { data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { return json({ message: messages.INVALID }, 400); }
      const parsed = cartCommandSchema.safeParse(data);
      if (!parsed.success) return json({ message: messages.INVALID }, 400);
      if (parsed.data.expectedUserId !== userId) return json({ code: "ACCOUNT_CHANGED", message: "La cuenta cambió. Vuelve a ingresar con la cuenta de esta operación." }, 409);
      return json(await executeCartCommand(userId, parsed.data));
    } catch (error) {
      if (error instanceof CartCommandError) return json({ message: messages[error.code] }, error.code === "UNAUTHORIZED" ? 401
        : error.code === "INVALID" ? 400 : error.code === "BUSY" ? 503 : 409);
      if (!request.signal.aborted) console.error("ACCOUNT_CART_ERROR", error);
      return json({ message: messages.BUSY }, 503);
    }
  }
  return { GET: (request: Request) => respond(request, false), POST: (request: Request) => respond(request, true) };
}
