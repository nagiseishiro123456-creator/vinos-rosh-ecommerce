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

const settingsSchema = z
  .object({
    contactEmail: optionalEmail,
    whatsappPhone: optionalPhone,
    yapeEnabled: z.boolean(),
    yapePhone: optionalPhone,
    yapeQrImageUrl: optionalHttpsUrl,
    transferEnabled: z.boolean(),
    bankAccountLabel: z.string().trim().max(120),
    bankAccountNumber: z.string().trim().max(120),
    bankAccountHolder: z.string().trim().max(160),
  })
  .superRefine((data, ctx) => {
    if (data.yapeEnabled && !data.yapePhone && !data.yapeQrImageUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["yapePhone"],
        message: "Configura un número o un QR para activar Yape.",
      });
    }

    if (data.transferEnabled && !data.bankAccountNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["bankAccountNumber"],
        message: "Configura una cuenta para activar transferencias.",
      });
    }
  });

function emptyToNull(value: string) {
  return value || null;
}

export async function updateCommerceSettings(formData: FormData) {
  await requireAdmin("/admin/configuracion");

  const parsed = settingsSchema.safeParse({
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    whatsappPhone: String(formData.get("whatsappPhone") ?? "").trim(),
    yapeEnabled: formData.get("yapeEnabled") === "on",
    yapePhone: String(formData.get("yapePhone") ?? "").trim(),
    yapeQrImageUrl: String(formData.get("yapeQrImageUrl") ?? "").trim(),
    transferEnabled: formData.get("transferEnabled") === "on",
    bankAccountLabel: String(formData.get("bankAccountLabel") ?? "").trim(),
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim(),
    bankAccountHolder: String(formData.get("bankAccountHolder") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect("/admin/configuracion?error=invalid");
  }

  const data = {
    contactEmail: emptyToNull(parsed.data.contactEmail),
    whatsappPhone: emptyToNull(parsed.data.whatsappPhone),
    yapeEnabled: parsed.data.yapeEnabled,
    yapePhone: emptyToNull(parsed.data.yapePhone),
    yapeQrImageUrl: emptyToNull(parsed.data.yapeQrImageUrl),
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
