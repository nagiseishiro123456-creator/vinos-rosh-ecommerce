import { FormSessionChanged, type FormPorts } from "./form-session";

export const MICUENTAWEB_SCRIPT = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js";
const THEME = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/neon-reset.min.css";
type Krypton = {
  setFormConfig: (config: Record<string, string | boolean>) => Promise<unknown>;
  onSubmit: (callback: (answer: unknown) => Promise<false>) => Promise<unknown>;
  renderElements: (element: HTMLElement) => Promise<unknown>;
  removeForms: () => Promise<unknown>;
};
type KryptonWindow = Window & { KR?: Krypton };
let documentConsumed = false;

async function json(response: Response) {
  if (response.status === 401) throw new FormSessionChanged();
  if (!response.headers.get("content-type")?.startsWith("application/json") || !response.body) throw new Error("INVALID_RESPONSE");
  const reader = response.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 98304) { await reader.cancel(); throw new Error("INVALID_RESPONSE"); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    const data = JSON.parse(text + decoder.decode()) as Record<string, unknown>;
    if (response.status === 409 && data.code === "ACCOUNT_CHANGED") throw new FormSessionChanged();
    if (!response.ok && !(response.status === 409 && data.kind === "recovery_required")) throw new Error("UNAVAILABLE");
    return data;
  } finally { reader.releaseLock(); }
}

/** One laboratory per document. Leaving/reloading requires the persisted attempt to be recovered. */
export function createBrowserFormPorts(orderId: string, expectedUserId: string, host: HTMLElement): FormPorts {
  if (documentConsumed) throw new Error("NEW_DOCUMENT_REQUIRED");
  let sdk: Krypton | undefined, active = false;
  let releaseResources = () => {};
  const clean = () => {
    active = false; host.replaceChildren(); releaseResources();
    try { if (sdk) void sdk.removeForms().catch(() => {}); } catch { /* Host is already empty. */ }
  };
  return {
    status: async signal => json(await fetch(`/api/payment/status?${new URLSearchParams({ orderId, expectedUserId })}`,
      { credentials: "same-origin", cache: "no-store", redirect: "error", signal })),
    initiate: async signal => json(await fetch("/api/payment/initiate", { method: "POST", credentials: "same-origin",
      cache: "no-store", redirect: "error", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, expectedUserId }), signal })),
    clear: clean,
    mount: async (token, publicKey, submitted, signal) => {
      if (signal.aborted) return;
      if (documentConsumed) throw new Error("NEW_DOCUMENT_REQUIRED");
      documentConsumed = true;
      active = true;
      const script = document.createElement("script");
      script.src = MICUENTAWEB_SCRIPT; script.async = true;
      script.setAttribute("kr-public-key", publicKey); script.setAttribute("kr-spa-mode", "true");
      const css = document.createElement("link"); css.rel = "stylesheet"; css.href = THEME;
      const themeScript = document.createElement("script");
      themeScript.src = "https://static.micuentaweb.pe/static/js/krypton-client/V4.0/ext/neon.js"; themeScript.async = true;
      releaseResources = () => { script.remove(); themeScript.remove(); css.remove(); };
      document.head.append(css);
      const abort = () => { script.remove(); css.remove(); clean(); };
      signal.addEventListener("abort", abort, { once: true });
      try {
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve(); script.onerror = () => reject(new Error("SDK_UNAVAILABLE"));
          signal.addEventListener("abort", () => reject(new Error("INTERRUPTED")), { once: true });
          document.head.append(script);
        });
        if (!active || signal.aborted) throw new Error("SDK_UNAVAILABLE");
        await new Promise<void>((resolve, reject) => {
          themeScript.onload = () => resolve(); themeScript.onerror = () => reject(new Error("SDK_UNAVAILABLE"));
          signal.addEventListener("abort", () => reject(new Error("INTERRUPTED")), { once: true });
          document.head.append(themeScript);
        });
        const candidate = (window as KryptonWindow).KR;
        if (!candidate || ![candidate.setFormConfig, candidate.onSubmit, candidate.renderElements, candidate.removeForms].every(method => typeof method === "function")) throw new Error("SDK_UNAVAILABLE");
        sdk = candidate;
        if (!active || signal.aborted) throw new Error("SDK_UNAVAILABLE");
        await sdk.setFormConfig({ formToken: token, "kr-language": "es-PE", "kr-spa-mode": true, "kr-clear-on-error": true });
        if (!active || signal.aborted) return;
        let returned = false;
        await sdk.onSubmit(async answer => {
          if (!active || signal.aborted || returned) return false;
          returned = true;
          // Send only the signed result, never arbitrary SDK fields or our displayed total.
          const payload = answer as { rawClientAnswer?: unknown; hash?: unknown } | null;
          const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
          try {
            if (typeof payload?.rawClientAnswer === "string" && payload.rawClientAnswer.length <= 131072 && typeof payload.hash === "string") {
              await fetch("/api/payment/return", { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error",
                headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, expectedUserId, rawClientAnswer: payload.rawClientAnswer, hash: payload.hash }), signal: controller.signal });
            }
          } catch { /* An uncertain return never becomes an approval or grants another initiation. */ }
          finally { clearTimeout(timeout); if (active && !signal.aborted) submitted(); }
          return false;
        });
        if (!active || signal.aborted) return;
        const form = document.createElement("div"); form.className = "kr-smart-form"; host.replaceChildren(form);
        await sdk.renderElements(host);
        if (!active || signal.aborted) clean();
      } catch { clean(); throw new Error("SDK_UNAVAILABLE"); }
      finally { signal.removeEventListener("abort", abort); script.remove(); themeScript.remove(); }
    },
  };
}
