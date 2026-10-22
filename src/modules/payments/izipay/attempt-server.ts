import "server-only";

import { beginMicuentawebSandboxAttempt } from "@/modules/payments/izipay/attempt-service";

// Future Route Handler must authenticate/limit requests before calling this entry point.
// This entry point is not imported by any live checkout or public route.
export function prepareMicuentawebSandboxAttempt(userId: string, orderId: string) {
  return beginMicuentawebSandboxAttempt(userId, orderId, process.env);
}
