import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const before = JSON.parse(execFileSync("git", ["show", "HEAD:package-lock.json"], { encoding: "utf8" }));
const after = JSON.parse(readFileSync("package-lock.json", "utf8"));
const added = Object.fromEntries(Object.entries(after.packages).filter(([key]) => !(key in before.packages)));
const changed = Object.keys(before.packages).filter((key) => key && JSON.stringify(before.packages[key]) !== JSON.stringify(after.packages[key]));
const removed = Object.keys(before.packages).filter((key) => !(key in after.packages));
console.log("S205_LOCK_DELTA " + JSON.stringify({ root: after.packages[""], added, changed, removed }));
if (changed.length || removed.length) throw new Error("Existing lock packages changed; inspect before accepting.");
