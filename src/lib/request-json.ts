/** Bounded JSON reader for state-changing endpoints. It never includes submitted data in errors. */
export class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 408 | 413) { super("INVALID_REQUEST_BODY"); }
}

type Limits = { maxBytes: number; timeoutMs?: number };

export async function readBoundedRequestJson(request: Request, { maxBytes, timeoutMs = 5_000 }: Limits): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5_000) {
    throw new Error("INVALID_REQUEST_BODY_LIMITS");
  }
  const length = request.headers.get("content-length");
  if (length !== null && !/^\d+$/.test(length)) throw new RequestBodyError(400);
  if (length !== null && Number(length) > maxBytes) throw new RequestBodyError(413);
  if (request.signal.aborted) throw new RequestBodyError(408);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      abort = () => { reject(new RequestBodyError(408)); void reader.cancel().catch(() => {}); };
      request.signal.addEventListener("abort", abort, { once: true });
      timer = setTimeout(abort, timeoutMs);
      if (request.signal.aborted) abort();
    });
    return await Promise.race([deadline, (async () => {
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let bytes = 0;
      let text = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > maxBytes) throw new RequestBodyError(413);
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
      return JSON.parse(text) as unknown;
    })()]);
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error instanceof RequestBodyError ? error : new RequestBodyError(400);
  } finally {
    clearTimeout(timer);
    if (abort) request.signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}
