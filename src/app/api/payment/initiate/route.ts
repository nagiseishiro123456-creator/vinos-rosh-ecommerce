import "server-only";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createMicuentawebInitiationHandler } from "@/modules/payments/izipay/initiation-handler";
import { resolveGatewayEnvironment } from "@/modules/payments/izipay/gateway-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createMicuentawebInitiationHandler({
  environment: async () => resolveGatewayEnvironment(process.env, true),
  authenticate: async () => (await getServerSession(authOptions))?.user?.id ?? null,
});
