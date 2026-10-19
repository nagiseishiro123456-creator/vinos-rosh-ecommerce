import { NextResponse } from "next/server";

import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { MAX_GUEST_BYTES } from "@/modules/cart/guest-selection";
import { guestPreviewRequest, previewGuestCart } from "@/modules/cart/guest-preview-service";

function json(value: unknown, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ message: "Envía la selección en formato JSON." }, 415);
  }
  try {
    const limit = await consumeRateLimit({ scope: "guest-cart-preview", identifier: getClientIp(request.headers), limit: 120, windowMs: 60_000 });
    if (!limit.allowed) return json({ message: "Has actualizado el carrito muchas veces. Espera un momento y reintenta." },
      429, { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) });
    if (Number(request.headers.get("content-length")) > MAX_GUEST_BYTES) return json({ message: "La selección es demasiado grande." }, 413);
    const reader = request.body?.getReader();
    if (!reader) return json({ message: "Revisa los productos y cantidades." }, 400);
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
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
    const parsed = guestPreviewRequest.safeParse(body);
    if (!parsed.success) return json({ message: "Revisa los productos y cantidades. Puedes seleccionar hasta 50 productos y 99 unidades de cada uno." }, 400);
    return json(await previewGuestCart(parsed.data.items));
  } catch (error) {
    console.error("GUEST_CART_PREVIEW_ERROR", error);
    return json({ message: "No pudimos verificar los precios y la disponibilidad. Conservamos tu selección; vuelve a intentarlo." }, 503);
  }
}
