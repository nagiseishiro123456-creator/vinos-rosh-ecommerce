import { z } from "zod";

export type EmailEnvironment = Readonly<Record<string, string | undefined>>;

function parseConfiguration(environment: EmailEnvironment) {
  const apiKey = environment.RESEND_API_KEY?.trim() ?? "";
  const from = environment.EMAIL_FROM?.trim() ?? "";
  const appUrl = environment.NEXT_PUBLIC_APP_URL ?? environment.NEXTAUTH_URL ?? "";
  const sender = from.match(/^[^<>\r\n]+<([^<>\r\n]+)>$/)?.[1] ?? from;
  const keyValid = apiKey.length > 0 && apiKey.length <= 4096 && !/[\r\n\s]/.test(apiKey);
  const senderValid = from.length <= 300 && !/[\r\n]/.test(from) && z.string().email().safeParse(sender).success;
  let urlValid = false;
  try {
    const url = new URL(appUrl);
    urlValid = ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { /* Report a static configuration message below. */ }
  return { apiKey, from, appUrl, keyValid, senderValid, urlValid };
}

/** Safe to render in ADMIN: never returns addresses, keys or environment values. */
export function inspectPaymentEmailSetup(environment: EmailEnvironment) {
  const parsed = parseConfiguration(environment);
  const enabled = environment.PAYMENT_CONFIRMATION_EMAIL_ENABLED === "true";
  return {
    enabled,
    locallyReady: enabled && parsed.keyValid && parsed.senderValid && parsed.urlValid,
    providerVerified: false as const,
    checks: [
      { id: "key", ok: parsed.keyValid, label: "Credencial del servidor", detail: parsed.keyValid ? "Presente con formato local válido; autenticación externa pendiente." : "Configura RESEND_API_KEY en el entorno privado del servidor." },
      { id: "sender", ok: parsed.senderValid, label: "Remitente", detail: parsed.senderValid ? "Formato válido; verifica su dominio en Resend." : "Configura EMAIL_FROM con un correo válido del dominio del negocio." },
      { id: "url", ok: parsed.urlValid, label: "Enlace de la tienda", detail: parsed.urlValid ? "URL local válida para los enlaces del pedido." : "Configura NEXT_PUBLIC_APP_URL con la dirección de la tienda." },
      { id: "enabled", ok: enabled, label: "Envío habilitado", detail: enabled ? "Cada envío requiere una acción y confirmación administrativa." : "PAYMENT_CONFIRMATION_EMAIL_ENABLED sigue desactivado." },
    ],
  };
}

export function readPaymentEmailConfig(environment: EmailEnvironment) {
  const parsed = parseConfiguration(environment);
  if (environment.PAYMENT_CONFIRMATION_EMAIL_ENABLED !== "true" || !parsed.keyValid || !parsed.senderValid || !parsed.urlValid) return null;
  return { apiKey: parsed.apiKey, from: parsed.from, appUrl: parsed.appUrl };
}
