"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAdmin } from "@/modules/admin/auth";
import { AdminOperationError } from "@/modules/admin/transaction-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { shippingZoneInputSchema } from "./contract";
import { saveShippingZoneRecord, setShippingZoneActive, ShippingZoneError } from "./service";
export type ShippingFormState = { message?: string; errors?: Record<string, string> };
const feedback: Record<string, string> = {
  DUPLICATE: "La zona ya existe, incluso si está pausada. Usa Editar tarifa en su fila.",
  CONFLICT: "Otra persona cambió la zona. Recarga para revisar su estado actual.",
  IDENTITY_CHANGED: "Para otra ubicación crea una zona nueva. Esta edición conserva las direcciones existentes.",
  NOT_FOUND: "La zona ya no está disponible.", INVALID: "Revisa los datos de la tarifa.",
};
function refresh() { for (const path of ["/admin/envios", "/envios", "/checkout", "/mi-cuenta/direcciones"]) revalidatePath(path); }
export async function saveShippingZone(_previous: ShippingFormState, form: FormData): Promise<ShippingFormState> {
  const session = await requireAdmin("/admin/envios");
  const text = (name: string) => typeof form.get(name) === "string" ? String(form.get(name)) : "";
  const input = { id: text("id") || undefined, expectedUpdatedAt: text("expectedUpdatedAt") || undefined, department: text("department"), province: text("province"), district: text("district"), price: text("price") };
  const parsed = shippingZoneInputSchema.safeParse(input);
  if (!parsed.success) return { message: "Corrige los campos indicados. La tarifa todavía no cambió.", errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) };
  try {
    const budget = await consumeRateLimit({ scope: "shipping-admin-write", identifier: session.user.id, limit: 20, windowMs: 60_000 });
    if (!budget.allowed) return { message: "Espera un minuto antes de guardar más tarifas." };
    await saveShippingZoneRecord(session.user.id, input);
  } catch (error) {
    return { message: error instanceof ShippingZoneError ? feedback[error.code] : error instanceof AdminOperationError ? "Tu cuenta ya no tiene permisos de administración." : "No pudimos guardar la tarifa. Conservamos los datos para que puedas revisarlos." };
  }
  refresh(); redirect("/admin/envios?saved=1");
}
export async function toggleShippingZone(id: string, expectedActive: boolean, expectedUpdatedAt: string) {
  const session = await requireAdmin("/admin/envios");
  try { await setShippingZoneActive(session.user.id, id, expectedActive, expectedUpdatedAt); }
  catch (error) { redirect(("/admin/envios?error=" + (error instanceof ShippingZoneError ? error.code : "unavailable")) as Route); }
  refresh();
}
