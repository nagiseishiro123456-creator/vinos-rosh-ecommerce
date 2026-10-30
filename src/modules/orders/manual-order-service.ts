import { manualOrderSchema, type ManualOrderInput } from "./manual-order-input";
import { reserveOrder, OrderReservationError } from "./order-reservation-core";

export { OrderReservationError as ManualOrderError, CheckoutConflictError } from "./order-reservation-core";
export type { ManualOrderInput } from "./manual-order-input";

export async function reserveManualOrder(userId: string, submitted: ManualOrderInput) {
  const parsed = manualOrderSchema.safeParse(submitted);
  if (!parsed.success) throw new OrderReservationError("INVALID_CONFIRMATION");
  return reserveOrder(userId, { ...parsed.data, kind: "manual" });
}
