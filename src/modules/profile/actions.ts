"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ]{7,16}$/).optional().or(z.literal("")),
});

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/iniciar-sesion");
  }

  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    redirect("/mi-cuenta/perfil?error=invalid");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone ? parsed.data.phone.replace(/\s+/g, "") : null,
    },
  });

  revalidatePath("/mi-cuenta");
  revalidatePath("/mi-cuenta/perfil");
  revalidatePath("/checkout");
  redirect("/mi-cuenta/perfil?status=updated");
}
