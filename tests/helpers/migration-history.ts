import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { prisma } from "../../src/lib/prisma";

/** Check the restored migration identities, including newly added migrations. */
export async function assertRestoredMigrations() {
  const directory = new URL("../../prisma/migrations/", import.meta.url);
  const expected = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      assert.ok(existsSync(new URL(entry.name + "/migration.sql", directory)));
      return entry.name;
    }).sort();
  assert.ok(expected.length > 0);
  const restored = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    ORDER BY migration_name`;
  assert.deepEqual(restored.map((row) => row.migration_name), expected,
    "Restoration must retain the complete migration history");
  return expected.length;
}
