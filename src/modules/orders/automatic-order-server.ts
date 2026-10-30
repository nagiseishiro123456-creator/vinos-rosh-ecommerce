import "server-only";
import { reserveMicuentawebSandboxOrder } from "./automatic-order-service";
import type { AutomaticOrderInput } from "./automatic-order-input";

// Trusted server facade. HTTP requests use automatic-order-handler with session/origin/rate limits.
export function reserveIzipayTestOrder(userId: string, submitted: AutomaticOrderInput) {
  return reserveMicuentawebSandboxOrder(userId, submitted, process.env);
}
