import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { AdminOperationError } from "@/modules/admin/transaction-auth";
import { OrderRefundError } from "@/modules/orders/refund-service";

export const operationMessages: Record<string, string> = {
  changed: "Operación registrada correctamente.",
  unchanged: "El pedido ya cambió. Revisa su estado actual antes de continuar.",
  invalid: "Completa los datos y la confirmación solicitada.",
  FORBIDDEN: "Tu cuenta ya no tiene permisos de administración.",
  STATE_CHANGED: "Otra operación modificó el pedido. Revisa el estado actual.",
  INCONSISTENT: "No se puede ejecutar la operación: revisa el estado, importe, moneda y reserva. No se modificó el stock.",
  INVALID_INPUT: "Los datos no son válidos. Revisa los campos solicitados.",
  DUPLICATE_OPERATION: "Esta operación bancaria ya está registrada. Verifica su pedido antes de continuar.",
};

export async function adminOperation(orderId: string | undefined, destination: string, operation: () => Promise<{ changed: boolean }>) {
  let result: string;
  try { result = (await operation()).changed ? "changed" : "unchanged"; }
  catch (error) {
    if (error instanceof AdminOperationError) result = error.code;
    else if (error instanceof OrderRefundError) result = "STATE_CHANGED";
    else throw error;
  }
  for (const path of ["/admin/pagos", "/admin/pedidos", "/admin/inventario", "/admin", "/mi-cuenta"]) revalidatePath(path);
  if (orderId) {
    revalidatePath(`/admin/pedidos/${orderId}`);
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { number: true } });
    if (order) { revalidatePath(`/pedidos/${order.number}`); revalidatePath(`/pedidos/${order.number}/pagar`); }
  }
  redirect(`${destination}?result=${result}` as Route);
}
