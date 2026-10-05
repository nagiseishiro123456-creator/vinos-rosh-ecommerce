"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";
import { COMMERCE_SETTINGS_ID } from "@/modules/settings/queries";

const optionalPhone = z.union([
  z.literal(""),
  z.string().trim().regex(/^\+?\d{9,15}$/),
]);

const optionalHttpsUrl = z.union([
  z.literal(""),
  z.string().trim().url().refine((value) => value.startsWith("https://")),
]);

const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(180)]);

const settingsSchema = z.object({
  contactEmail: optionalEmail,
  whatsappPhone: optionalPhone,
  yapeEnabled: z.boolean(),
  yapePhone: optionalPhone,
  yapeQrImageUrl: optionalHttpsUrl,
  removeYapeQr: z.boolean(),
  transferEnabled: z.boolean(),
  bankAccountLabel: z.string().trim().max(120),
  bankAccountNumber: z.string().trim().max(120),
  bankAccountHolder: z.string().trim().max(160),
});

const allowedQrMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxQrBytes = 500 * 1024;

function emptyToNull(value: string) {
  return value || null;
}

async function uploadedQrDataUrl(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;

  if (value.size > maxQrBytes || !allowedQrMimeTypes.has(value.type)) {
    throw new Error("INVALID_QR_FILE");
  }

  const bytes = Buffer.from(await value.arrayBuffer());
  return `data:${value.type};base64,${bytes.toString("base64")}`;
}

export async function updateCommerceSettings(formData: FormData) {
  await requireAdmin("/admin/configuracion");

  const parsed = settingsSchema.safeParse({
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    whatsappPhone: String(formData.get("whatsappPhone") ?? "").trim(),
    yapeEnabled: formData.get("yapeEnabled") === "on",
    yapePhone: String(formData.get("yapePhone") ?? "").trim(),
    yapeQrImageUrl: String(formData.get("yapeQrImageUrl") ?? "").trim(),
    removeYapeQr: formData.get("removeYapeQr") === "on",
    transferEnabled: formData.get("transferEnabled") === "on",
    bankAccountLabel: String(formData.get("bankAccountLabel") ?? "").trim(),
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim(),
    bankAccountHolder: String(formData.get("bankAccountHolder") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect("/admin/configuracion?error=invalid");
  }

  const current = await prisma.commerceSettings.findUnique({
    where: { id: COMMERCE_SETTINGS_ID },
    select: { yapeQrImageUrl: true },
  });

  let uploadedQr: string | null;
  try {
    uploadedQr = await uploadedQrDataUrl(formData.get("yapeQrFile"));
  } catch {
    redirect("/admin/configuracion?error=invalid-qr");
  }

  let yapeQrImageUrl: string | null;
  if (parsed.data.removeYapeQr) {
    yapeQrImageUrl = null;
  } else if (uploadedQr) {
    yapeQrImageUrl = uploadedQr;
  } else if (parsed.data.yapeQrImageUrl) {
    yapeQrImageUrl = parsed.data.yapeQrImageUrl;
  } else {
    yapeQrImageUrl = current?.yapeQrImageUrl ?? process.env.YAPE_QR_IMAGE_URL ?? null;
  }

  if (parsed.data.yapeEnabled && !parsed.data.yapePhone && !yapeQrImageUrl) {
    redirect("/admin/configuracion?error=yape-incomplete");
  }

  if (parsed.data.transferEnabled && !parsed.data.bankAccountNumber) {
    redirect("/admin/configuracion?error=transfer-incomplete");
  }

  const data = {
    contactEmail: emptyToNull(parsed.data.contactEmail),
    whatsappPhone: emptyToNull(parsed.data.whatsappPhone),
    yapeEnabled: parsed.data.yapeEnabled,
    yapePhone: emptyToNull(parsed.data.yapePhone),
    yapeQrImageUrl,
    transferEnabled: parsed.data.transferEnabled,
    bankAccountLabel: emptyToNull(parsed.data.bankAccountLabel),
    bankAccountNumber: emptyToNull(parsed.data.bankAccountNumber),
    bankAccountHolder: emptyToNull(parsed.data.bankAccountHolder),
  };

  await prisma.commerceSettings.upsert({
    where: { id: COMMERCE_SETTINGS_ID },
    create: { id: COMMERCE_SETTINGS_ID, ...data },
    update: data,
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/checkout/pago");
  revalidatePath("/");

  redirect("/admin/configuracion?saved=1");
}
