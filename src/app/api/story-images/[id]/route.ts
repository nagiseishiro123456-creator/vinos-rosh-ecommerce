import { prisma } from "@/lib/prisma";
import { STORY_IMAGE_ID } from "@/modules/history/schema";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!STORY_IMAGE_ID.test(id)) return new Response(null, { status: 404 });
  const rows = await prisma.$queryRaw<Array<{ data: Uint8Array }>>`SELECT "data" FROM "StoryImage" WHERE "id"=${id}::uuid`;
  if (!rows[0]) return new Response(null, { status: 404 });
  const etag = `"${id}"`;
  const headers = { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", ETag: etag };
  return request.headers.get("if-none-match") === etag ? new Response(null, { status: 304, headers })
    : new Response(new Uint8Array(rows[0].data), { headers });
}
