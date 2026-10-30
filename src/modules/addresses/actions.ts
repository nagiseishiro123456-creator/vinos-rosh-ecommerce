"use server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { deliveryAddressSchema } from "./contract";
import { archiveDeliveryAddress, DeliveryAddressError, makeDeliveryAddressPrimary, saveDeliveryAddress } from "./service";

export type AddressFormState = { message?: string; errors?: Record<string, string> };
export type AddressDestination = "checkout" | "account";
async function requireCustomer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/iniciar-sesion?callbackUrl=/mi-cuenta/direcciones");
  return session.user.id;
}
function refreshAddressViews() {
  for (const path of ["/checkout", "/mi-cuenta", "/mi-cuenta/direcciones"]) revalidatePath(path);
}
const messages = {
  INVALID: "Revisa los datos indicados.", NOT_FOUND: "La dirección ya no está disponible en tu cuenta. Recarga la página.",
  UNSUPPORTED_ZONE: "La zona cambió o necesita revisión. Selecciona una tarifa activa y vuelve a guardar.",
  LIMIT: "Puedes guardar hasta 10 direcciones activas. Quita una que ya no uses para agregar otra.", SESSION: "Tu sesión ya no está disponible. Ingresa nuevamente.",
};
export async function submitDeliveryAddress(destination: AddressDestination, addressId: string | null, _previous: AddressFormState, form: FormData): Promise<AddressFormState> {
  const userId = await requireCustomer();
  const text = (name: string) => typeof form.get(name) === "string" ? String(form.get(name)) : "";
  const input = { label: text("label"), recipient: text("recipient"), phone: text("phone"), shippingZoneId: text("shippingZoneId"), addressLine1: text("addressLine1"), reference: text("reference"), isDefault: form.get("isDefault") === "on" };
  const parsed = deliveryAddressSchema.safeParse(input);
  if (!parsed.success) return { message: "Corrige los campos indicados. Tu dirección todavía no se guardó.", errors: Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])) };
  let saved: { id: string };
  try {
    const rate = await consumeRateLimit({ scope: "delivery-address-write", identifier: userId, limit: 20, windowMs: 60_000 });
    if (!rate.allowed) return { message: "Espera un minuto antes de guardar más cambios." };
    saved = await saveDeliveryAddress(userId, input, addressId ?? undefined);
  } catch (error) {
    return { message: error instanceof DeliveryAddressError ? messages[error.code] : "No pudimos guardar la dirección. Conservamos lo escrito para que puedas reintentar." };
  }
  refreshAddressViews();
  if (destination === "checkout") redirect(("/checkout?addressId=" + saved.id) as Route);
  redirect(("/mi-cuenta/direcciones?status=" + (addressId ? "updated" : "created")) as Route);
}
export async function setDefaultAddress(id: string) {
  const userId = await requireCustomer();
  try { await makeDeliveryAddressPrimary(userId, id); }
  catch { redirect("/mi-cuenta/direcciones?error=not-found"); }
  refreshAddressViews();
}
export async function archiveAddress(id: string) {
  const userId = await requireCustomer();
  try { await archiveDeliveryAddress(userId, id); }
  catch { redirect("/mi-cuenta/direcciones?error=not-found"); }
  refreshAddressViews();
}
