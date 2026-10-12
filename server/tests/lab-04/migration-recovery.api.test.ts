import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const migrationPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../prisma/migrations/20261002000000_lab4_actions_foundation/migration.sql",
);

describe("MIG-01 migration precondition and preservation", () => {
  it("uses additive SQL and rejects a precondition failure without changing Ticket rows", async () => {
    const raw = process.env.DATABASE_URL;
    if (!raw || new URL(raw).pathname !== "/toktickit_e2e") {
      throw new Error("MIG-01 requires the dedicated toktickit_e2e database.");
    }
    const migration = await fs.readFile(migrationPath, "utf8");
    expect(migration).toMatch(/ALTER TABLE "Ticket" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1/);
    expect(migration).toMatch(/ON DELETE RESTRICT/g);
    expect(migration).not.toMatch(/\b(?:DROP TABLE|TRUNCATE|DELETE FROM "Ticket")\b/i);
    const precondition = migration.match(/DO \$\$[\s\S]*?END \$\$;/)?.[0];
    expect(precondition).toBeTruthy();
    const before = await prisma.ticket.findMany({ select: { id: true, requesterId: true, version: true }, orderBy: { id: "asc" } });
    await expect(prisma.$executeRawUnsafe(precondition!)).rejects.toThrow(/precondition failed/);
    const after = await prisma.ticket.findMany({ select: { id: true, requesterId: true, version: true }, orderBy: { id: "asc" } });
    expect(after).toEqual(before);
  });
});
