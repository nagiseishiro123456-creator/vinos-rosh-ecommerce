import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { rateLimitKey } from "@/lib/rate-limit";
import { isLocalRegistrationEnvironment } from "./registration-policy";

/** Local CLI only. No HTTP action, authentication bypass or password change. */
export async function unlockLocalRegistration(
  environment: Readonly<Record<string, string | undefined>>,
  extraIps: string[] = [],
) {
  if (!isLocalRegistrationEnvironment(environment)) throw new Error("LOCAL_REGISTRATION_ONLY");
  if (extraIps.length > 16 || extraIps.some((ip) => !isIP(ip))) throw new Error("INVALID_LOCAL_REGISTRATION_IP");
  const identifiers = new Set(["unknown", "127.0.0.1", "::1", "::ffff:127.0.0.1", ...extraIps]);
  const keys = ["auth-register", "auth-register-local"].flatMap((scope) =>
    [...identifiers].map((ip) => rateLimitKey(scope, ip)));
  return prisma.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
}
