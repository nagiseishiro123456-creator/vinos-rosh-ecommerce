import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin(callbackUrl = "/admin") {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (session.user.role !== "ADMIN" || account?.role !== "ADMIN") {
    redirect("/mi-cuenta");
  }

  return session;
}
