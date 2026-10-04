"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const shippingZoneSchema = z.object({
  department: z.string().trim().min(2).max(80).default("Lima"),
  province: z.string().trim().min(2).max(80).default("Lima"),
  district: z.string().trim().min(2).max(100),
  price: z.coerce.number().positive().max(10000),
});

const zoneIdSchema = z.string().cuid();

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion?callbackUrl=/admin/envios");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/mi-cuenta");
  }
  return session.user.id;
}

export async function saveShippingZone(formData: FormData) {
  await requireAdmin();

  const parsed = shippingZoneSchema.safeParse({
    department: formData.get("department") || "Lima",
    province: formData.get("province") || "Lima",
    district: formData.get("district"),
    price: formData.get("price"),
  });

  if (!parsed.success) {
    redirect("/admin/envios?error=invalid");
  }

  const { department, province, district, price } = parsed.data;

  await prisma.shippingZone.upsert({
    where: {
      department_province_district: { department, province, district },
    },
    create: {
      department,
      province,
      district,
      price,
      active: true,
    },
    update: {
      price,
      active: true,
    },
  });

  revalidatePath("/admin/envios");
  revalidatePath("/checkout");
  redirect("/admin/envios?saved=1");
}

export async function toggleShippingZone(zoneId: string) {
  await requireAdmin();

  const parsedId = zoneIdSchema.safeParse(zoneId);
  if (!parsedId.success) return;

  const zone = await prisma.shippingZone.findUnique({
    where: { id: parsedId.data },
    select: { id: true, active: true },
  });

  if (!zone) return;

  await prisma.shippingZone.update({
    where: { id: zone.id },
    data: { active: !zone.active },
  });

  revalidatePath("/admin/envios");
  revalidatePath("/checkout");
}
