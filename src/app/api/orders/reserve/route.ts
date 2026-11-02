import "server-only";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createAutomaticOrderReservationHandler } from "@/modules/orders/automatic-order-handler";
import { resolveGatewayEnvironment } from "@/modules/payments/izipay/gateway-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createAutomaticOrderReservationHandler({
  environment: async () => resolveGatewayEnvironment(),
  authenticate: async () => (await getServerSession(authOptions))?.user?.id ?? null,
});
