"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/modules/admin/auth";
import { AdminOperationError } from "@/modules/admin/transaction-auth";
import { dispatchPaymentConfirmation } from "@/modules/notifications/outbox-service";

export async function processConfirmation(id: string, formData: FormData) {
  const session = await requireAdmin("/admin/notificaciones");
  if (!z.string().uuid().safeParse(id).success || formData.get("confirm") !== "yes") redirect("/admin/notificaciones?result=INVALID" as Route);
  const budget = await consumeRateLimit({ scope: "payment-email-admin", identifier: session.user.id, limit: 10, windowMs: 60_000 });
  let result: string = "LIMITED";
  if (budget.allowed) {
    try { result = await dispatchPaymentConfirmation(session.user.id, id); }
    catch (error) {
      result = error instanceof AdminOperationError ? "FORBIDDEN" : "UNAVAILABLE";
      if (result === "UNAVAILABLE") console.error("PAYMENT_EMAIL_OUTBOX_UNAVAILABLE");
    }
  }
  revalidatePath("/admin/notificaciones"); revalidatePath(`/admin/notificaciones/${id}`);
  redirect(`/admin/notificaciones/${id}?result=${result}` as Route);
}
