import { getServerSession } from "next-auth";
import { SiteHeader } from "@/components/site-header";
import { authOptions } from "@/lib/auth";
import { getCommerceSettings } from "@/modules/settings/queries";
export async function StoreHeader() {
  const [session, commerce] = await Promise.all([getServerSession(authOptions), getCommerceSettings()]);
  return <SiteHeader userId={session?.user?.id ?? null} isAuthenticated={Boolean(session?.user)} isAdmin={session?.user?.role === "ADMIN"} phone={commerce.whatsappPhone} />;
}
