"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/modules/admin/auth";
import { runMaintenance } from "@/modules/maintenance/service";

export async function runMaintenanceFromAdmin() {
  await requireAdmin("/admin/lanzamiento");

  await runMaintenance();

  revalidatePath("/admin/lanzamiento");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin/pedidos");
  revalidatePath("/productos");
}
