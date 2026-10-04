"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,16}$/),
  shippingZoneId: z.string().cuid(),
  addressLine1: z.string().trim().min(5).max(200),
  reference: z.string().trim().max(250).optional(),
  isDefault: z.boolean().default(false),
});

async function requireCustomer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/checkout");
  }
  return session.user.id;
}

export async function createAddress(formData: FormData) {
  const userId = await requireCustomer();

  const parsed = addressSchema.safeParse({
    label: formData.get("label") || undefined,
    recipient: formData.get("recipient"),
    phone: formData.get("phone"),
    shippingZoneId: formData.get("shippingZoneId"),
    addressLine1: formData.get("addressLine1"),
    reference: formData.get("reference") || undefined,
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    redirect("/checkout?error=invalid-address");
  }

  const zone = await prisma.shippingZone.findFirst({
    where: { id: parsed.data.shippingZoneId, active: true },
    select: {
      department: true,
      province: true,
      district: true,
    },
  });

  if (!zone) {
    redirect("/checkout?error=unsupported-zone");
  }

  const currentAddressCount = await prisma.address.count({
    where: { userId, active: true },
  });

  const shouldBeDefault = parsed.data.isDefault || currentAddressCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId,
        label: parsed.data.label,
        recipient: parsed.data.recipient,
        phone: parsed.data.phone.replace(/\s+/g, ""),
        department: zone.department,
        province: zone.province,
        district: zone.district,
        addressLine1: parsed.data.addressLine1,
        reference: parsed.data.reference,
        isDefault: shouldBeDefault,
      },
      select: { id: true },
    });
  });

  revalidatePath("/checkout");
  revalidatePath("/mi-cuenta");
  redirect(`/checkout?addressId=${created.id}`);
}
