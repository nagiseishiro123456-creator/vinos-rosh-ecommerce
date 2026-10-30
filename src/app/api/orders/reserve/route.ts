import "server-only";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createAutomaticOrderReservationHandler } from "@/modules/orders/automatic-order-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createAutomaticOrderReservationHandler({
  authenticate: async () => (await getServerSession(authOptions))?.user?.id ?? null,
});
