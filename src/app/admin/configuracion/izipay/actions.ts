"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/admin/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { saveGatewaySettings } from "@/modules/payments/izipay/gateway-settings";

export async function saveIzipayConfiguration(form: FormData) {
  const session = await requireAdmin("/admin/configuracion/izipay");
  const budget = await consumeRateLimit({ scope: "izipay-config-save", identifier: session.user.id, limit: 5, windowMs: 15*60000 });
  if (!budget.allowed) redirect("/admin/configuracion/izipay?error=limit");
  let success = false;
  try {
    await saveGatewaySettings(session.user.id, { merchantId: form.get("merchantId"), mode: form.get("mode"),
      apiPassword: form.get("apiPassword"), publicKey: form.get("publicKey"), hmacKey: form.get("hmacKey") },
      Number(form.get("revision")), String(form.get("adminPassword") ?? ""), form.get("enabled") === "yes", String(form.get("productionConfirmation") ?? ""));
    success = true;
  } catch { /* No submitted values, SDK errors or credentials in URLs/logs. */ }
  redirect(success ? "/admin/configuracion/izipay?saved=1" : "/admin/configuracion/izipay?error=invalid");
}
