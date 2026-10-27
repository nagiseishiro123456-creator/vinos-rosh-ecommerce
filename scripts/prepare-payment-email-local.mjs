import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const url = new URL(process.env.DATABASE_URL ?? "");
if (process.env.NODE_ENV === "production" || !["postgres:", "postgresql:"].includes(url.protocol)
  || !["localhost", "127.0.0.1"].includes(url.hostname) || (url.port && url.port !== "5432")
  || !["/vinos_rosh", "/vinos_rosh_test"].includes(url.pathname)) throw new Error("Only the named local development/QA databases are allowed.");
const allowed = new Set(["20261022150000_payment_attempt_preparation", "20261022170000_automatic_order_reservation", "20261027090000_payment_confirmation_outbox"]);
const client = new PrismaClient({ log: [] });
try {
  const applied = await client.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  const pending = readdirSync(new URL("../prisma/migrations/", import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !applied.some((row) => row.migration_name === entry.name)).map((entry) => entry.name);
  if (pending.some((name) => !allowed.has(name))) throw new Error("UNEXPECTED_PENDING_MIGRATIONS");
  console.log("Known additive Sprint 3 migrations pending: " + pending.length);
} catch (error) {
  if (error instanceof Error && error.message === "UNEXPECTED_PENDING_MIGRATIONS") throw new Error("Unexpected pending migrations. Review them before changing the local database.");
  throw new Error("Could not verify the local migration history. Check the local database connection.");
}
finally { await client.$disconnect(); }
const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
  cwd: root, env: { ...process.env, PAYMENT_CONFIRMATION_EMAIL_ENABLED: "false" }, stdio: "inherit",
});
if (result.error || result.status !== 0) throw new Error("Local email migration did not finish successfully.");
console.log("Local confirmation queue ready. No email was sent and no payment was made.");
