import "server-only";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createMicuentawebStatusHandler } from "@/modules/payments/izipay/status-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createMicuentawebStatusHandler({
  authenticate: async () => (await getServerSession(authOptions))?.user?.id ?? null,
});
