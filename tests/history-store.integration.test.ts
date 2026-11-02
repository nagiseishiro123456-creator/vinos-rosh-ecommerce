import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_HISTORY } from "../src/modules/history/content";
import { readHistory, saveHistory, storeStoryImage, HistoryError, type HistoryRow } from "../src/modules/history/store";
import { prepareStoryImage } from "../src/modules/history/images";
import { buildBusinessBackup } from "../src/modules/admin/backup/export";

test("history persists text/photos, rejects stale edits and permissions, and exports restorable media", async t => {
  if (process.env.SMOKE_TEST_DATA !== "true") return t.skip("Isolated CI database required");
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const customer = await prisma.user.create({ data: { email: `history-${crypto.randomUUID()}@example.test`, firstName: "QA", lastName: "History", passwordHash: "not-a-login" } });
  const original = await prisma.$queryRaw<HistoryRow[]>`SELECT "content", "revision", "updatedAt" FROM "HistoryPage" WHERE "id"='story'`;
  let src = "";
  try {
    await prisma.$executeRaw`DELETE FROM "HistoryPage" WHERE "id"='story'`;
    assert.equal((await readHistory()).revision, 0);
    await assert.rejects(saveHistory(customer.id, 0, DEFAULT_HISTORY), (e: unknown) => e instanceof HistoryError && e.code === "FORBIDDEN");
    const png = await sharp({ create: { width: 64, height: 80, channels: 3, background: "#4b1c71" } }).png().toBuffer();
    const image = await prepareStoryImage(png, "image/png"); src = await storeStoryImage(admin.id, image);
    const data = structuredClone(DEFAULT_HISTORY); data.texts.title = "Historia persistida QA"; data.images.cover.src = src;
    assert.equal(await saveHistory(admin.id, 0, data), 1);
    assert.equal((await readHistory()).content.images.cover.src, src);
    const edits = await Promise.allSettled([saveHistory(admin.id, 1, data), saveHistory(admin.id, 1, data)]);
    assert.equal(edits.filter(r => r.status === "fulfilled").length, 1);
    const rejected = edits.find(r => r.status === "rejected") as PromiseRejectedResult;
    assert.equal(rejected.reason.code, "CONFLICT");
    const invalid = structuredClone(data); invalid.images.grape.src = "/api/story-images/00000000-0000-4000-8000-000000000000";
    await assert.rejects(saveHistory(admin.id, 2, invalid), (e: unknown) => e instanceof HistoryError && e.code === "IMAGE_MISSING");
    const backup = await buildBusinessBackup(); assert.equal(backup.meta.version, 4);
    assert.equal(backup.historyPages[0].content && (backup.historyPages[0].content as { texts: { title: string } }).texts.title, data.texts.title);
    const stored = backup.storyImages.find(row => row.id === src.slice(18)); assert(stored);
    assert.deepEqual(Buffer.from(stored.dataBase64, "base64"), image.data);
  } finally {
    await prisma.$executeRaw`DELETE FROM "HistoryPage" WHERE "id"='story'`;
    if (original[0]) await prisma.$executeRaw`INSERT INTO "HistoryPage" ("id","content","revision","updatedAt") VALUES ('story',${JSON.stringify(original[0].content)}::jsonb,${original[0].revision},${original[0].updatedAt})`;
    if (src) await prisma.$executeRaw`DELETE FROM "StoryImage" WHERE "id"=${src.slice(18)}::uuid`;
    await prisma.user.delete({ where: { id: customer.id } });
  }
});
