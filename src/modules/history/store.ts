import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_HISTORY } from "./content";
import { parseHistory } from "./schema";

export class HistoryError extends Error {
  constructor(public code: "FORBIDDEN" | "CONFLICT" | "IMAGE_MISSING") { super(code); }
}
export type HistoryRow = { content: unknown; revision: number; updatedAt: Date };
export async function readHistory() {
  const rows = await prisma.$queryRaw<HistoryRow[]>`SELECT "content", "revision", "updatedAt" FROM "HistoryPage" WHERE "id" = 'story'`;
  return rows[0] ? { content: parseHistory(rows[0].content), revision: rows[0].revision, updatedAt: rows[0].updatedAt }
    : { content: DEFAULT_HISTORY, revision: 0, updatedAt: null };
}
async function admin(tx: Prisma.TransactionClient, actorId: string) {
  const user = await tx.user.findUnique({ where: { id: actorId }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new HistoryError("FORBIDDEN");
}
export async function saveHistory(actorId: string, revision: number, value: unknown) {
  const content = parseHistory(value);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new HistoryError("CONFLICT");
  return prisma.$transaction(async tx => {
    await admin(tx, actorId);
    const ids = [...new Set(Object.values(content.images).map(p => p.src).filter(src => src.startsWith("/api/story-images/")).map(src => src.slice(18)))];
    if (ids.length) {
      const found = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id"::text FROM "StoryImage" WHERE "id"::text IN (${Prisma.join(ids)})`);
      if (found.length !== ids.length) throw new HistoryError("IMAGE_MISSING");
    }
    const json = JSON.stringify(content);
    const rows = revision === 0
      ? await tx.$queryRaw<Array<{ revision: number }>>`INSERT INTO "HistoryPage" ("id", "content") VALUES ('story', ${json}::jsonb) ON CONFLICT ("id") DO NOTHING RETURNING "revision"`
      : await tx.$queryRaw<Array<{ revision: number }>>`UPDATE "HistoryPage" SET "content"=${json}::jsonb, "revision"="revision"+1, "updatedAt"=CURRENT_TIMESTAMP WHERE "id"='story' AND "revision"=${revision} RETURNING "revision"`;
    if (!rows[0]) throw new HistoryError("CONFLICT");
    return rows[0].revision;
  });
}
export async function storeStoryImage(actorId: string, image: { data: Buffer; width: number; height: number }) {
  return prisma.$transaction(async tx => {
    await admin(tx, actorId);
    const id = randomUUID();
    await tx.$executeRaw`INSERT INTO "StoryImage" ("id", "data", "width", "height") VALUES (${id}::uuid, ${image.data}, ${image.width}, ${image.height})`;
    return `/api/story-images/${id}`;
  });
}
