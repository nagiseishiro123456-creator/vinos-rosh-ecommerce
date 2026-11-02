import "server-only";
import { createIzipayNotificationHandler } from "@/modules/payments/izipay/notification-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createIzipayNotificationHandler("ipn", { authenticate: async () => null });
