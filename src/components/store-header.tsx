import { getServerSession } from "next-auth";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
export async function StoreHeader() {
  const session = await getServerSession(authOptions);
  return <SiteHeader isAuthenticated={Boolean(session?.user)} isAdmin={session?.user?.role === "ADMIN"} />;
}
