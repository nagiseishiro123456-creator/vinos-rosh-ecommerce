import { readdirSync, readFileSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { createHash } from "node:crypto";
const root = process.argv[2], project = process.argv[3];
const integration = process.env.EVIDENCE_STORY === "S206";
const registration = process.env.EVIDENCE_STORY === "AUTH_LOCAL";
const tag = registration ? "AUTH_LOCAL" : integration ? "S206" : "S205";
const spec = registration ? "registration-limits-" : integration ? "sprint-02-integration-" : "cart-drawer-";
if (!root || !["desktop", "mobile", "small-mobile", "tablet"].includes(project)) throw new Error("Expected artifact directory and project");
function walk(directory) { return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]); }
let count = 0;
for (const file of walk(root).sort()) {
  const path = relative(root, file).replaceAll("\\", "/");
  if (!path.startsWith("test-results/") || !path.includes(spec) || path.includes("/attachments/")) continue;
  const directory = path.split("/").find((part) => part.includes(spec)) ?? "";
  const found = ["small-mobile", "desktop", "mobile", "tablet"].find((name) => directory.endsWith("-" + name));
  if (found !== project) continue;
  if (basename(file) === "drawer-chunks.json") { console.log(tag + "_METRIC " + readFileSync(file, "utf8")); continue; }
  const accepted = registration ? /^auth-0[12]-.*\.png$/ : integration ? /^6[6-8]-.*\.png$/ : /^(5[2-9]|6[0-5])-.*\.png$/;
  if (!accepted.test(basename(file)) && basename(file) !== "test-failed-1.png") continue;
  const bytes = readFileSync(file);
  const meta = { project, path, file: basename(file), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    blobSha: createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex"),
    sourceCommit: process.env.SOURCE_COMMIT, ciSha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID };
  console.log(tag + "_PNG_META " + JSON.stringify(meta));
  const base64 = bytes.toString("base64");
  for (let index = 0; index < base64.length; index += 4000) console.log(tag + "_PNG_CHUNK " + JSON.stringify({ path, index: index / 4000, data: base64.slice(index, index + 4000) }));
  console.log(tag + "_PNG_END " + path); count++;
}
console.log(tag + "_EVIDENCE_COUNT " + JSON.stringify({ project, count }));
