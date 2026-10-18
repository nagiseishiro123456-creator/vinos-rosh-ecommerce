import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function isCurrentAdmin(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") return false;
  const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return account?.role === "ADMIN";
}

export async function requireAdmin(callbackUrl = "/admin") {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!(await isCurrentAdmin(session))) {
    redirect("/mi-cuenta");
  }

  return session;
}
