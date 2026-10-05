import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const backupDir = join(process.cwd(), "backups");
mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = join(backupDir, `vinos-rosh-${timestamp}.sql`);

const command = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges';
const result = spawnSync(
  "docker",
  ["compose", "exec", "-T", "db", "sh", "-c", command],
  {
    cwd: process.cwd(),
    encoding: null,
    maxBuffer: 1024 * 1024 * 200,
  },
);

if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr ?? Buffer.from("No se pudo generar el respaldo.\n"));
  process.exit(result.status ?? 1);
}

writeFileSync(outputPath, result.stdout ?? Buffer.alloc(0));
console.log(`Respaldo creado: ${outputPath}`);
