import { automaticOrderSchema, type AutomaticOrderInput } from "./automatic-order-input";
import { reserveOrder, OrderReservationError } from "./order-reservation-core";
import type { SandboxEnvironment } from "@/modules/payments/izipay/micuentaweb-core";

/** Internal service. userId must come from the authenticated server, never a body field. */
export function reserveMicuentawebSandboxOrder(userId: string, submitted: AutomaticOrderInput, environment: SandboxEnvironment) {
  const parsed = automaticOrderSchema.safeParse(submitted);
  if (!parsed.success || parsed.data.expectedUserId !== userId) throw new OrderReservationError("INVALID_CONFIRMATION");
  return reserveOrder(userId, { ...parsed.data, kind: "micuentaweb-test" }, { ...environment });
}
