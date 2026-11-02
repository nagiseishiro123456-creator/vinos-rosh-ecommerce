"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/modules/admin/auth";
import { HistoryError, saveHistory } from "./store";
import type { HistorySaveState } from "./schema";

export async function saveHistoryAction(previous: HistorySaveState, form: FormData): Promise<HistorySaveState> {
  const session = await requireAdmin("/admin/historia");
  const snapshot = String(form.get("content") ?? "").slice(0, 60001);
  const state = { revision: previous.revision, snapshot, errors: {} };
  try {
    if (snapshot.length > 60000) throw new Error("CONTENT_TOO_LARGE");
    const revision = Number(form.get("revision"));
    const nextRevision = await saveHistory(session.user.id, revision, JSON.parse(snapshot));
    revalidatePath("/nuestra-historia"); revalidatePath("/admin/historia");
    return { ...state, revision: nextRevision, status: "saved", message: "Historia guardada correctamente." };
  } catch (error) {
    if (error instanceof z.ZodError) return { ...state, status: "error", message: "Revisa los campos señalados antes de guardar.", errors: Object.fromEntries(error.issues.map(issue => [issue.path.join("."), issue.message])) };
    if (error instanceof HistoryError) return { ...state, status: "error", message: error.code === "CONFLICT"
      ? "Otra sesión guardó cambios. Conserva tus textos y vuelve a abrir esta página antes de guardar."
      : error.code === "IMAGE_MISSING" ? "Una foto seleccionada ya no está disponible. Vuelve a subirla."
      : "Tu sesión ya no tiene permisos para modificar la historia." };
    console.error("HISTORY_SAVE_FAILED");
    return { ...state, status: "error", message: "No pudimos confirmar el guardado. Conserva tus cambios, revisa la conexión y vuelve a abrir la página." };
  }
}
