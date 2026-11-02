import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { acceptIzipayNotification, InvalidIzipayNotification } from "./notification-service";

const browserSchema = z.object({ orderId: z.string().cuid(), expectedUserId: z.string().cuid(),
  rawClientAnswer: z.string().min(1).max(131072), hash: z.string().regex(/^[a-fA-F0-9]{64}$/) }).strict();
const respond = (status: number) => NextResponse.json({ received: status === 200 }, { status,
  headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
async function boundedText(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new InvalidIzipayNotification();
  const decoder = new TextDecoder("utf-8", { fatal: true }); let size = 0, text = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([new Promise<never>((_, reject) => { timer = setTimeout(() => {
      void reader.cancel().catch(() => {}); reject(new InvalidIzipayNotification());
    }, 5000); }), (async () => {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 196608) { void reader.cancel().catch(() => {}); throw new InvalidIzipayNotification(); }
        text += decoder.decode(chunk.value, { stream: true });
      }
      return text + decoder.decode();
    })()]);
  } finally { clearTimeout(timer); reader.releaseLock(); }
}
type Options = { authenticate: () => Promise<string | null>; accept?: typeof acceptIzipayNotification; consume?: typeof consumeRateLimit; environment?: Readonly<Record<string, string | undefined>> };
export function createIzipayNotificationHandler(source: "browser" | "ipn", options: Options) {
  return async (request: Request) => {
    try {
      let userId: string | undefined, orderId: string | undefined;
      const type = request.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase();
      if (type !== (source === "browser" ? "application/json" : "application/x-www-form-urlencoded")) return respond(415);
      if (source === "browser") {
        const env = options.environment ?? process.env;
        const origin = new URL(env.NEXT_PUBLIC_APP_URL ?? env.NEXTAUTH_URL ?? "").origin;
        if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") return respond(403);
        userId = await options.authenticate() ?? undefined; if (!userId) return respond(401);
      }
      const budget = await (options.consume ?? consumeRateLimit)({ scope: `izipay-${source}`, identifier: userId ?? getClientIp(request.headers), limit: source === "browser" ? 20 : 120, windowMs: 60000 });
      if (!budget.allowed) return respond(429);
      const text = await boundedText(request);
      let raw: string, hash: string;
      if (source === "browser") {
        const parsed = browserSchema.safeParse(JSON.parse(text));
        if (!parsed.success) return respond(400);
        if (parsed.data.expectedUserId !== userId) return respond(409);
        ({ rawClientAnswer: raw, hash, orderId } = parsed.data);
      } else {
        const params = new URLSearchParams(text);
        for (const key of ["kr-answer", "kr-hash", "kr-hash-algorithm", "kr-hash-key", "kr-answer-type"]) if (params.getAll(key).length !== 1) return respond(400);
        if (params.get("kr-hash-algorithm") !== "sha256_hmac" || params.get("kr-hash-key") !== "password" || params.get("kr-answer-type") !== "V4/Payment") return respond(400);
        raw = params.get("kr-answer")!; hash = params.get("kr-hash")!;
      }
      if (request.signal.aborted) return respond(408);
      await (options.accept ?? acceptIzipayNotification)(raw, hash, source, userId, orderId);
      return respond(200);
    } catch (error) {
      if (error instanceof InvalidIzipayNotification || error instanceof SyntaxError || error instanceof TypeError) return respond(400);
      // No payloads, provider exceptions or key material in logs/response bodies.
      return respond(503);
    }
  };
}
