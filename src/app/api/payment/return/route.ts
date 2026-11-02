import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createIzipayNotificationHandler } from "@/modules/payments/izipay/notification-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createIzipayNotificationHandler("browser", { authenticate: async () => (await getServerSession(authOptions))?.user?.id ?? null });
