"use client";
import Image from "next/image";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useActionState, useState, type ChangeEvent } from "react";
import { saveHistoryAction } from "@/modules/history/actions";
import { DEFAULT_HISTORY, HISTORY_TEXT_FIELDS, HISTORY_IMAGE_SLOTS, HISTORY_IMAGE_LABELS, type HistoryContent, type HistoryImageSlot } from "@/modules/history/content";
import type { HistorySaveState } from "@/modules/history/schema";
import styles from "./history-editor.module.css";

export function HistoryEditor({ initial, revision }: { initial: HistoryContent; revision: number }) {
  const [content, setContent] = useState(initial);
  const [uploading, setUploading] = useState<HistoryImageSlot | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [state, action, pending] = useActionState(saveHistoryAction, { revision, status: "idle", message: "", snapshot: "", errors: {} } as HistorySaveState);
  const snapshot = JSON.stringify(content);
  const unchanged = state.snapshot === snapshot;
  const errors = unchanged ? state.errors : {};
  const groups = [["Cabecera y datos", 0, 11], ["01 · La uva", 11, 16], ["02 · El zumo", 16, 21], ["03 · La mesa", 21, 30], ["Cierre y pie de página", 30, 34]] as const;
  function photo(slot: HistoryImageSlot, key: string, value: string | number) {
    setContent(current => ({ ...current, images: { ...current.images, [slot]: { ...current.images[slot], [key]: value } } }));
  }
  async function upload(slot: HistoryImageSlot, event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget, file = input.files?.[0];
    if (!file) return;
    setUploadError(""); setUploadMessage("");
    if (file.size > 6 * 1024 * 1024) { setUploadError("La foto debe pesar hasta 6 MB. Reduce su tamaño y vuelve a elegirla."); input.value = ""; return; }
    setUploading(slot);
    try {
      const form = new FormData(); form.set("image", file);
      const response = await fetch("/api/admin/history/images", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || typeof result.src !== "string") throw new Error(result.message || "No pudimos subir la foto.");
      photo(slot, "src", result.src); setUploadMessage("Foto preparada. Guarda la página para publicarla.");
    } catch (error) { setUploadError(error instanceof Error && !(error instanceof TypeError || error instanceof SyntaxError) ? error.message : "No pudimos subir la foto. Revisa la conexión e inténtalo de nuevo."); }
    finally { setUploading(null); input.value = ""; }
  }
  return <form action={action} className={`adminForm ${styles.editor}`} aria-busy={pending || uploading !== null} onInvalidCapture={event => (event.target as HTMLElement).closest("details")?.setAttribute("open", "")}>
    <input type="hidden" name="content" value={snapshot} /><input type="hidden" name="revision" value={state.revision} />
    <fieldset className="adminPanel" disabled={pending || uploading !== null}>
      <legend>Textos de Nuestra historia</legend>
      <p>La variedad de uva y la elaboración son opcionales. Aparecerán en la página cuando los completes.</p>
      {groups.map(([title, start, end], index) => <details className={styles.group} key={title} open={index === 0 || HISTORY_TEXT_FIELDS.slice(start, end).some(([key]) => errors[`texts.${key}`])}><summary>{title}</summary>
      <div className="adminFormGrid">{HISTORY_TEXT_FIELDS.slice(start, end).map(([key, label, limit]) => <div className={`adminField ${limit > 120 ? "adminFieldWide" : ""}`} key={key}>
        <label htmlFor={`history-${key}`}>{label}</label>
        <textarea id={`history-${key}`} required={key !== "grapeNote" && key !== "juiceNote"} maxLength={limit} rows={limit > 300 ? 3 : 2} value={content.texts[key]}
          aria-invalid={Boolean(errors[`texts.${key}`])} aria-describedby={errors[`texts.${key}`] ? `error-${key}` : undefined}
          placeholder={key === "grapeNote" ? "Variedad de uva y época de cosecha, cuando estén confirmadas." : key === "juiceNote" ? "Cómo se elabora y qué lo hace distinto, cuando esté confirmado." : undefined}
          onChange={e => setContent(current => ({ ...current, texts: { ...current.texts, [key]: e.target.value } }))} />
        {errors[`texts.${key}`] && <small id={`error-${key}`} role="alert">{errors[`texts.${key}`]}</small>}
      </div>)}</div></details>)}
    </fieldset>
    <fieldset className="adminPanel" disabled={pending || uploading !== null}>
      <legend>Fotografías</legend><p>JPG, PNG o WebP de hasta 6 MB. Reemplaza la foto, describe lo que muestra y ajusta el encuadre. Guarda al terminar para publicar los cambios.</p>
      <div className={styles.photos}>{HISTORY_IMAGE_SLOTS.map(slot => <section key={slot} className={styles.photo}>
        <h2>{HISTORY_IMAGE_LABELS[slot]}</h2>
        <div className={`${styles.preview} ${styles[slot]}`}><Image unoptimized src={content.images[slot].src} alt={content.images[slot].alt} fill sizes="300px" style={{ objectFit: "cover", objectPosition: `${content.images[slot].x}% ${content.images[slot].y}%` }} /></div>
        <label className="adminField">Reemplazar foto: {HISTORY_IMAGE_LABELS[slot]}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void upload(slot, e)} /></label>
        <label className="adminField">Descripción de {slot === "cover" ? "la cabecera" : HISTORY_IMAGE_LABELS[slot]}<input required minLength={3} maxLength={240} value={content.images[slot].alt} onChange={e => photo(slot, "alt", e.target.value)} aria-invalid={Boolean(errors[`images.${slot}.alt`])} /></label>
        <div className={styles.crop}>{(["x", "y"] as const).map(axis => <label className="adminField" key={axis}>{axis === "x" ? "Encuadre horizontal" : "Encuadre vertical"}<input type="number" min={0} max={100} required value={content.images[slot][axis]} onChange={e => photo(slot, axis, Number(e.target.value))} aria-label={`${HISTORY_IMAGE_LABELS[slot]}: encuadre ${axis === "x" ? "horizontal" : "vertical"}`} /></label>)}</div>
        {Object.entries(errors).filter(([key]) => key.startsWith(`images.${slot}.`)).map(([key, value]) => <small role="alert" key={key}>{value}</small>)}
        <button className="button buttonGhostLight" type="button" onClick={() => setContent(current => ({ ...current, images: { ...current.images, [slot]: { ...DEFAULT_HISTORY.images[slot] } } }))}>Usar foto original</button>
      </section>)}</div>
    </fieldset>
    {uploading && <p role="status">Preparando fotografía…</p>}
    {uploadError && <p className="adminAlert error" role="alert">{uploadError}</p>}
    {uploadMessage && <p role="status">{uploadMessage}</p>}
    <button className="button buttonPrimary" type="submit" disabled={pending || uploading !== null}>{pending ? <><LoaderCircle size={18} aria-hidden="true" /> Guardando…</> : "Guardar historia e imágenes"}</button>
    {state.status !== "idle" && <div className={`adminAlert ${unchanged ? state.status === "saved" ? "success" : "error" : ""}`} role={unchanged && state.status === "error" ? "alert" : "status"} data-testid="history-save-feedback">
      {unchanged && state.status === "saved" && <CheckCircle2 size={20} aria-hidden="true" />} {unchanged ? state.message : "Hay cambios sin guardar."}
    </div>}
  </form>;
}
