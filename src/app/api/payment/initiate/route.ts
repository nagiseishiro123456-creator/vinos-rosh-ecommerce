import "server-only";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createMicuentawebInitiationHandler } from "@/modules/payments/izipay/initiation-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createMicuentawebInitiationHandler({
  authenticate: async () => (await getServerSession(authOptions))?.user?.id ?? null,
});
