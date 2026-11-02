import sharp from "sharp";

export class StoryImageError extends Error {}

export const MAX_STORY_FILE_BYTES = 6 * 1024 * 1024;
export async function prepareStoryImage(bytes: Buffer, declaredType: string) {
  if (!bytes.length || bytes.length > MAX_STORY_FILE_BYTES) throw new StoryImageError("La foto debe pesar hasta 6 MB.");
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
    : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;
  if (!mime || (declaredType && mime !== declaredType)) throw new StoryImageError("Elige una fotografía JPG, PNG o WebP válida.");
  try {
    const input = sharp(bytes, { limitInputPixels: 36_000_000, failOn: "warning" });
    const info = await input.metadata();
    if ((info.pages ?? 1) > 1) throw new Error("ANIMATED");
    const result = await input.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    if (result.data.length > 500 * 1024) throw new Error("TOO_LARGE");
    return { data: result.data, width: result.info.width, height: result.info.height };
  } catch { throw new StoryImageError("No pudimos preparar la foto. Usa una imagen estática JPG, PNG o WebP de hasta 36 megapíxeles y reduce su tamaño si es necesario."); }
}

/** Read multipart bytes with a hard cap and deadline before parsing File objects. */
export async function readStoryUpload(request: Request) {
  const limit = MAX_STORY_FILE_BYTES + 65536;
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new StoryImageError("La foto debe pesar hasta 6 MB.");
  const reader = request.body?.getReader();
  if (!reader) throw new StoryImageError("Selecciona una fotografía.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const data = await Promise.race([
      (async () => { const chunks: Uint8Array[] = []; let size = 0; while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > limit) throw new StoryImageError("La foto debe pesar hasta 6 MB."); chunks.push(next.value); } return Buffer.concat(chunks); })(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new StoryImageError("La carga tardó demasiado. Inténtalo de nuevo.")); void reader.cancel(); }, 20000); }),
    ]);
    const copy = new Uint8Array(data);
    try { return await new Request("http://local/upload", { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: copy }).formData(); }
    catch { throw new StoryImageError("La foto no llegó correctamente. Vuelve a elegirla e inténtalo de nuevo."); }
  } finally { clearTimeout(timer); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
