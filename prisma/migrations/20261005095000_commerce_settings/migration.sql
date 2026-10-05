-- CreateTable
CREATE TABLE "CommerceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "contactEmail" TEXT,
    "whatsappPhone" TEXT,
    "yapeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "yapePhone" TEXT,
    "yapeQrImageUrl" TEXT,
    "transferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountLabel" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountHolder" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommerceSettings_pkey" PRIMARY KEY ("id")
);
