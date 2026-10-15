import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const standalone = resolve(".next/standalone");
if (!existsSync(resolve(standalone, "server.js"))) {
  throw new Error("Primero ejecuta npm run build para generar la salida standalone.");
}

mkdirSync(resolve(standalone, ".next"), { recursive: true });
for (const [source, destination] of [
  ["public", "public"],
  [".next/static", ".next/static"],
]) {
  const target = resolve(standalone, destination);
  rmSync(target, { recursive: true, force: true });
  cpSync(resolve(source), target, { recursive: true });
}
console.log("Salida standalone preparada con public y .next/static.");
