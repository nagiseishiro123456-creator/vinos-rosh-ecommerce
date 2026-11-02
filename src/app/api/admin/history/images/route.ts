import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isCurrentAdmin } from "@/modules/admin/auth";
import { prepareStoryImage, readStoryUpload, StoryImageError } from "@/modules/history/images";
import { storeStoryImage, HistoryError } from "@/modules/history/store";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !await isCurrentAdmin(session)) return Response.json({ message: "Ingresa con una cuenta administradora." }, { status: 403 });
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try { sameOrigin = Boolean(origin && new URL(origin).origin === new URL(request.url).origin); } catch { /* Reject malformed origins. */ }
  if (!sameOrigin) return Response.json({ message: "Recarga la página e inténtalo de nuevo." }, { status: 403 });
  try {
    const form = await readStoryUpload(request);
    const file = form.get("image");
    if (!(file instanceof File)) return Response.json({ message: "Selecciona una fotografía." }, { status: 400 });
    const image = await prepareStoryImage(Buffer.from(await file.arrayBuffer()), file.type);
    const src = await storeStoryImage(session.user.id, image);
    return Response.json({ src }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof HistoryError) return Response.json({ message: "La sesión ya no tiene permisos para subir fotos." }, { status: 403 });
    return Response.json({ message: error instanceof StoryImageError ? error.message : "No pudimos guardar la foto. Inténtalo de nuevo." }, { status: error instanceof StoryImageError ? 400 : 500 });
  }
}
