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
    const yapeReady = stored.yapeEnabled && Boolean(stored.yapePhone || stored.yapeQrImageUrl);
    const transferReady = stored.transferEnabled && Boolean(stored.bankAccountNumber);

    return {
      source: "database" as const,
      contactEmail: stored.contactEmail,
      whatsappPhone: stored.whatsappPhone,
      yape: {
        enabled: stored.yapeEnabled,
        ready: yapeReady,
        phone: stored.yapePhone,
        qrImageUrl: stored.yapeQrImageUrl,
      },
      transfer: {
        enabled: stored.transferEnabled,
        ready: transferReady,
        label: stored.bankAccountLabel,
        accountNumber: stored.bankAccountNumber,
        holder: stored.bankAccountHolder,
      },
    };
  }

  const yapeEnabled = envEnabled("PAYMENTS_YAPE_MANUAL_ENABLED");
  const transferEnabled = envEnabled("PAYMENTS_TRANSFER_MANUAL_ENABLED");

  return {
    source: "environment" as const,
    contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
    whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || null,
    yape: {
      enabled: yapeEnabled,
      ready: yapeEnabled && Boolean(process.env.YAPE_PHONE || process.env.YAPE_QR_IMAGE_URL),
      phone: process.env.YAPE_PHONE || null,
      qrImageUrl: process.env.YAPE_QR_IMAGE_URL || null,
    },
    transfer: {
      enabled: transferEnabled,
      ready: transferEnabled && Boolean(process.env.BANK_ACCOUNT_NUMBER),
      label: process.env.BANK_ACCOUNT_LABEL || null,
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || null,
      holder: null,
    },
  };
}
