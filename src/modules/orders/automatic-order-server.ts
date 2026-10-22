import "server-only";
import { reserveMicuentawebSandboxOrder } from "./automatic-order-service";
import type { AutomaticOrderInput } from "./automatic-order-input";

// Not a Server Action or a public endpoint. Future caller must enforce session/CSRF/rate limits.
export function reserveIzipayTestOrder(userId: string, submitted: AutomaticOrderInput) {
  return reserveMicuentawebSandboxOrder(userId, submitted, process.env);
}
