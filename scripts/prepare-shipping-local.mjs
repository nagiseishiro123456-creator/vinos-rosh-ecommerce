import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = new URL(process.env.DATABASE_URL ?? "");
if (process.env.NODE_ENV === "production" || !["postgres:", "postgresql:"].includes(source.protocol)
  || !["localhost", "127.0.0.1"].includes(source.hostname) || (source.port && source.port !== "5432")
  || !["/vinos_rosh", "/vinos_rosh_test"].includes(source.pathname)) throw new Error("Only the named local development/QA databases are allowed.");
const client = new PrismaClient({ log: [] });
try {
  const applied = await client.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  const pending = readdirSync(new URL("../prisma/migrations/", import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !applied.some((row) => row.migration_name === entry.name)).map((entry) => entry.name);
  if (pending.some((name) => name !== "20261031100000_shipping_delivery_instructions")) throw new Error("Unexpected pending migrations. Review the local history first.");
  console.log("Optional shipping information migration pending: " + pending.length);
} finally { await client.$disconnect(); }
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { cwd: root, env: process.env, stdio: "inherit" });
if (result.error || result.status !== 0) throw new Error("Local shipping migration did not finish.");
console.log("Local shipping information ready. No reset, seed, tariff change, payment or email.");
