"use client";
import { useActionState, useState } from "react";
import { recordSettlement, type SettlementFormState } from "../actions";

type Values = { commissionAmount: string; depositedAmount: string; depositReference: string; depositDate: string; sourceReference: string; reason: string };
export function SettlementForm({ paymentId, revision, initial }: { paymentId: string; revision: number; initial: Omit<Values, "reason"> }) {
  const [values, setValues] = useState<Values>({ ...initial, reason: "" });
  const [state, action, pending] = useActionState(recordSettlement.bind(null, paymentId), {} as SettlementFormState);
  const field = (name: keyof Values) => ({ name, id: name, value: values[name], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [name]: event.target.value }), "aria-invalid": !!state.errors?.[name], "aria-describedby": `${name}-help ${name}-error` });
  const error = (name: keyof Values) => <span className="settlementFieldError" id={`${name}-error`}>{state.errors?.[name]}</span>;
  return <form action={action} className="adminCard settlementForm"><h2>{revision === 0 ? "Registrar reporte revisado" : "Corregir registro"}</h2><p>Cada guardado conserva el cambio y su motivo en el historial.</p>
    {state.message ? <p role="alert" className="settlementNotice">{state.message}</p> : null}<input type="hidden" name="expectedRevision" value={revision} />
    <label htmlFor="commissionAmount">Comisión verificada (S/)</label><input {...field("commissionAmount")} inputMode="decimal" maxLength={11} placeholder="Ejemplo: 2.50" /><small id="commissionAmount-help">Vacío: desconocida. 0.00: comprobaste que no hubo comisión.</small>{error("commissionAmount")}
    <label htmlFor="depositedAmount">Importe abonado (S/)</label><input {...field("depositedAmount")} inputMode="decimal" maxLength={11} placeholder="Ejemplo: 95.70" /><small id="depositedAmount-help">Importe de este pago identificado en la cuenta. Vacío: sin verificar.</small>{error("depositedAmount")}
    <label htmlFor="depositReference">Referencia del abono</label><input {...field("depositReference")} maxLength={120} /><small id="depositReference-help">Referencia que permite encontrar este abono en el extracto.</small>{error("depositReference")}
    <label htmlFor="depositDate">Fecha del abono</label><input {...field("depositDate")} type="date" /><small id="depositDate-help">Fecha que figura en la cuenta del negocio, según Perú.</small>{error("depositDate")}
    <label htmlFor="sourceReference">Reporte o extracto revisado</label><input {...field("sourceReference")} maxLength={120} required /><small id="sourceReference-help">Identifica la fuente. Evita números de cuenta completos o credenciales.</small>{error("sourceReference")}
    <label htmlFor="reason">Motivo del registro o corrección</label><textarea {...field("reason")} maxLength={500} required rows={3} /><small id="reason-help">Explica qué verificaste o por qué cambias el registro anterior.</small>{error("reason")}
    <label className="settlementCheck"><input name="confirm" type="checkbox" value="yes" required /> Confirmo que revisé los datos del reporte y de la cuenta del negocio.</label>
    <button className="button buttonDark" disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar conciliación"}</button>
  </form>;
}
