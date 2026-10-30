import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Local PostgreSQL QA only. Does not reset, migrate or seed the development database.
const root = fileURLToPath(new URL("../", import.meta.url));
const source = new URL(process.env.DATABASE_URL ?? "");
if (!["postgres:", "postgresql:"].includes(source.protocol) || !["localhost", "127.0.0.1"].includes(source.hostname)
    || (source.port && source.port !== "5432")) {
  throw new Error("Use a local PostgreSQL connection on port 5432 for this QA runner.");
}
const database = "vinos_rosh_test";
const qa = new URL(source);
qa.pathname = "/" + database;
const env = { ...process.env, DATABASE_URL: qa.toString(), NODE_ENV: "test", SMOKE_TEST_DATA: "true",
  PAYMENTS_IZIPAY_ENABLED: "false", IZIPAY_MCW_INITIATE_ENABLED: "false", IZIPAY_MCW_RESERVE_ENABLED: "false",
  PAYMENT_CONFIRMATION_EMAIL_ENABLED: "false" };
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit", ...options });
  if (result.error || result.status !== 0) throw new Error("Local QA command failed; development database was not targeted.");
  return result;
}
const container = "vinos-rosh-postgres";
const username = decodeURIComponent(source.username);
const exists = run("docker", ["exec", container, "psql", "-U", username, "-d", "postgres", "-Atc",
  "SELECT 1 FROM pg_database WHERE datname = 'vinos_rosh_test'"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
if (exists.stdout.trim() !== "1") run("docker", ["exec", container, "createdb", "-U", username, database]);
console.log("QA database: vinos_rosh_test (local). Applying committed migrations; no reset or seed.");
run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"]);
const files = readdirSync(new URL("../tests/", import.meta.url)).filter((name) => name.endsWith(".test.ts")).sort();
run(process.execPath, ["--import", "tsx", "--test", "--test-concurrency=1", ...files.map((name) => "tests/" + name)]);
const sql = ["tests/sql/confirmation-outbox-migration-before.sql", "prisma/migrations/20261027090000_payment_confirmation_outbox/migration.sql", "tests/sql/confirmation-outbox-migration-after.sql"]
  .map((name) => readFileSync(new URL("../" + name, import.meta.url), "utf8")).join("\n");
run("docker", ["exec", "-i", container, "psql", "-U", username, "-d", database, "-v", "ON_ERROR_STOP=1"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
const settlementSql = ["tests/sql/settlement-migration-before.sql", "prisma/migrations/20261029100000_manual_payment_settlement/migration.sql", "tests/sql/settlement-migration-after.sql"]
  .map((name) => readFileSync(new URL("../" + name, import.meta.url), "utf8")).join("\n");
run("docker", ["exec", "-i", container, "psql", "-U", username, "-d", database, "-v", "ON_ERROR_STOP=1"], { input: settlementSql, stdio: ["pipe", "inherit", "inherit"] });
