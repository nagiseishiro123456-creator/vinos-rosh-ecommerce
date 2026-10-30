import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const container = process.env.POSTGRES_CONTAINER;
const database = new URL(process.env.DATABASE_URL ?? "");
assert.equal(process.env.CI, "true", "Recovery contract runs only in isolated CI");
assert.ok(container && /^[a-zA-Z0-9_.-]+$/.test(container));
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname));
assert.equal(database.pathname, "/vinos_rosh_ci");
const username = decodeURIComponent(database.username);
assert.match(username, /^[a-zA-Z0-9_]+$/);

const scenario = process.argv[2] ?? "cart";
const contracts = {
  cart: { prefix: "s206", helper: "tests/helpers/cart-restore.ts", context: "S206_CONTEXT_PATH" },
  automatic: { prefix: "s302", helper: "tests/helpers/automatic-order-restore.ts", context: "S302_CONTEXT_PATH" },
  settlement: { prefix: "s304", helper: "tests/helpers/settlement-restore.ts", context: "S304_CONTEXT_PATH" },
};
assert.ok(Object.hasOwn(contracts, scenario), "Unknown recovery contract");
const { prefix, helper, context } = contracts[scenario];
const scratch = mkdtempSync(join(tmpdir(), "rosh-" + scenario + "-restore-"));
const contextPath = join(scratch, "context.json");
const source = "rosh_" + prefix + "_source_" + process.pid;
const target = "rosh_" + prefix + "_target_" + process.pid;
const created = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { maxBuffer: 64 * 1024 * 1024, timeout: 120_000, ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, command + " failed: " + (result.stderr?.toString() ?? ""));
  return result.stdout;
}
function docker(...args) { return run("docker", ["exec", container, ...args]); }
function environment(name) {
  const url = new URL(database);
  url.pathname = "/" + name;
  return { ...process.env, DATABASE_URL: url.href, [context]: contextPath };
}
try {
  for (const name of [source, target]) {
    docker("createdb", "-U", username, name);
    created.push(name);
  }
  run(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: environment(source) });
  run(process.execPath, ["--import", "tsx", helper, "seed"], { env: environment(source) });

  // Same native dump/restore flags as scripts/backup-db.ts and restore-db.ts.
  const dump = docker("pg_dump", "-U", username, "-d", source, "--clean", "--if-exists", "--no-owner", "--no-privileges");
  assert.ok(dump.length > 0);
  run("docker", ["exec", "-i", container, "psql", "-U", username, "-d", target, "-v", "ON_ERROR_STOP=1"], { input: dump });
  const verification = run(process.execPath, ["--import", "tsx", helper, "verify"], { env: environment(target) });
  process.stdout.write(verification);
  console.log(prefix.toUpperCase() + "_RESTORE_DUMP " + JSON.stringify({ bytes: dump.length, sha256: createHash("sha256").update(dump).digest("hex") }));
} finally {
  for (const name of created.reverse()) docker("dropdb", "-U", username, "--force", name);
  rmSync(scratch, { recursive: true, force: true });
}
