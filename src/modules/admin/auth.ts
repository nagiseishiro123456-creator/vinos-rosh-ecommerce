import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export async function requireAdmin(callbackUrl = "/admin") {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/iniciar-sesion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (session.user.role !== "ADMIN") {
    redirect("/mi-cuenta");
  }

  return session;
}
