"use server";

import { ContactMessageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/modules/admin/auth";

const updateSchema = z.object({
  id: z.string().cuid(),
  status: z.nativeEnum(ContactMessageStatus),
});

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
) {
  await requireAdmin("/admin/contactos");

  const parsed = updateSchema.safeParse({ id, status });
  if (!parsed.success) return;

  await prisma.contactMessage.updateMany({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/contactos");
}
