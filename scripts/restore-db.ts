import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const input = process.argv[2];
if (!input) {
  console.error("Uso: npm run db:restore -- backups/archivo.sql");
  process.exit(1);
}

const inputPath = resolve(process.cwd(), input);
const sql = readFileSync(inputPath);

const command = 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"';
const result = spawnSync(
  "docker",
  ["compose", "exec", "-T", "db", "sh", "-c", command],
  {
    cwd: process.cwd(),
    input: sql,
    encoding: null,
    maxBuffer: 1024 * 1024 * 200,
  },
);

if (result.error) throw result.error;
process.stdout.write(result.stdout ?? Buffer.alloc(0));
process.stderr.write(result.stderr ?? Buffer.alloc(0));

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Base restaurada desde: ${inputPath}`);
