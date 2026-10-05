import { prisma } from "@/lib/prisma";

export const COMMERCE_SETTINGS_ID = "default";

function envEnabled(name: string) {
  return process.env[name] === "true";
}

export async function getCommerceSettings() {
  const stored = await prisma.commerceSettings.findUnique({
    where: { id: COMMERCE_SETTINGS_ID },
  });

  if (stored) {
    return {
      source: "database" as const,
      contactEmail: stored.contactEmail,
      whatsappPhone: stored.whatsappPhone,
      yape: {
        enabled: stored.yapeEnabled && Boolean(stored.yapePhone || stored.yapeQrImageUrl),
        phone: stored.yapePhone,
        qrImageUrl: stored.yapeQrImageUrl,
      },
      transfer: {
        enabled: stored.transferEnabled && Boolean(stored.bankAccountNumber),
        label: stored.bankAccountLabel,
        accountNumber: stored.bankAccountNumber,
        holder: stored.bankAccountHolder,
      },
    };
  }

  return {
    source: "environment" as const,
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
    whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || null,
    yape: {
      enabled:
        envEnabled("PAYMENTS_YAPE_MANUAL_ENABLED") &&
        Boolean(process.env.YAPE_PHONE || process.env.YAPE_QR_IMAGE_URL),
      phone: process.env.YAPE_PHONE || null,
      qrImageUrl: process.env.YAPE_QR_IMAGE_URL || null,
    },
    transfer: {
      enabled:
        envEnabled("PAYMENTS_TRANSFER_MANUAL_ENABLED") &&
        Boolean(process.env.BANK_ACCOUNT_NUMBER),
      label: process.env.BANK_ACCOUNT_LABEL || null,
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || null,
      holder: null,
    },
  };
}
