import "server-only";
import { requestMicuentawebSandboxFormToken, type PersistedPaymentSnapshot } from "./micuentaweb-core";

/** Server-only entry point. No route or existing checkout imports this preparation yet. */
export function requestIzipayTestFormToken(snapshot: PersistedPaymentSnapshot) {
  return requestMicuentawebSandboxFormToken(snapshot, process.env);
}
