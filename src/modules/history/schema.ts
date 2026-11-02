import { z } from "zod";
import { DEFAULT_HISTORY, HISTORY_TEXT_FIELDS, type HistoryContent } from "./content";

export const STORY_IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultImages = new Set(Object.values(DEFAULT_HISTORY.images).map(p => p.src));
export function isHistoryImageSource(src: string) {
  return defaultImages.has(src) || (src.startsWith("/api/story-images/") && STORY_IMAGE_ID.test(src.slice(18)));
}
const photo = z.object({
  src: z.string().max(160).refine(isHistoryImageSource, "Selecciona una fotografía válida."),
  alt: z.string().trim().min(3, "Describe brevemente la fotografía.").max(240),
  x: z.number().int().min(0).max(100), y: z.number().int().min(0).max(100),
}).strict();
export const historySchema = z.object({
  texts: z.object(Object.fromEntries(HISTORY_TEXT_FIELDS.map(([key, , limit]) => [key,
    z.string().trim().min(key === "grapeNote" || key === "juiceNote" ? 0 : 1, "Completa este texto.").max(limit, `Usa hasta ${limit} caracteres.`),
  ]))).strict(),
  images: z.object({ cover: photo, grape: photo, juice: photo, table: photo }).strict(),
}).strict();
export function parseHistory(value: unknown): HistoryContent {
  return historySchema.parse(value) as HistoryContent;
}
export type HistorySaveState = { revision: number; status: "idle" | "saved" | "error"; message: string; snapshot: string; errors: Record<string, string> };
