import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { DEFAULT_HISTORY } from "../src/modules/history/content";
import { parseHistory, isHistoryImageSource } from "../src/modules/history/schema";
import { prepareStoryImage, readStoryUpload, MAX_STORY_FILE_BYTES, StoryImageError } from "../src/modules/history/images";

test("history content keeps Spanish, optional pending fields and literal text", () => {
  const value = structuredClone(DEFAULT_HISTORY); value.texts.title = "Historia, uva y tradición ñ";
  value.texts.grapeNote = ""; value.texts.juiceNote = ""; value.texts.lead = "<script>texto literal</script>";
  assert.deepEqual(parseHistory(value), value);
});
test("history content rejects empty titles, missing image descriptions and excessive text", () => {
  for (const edit of [(v: typeof DEFAULT_HISTORY) => v.texts.title = " ", (v: typeof DEFAULT_HISTORY) => v.images.cover.alt = "", (v: typeof DEFAULT_HISTORY) => v.texts.lead = "a".repeat(701)]) {
    const value = structuredClone(DEFAULT_HISTORY); edit(value); assert.throws(() => parseHistory(value));
  }
});
test("history images accept only bundled photos and stored UUID references", () => {
  assert(isHistoryImageSource("/api/story-images/82750faa-f8bf-4dca-94d1-7290f611cbde"));
  for (const src of ["https://example.com/photo.jpg", "javascript:alert(1)", "/api/story-images/../../admin", "/private/photo.png", "data:image/svg+xml,bad"]) assert.equal(isHistoryImageSource(src), false);
  const value = structuredClone(DEFAULT_HISTORY); value.images.cover.x = 101; assert.throws(() => parseHistory(value));
});
test("uploaded photos are decoded, resized without upscaling and stored as WebP", async () => {
  const bytes = await sharp({ create: { width: 64, height: 80, channels: 3, background: "#4b1c71" } }).png().toBuffer();
  const image = await prepareStoryImage(bytes, "image/png"); const meta = await sharp(image.data).metadata();
  assert.equal(meta.format, "webp"); assert.equal(image.width, 64); assert.equal(image.height, 80); assert.equal(meta.exif, undefined);
});
test("SVG, mismatched MIME, invalid bitstreams and oversized photos are rejected", async () => {
  await assert.rejects(prepareStoryImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), "image/svg+xml"), StoryImageError);
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(prepareStoryImage(png, "image/jpeg"), StoryImageError);
  await assert.rejects(prepareStoryImage(Buffer.from([255,216,255,0]), "image/jpeg"), StoryImageError);
  await assert.rejects(prepareStoryImage(Buffer.alloc(MAX_STORY_FILE_BYTES + 1), "image/png"), StoryImageError);
});
test("upload reader rejects declared or actual oversized bodies before multipart parsing", async () => {
  const declared = new Request("http://local", { method: "POST", headers: { "content-length": "99999999" }, body: "x" });
  await assert.rejects(readStoryUpload(declared), StoryImageError);
  const actual = new Request("http://local", { method: "POST", body: new Uint8Array(MAX_STORY_FILE_BYTES + 65537) });
  await assert.rejects(readStoryUpload(actual), StoryImageError);
});
