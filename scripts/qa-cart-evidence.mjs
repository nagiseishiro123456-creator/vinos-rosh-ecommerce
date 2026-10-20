import { readdirSync, readFileSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { createHash } from "node:crypto";
const root = process.argv[2], project = process.argv[3];
if (!root || !["desktop", "mobile", "small-mobile", "tablet"].includes(project)) throw new Error("Expected artifact directory and project");
function walk(directory) { return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]); }
let count = 0;
for (const file of walk(root).sort()) {
  const path = relative(root, file).replaceAll("\\", "/");
  if (!path.startsWith("test-results/") || !path.includes("cart-drawer-")) continue;
  const directory = path.split("/").find((part) => part.includes("cart-drawer-")) ?? "";
  const found = ["small-mobile", "desktop", "mobile", "tablet"].find((name) => directory.endsWith("-" + name));
  if (found !== project) continue;
  if (basename(file) === "drawer-chunks.json") { console.log("S205_METRIC " + readFileSync(file, "utf8")); continue; }
  if (!/^(5[2-9]|6[0-4])-.*\.png$/.test(basename(file)) && basename(file) !== "test-failed-1.png") continue;
  const bytes = readFileSync(file);
  const meta = { project, path, file: basename(file), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    blobSha: createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex"),
    sourceCommit: process.env.SOURCE_COMMIT, ciSha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID };
  console.log("S205_PNG_META " + JSON.stringify(meta));
  const base64 = bytes.toString("base64");
  for (let index = 0; index < base64.length; index += 4000) console.log("S205_PNG_CHUNK " + JSON.stringify({ path, index: index / 4000, data: base64.slice(index, index + 4000) }));
  console.log("S205_PNG_END " + path); count++;
}
console.log("S205_EVIDENCE_COUNT " + JSON.stringify({ project, count }));
