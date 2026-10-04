"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const addressIdSchema = z.string().cuid();

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  recipient: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,16}$/),
  shippingZoneId: z.string().cuid(),
  addressLine1: z.string().trim().min(5).max(200),
  reference: z.string().trim().max(250).optional(),
  isDefault: z.boolean().default(false),
});

type AddressDestination = "checkout" | "account";

async function requireCustomer() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion");
  }
  return session.user.id;
}

function parseAddress(formData: FormData) {
  return addressSchema.safeParse({
    label: formData.get("label") || undefined,
    recipient: formData.get("recipient"),
    phone: formData.get("phone"),
    shippingZoneId: formData.get("shippingZoneId"),
    addressLine1: formData.get("addressLine1"),
    reference: formData.get("reference") || undefined,
    isDefault: formData.get("isDefault") === "on",
  });
}

async function getActiveZone(shippingZoneId: string) {
  return prisma.shippingZone.findFirst({
    where: { id: shippingZoneId, active: true },
    select: {
      department: true,
      province: true,
      district: true,
    },
  });
}

function refreshAddressViews() {
  revalidatePath("/checkout");
  revalidatePath("/mi-cuenta");
  revalidatePath("/mi-cuenta/direcciones");
}

export async function createAddress(destination: AddressDestination, formData: FormData) {
  const userId = await requireCustomer();
  const parsed = parseAddress(formData);

  if (!parsed.success) {
    redirect(destination === "checkout" ? "/checkout?error=invalid-address" : "/mi-cuenta/direcciones?error=invalid-address");
  }

  const zone = await getActiveZone(parsed.data.shippingZoneId);
  if (!zone) {
    redirect(destination === "checkout" ? "/checkout?error=unsupported-zone" : "/mi-cuenta/direcciones?error=unsupported-zone");
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

  refreshAddressViews();

  if (destination === "checkout") {
    redirect(`/checkout?addressId=${created.id}`);
  }

  redirect("/mi-cuenta/direcciones?status=created");
}

export async function updateAddress(addressId: string, formData: FormData) {
  const userId = await requireCustomer();
  const parsedId = addressIdSchema.safeParse(addressId);
  const parsed = parseAddress(formData);

  if (!parsedId.success || !parsed.success) {
    redirect("/mi-cuenta/direcciones?error=invalid-address");
  }

  const [zone, existing] = await Promise.all([
    getActiveZone(parsed.data.shippingZoneId),
    prisma.address.findFirst({
      where: { id: parsedId.data, userId, active: true },
      select: { id: true, isDefault: true },
    }),
  ]);

  if (!zone || !existing) {
    redirect("/mi-cuenta/direcciones?error=not-found");
  }

  const shouldBeDefault = parsed.data.isDefault || existing.isDefault;

  await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId, id: { not: existing.id } },
        data: { isDefault: false },
      });
    }

    await tx.address.update({
      where: { id: existing.id },
      data: {
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
    });
  });

  refreshAddressViews();
  redirect("/mi-cuenta/direcciones?status=updated");
}

export async function setDefaultAddress(addressId: string) {
  const userId = await requireCustomer();
  const parsedId = addressIdSchema.safeParse(addressId);
  if (!parsedId.success) return;

  const address = await prisma.address.findFirst({
    where: { id: parsedId.data, userId, active: true },
    select: { id: true },
  });

  if (!address) return;

  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: address.id }, data: { isDefault: true } }),
  ]);

  refreshAddressViews();
}

export async function archiveAddress(addressId: string) {
  const userId = await requireCustomer();
  const parsedId = addressIdSchema.safeParse(addressId);
  if (!parsedId.success) return;

  await prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: { id: parsedId.data, userId, active: true },
      select: { id: true, isDefault: true },
    });

    if (!address) return;

    await tx.address.update({
      where: { id: address.id },
      data: { active: false, isDefault: false },
    });

    if (address.isDefault) {
      const replacement = await tx.address.findFirst({
        where: { userId, active: true, id: { not: address.id } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (replacement) {
        await tx.address.update({
          where: { id: replacement.id },
          data: { isDefault: true },
        });
      }
    }
  });

  refreshAddressViews();
}
