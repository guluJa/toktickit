import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { runSeed } from "../../prisma/seed.js";

const prisma = getPrisma();
const migrationsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../prisma/migrations");
const lab3Migrations = [
  "20260814092723_init", "20260825163108_lab2_data_foundation",
  "20260910185316_lab3_auth_foundation", "20260911000000_preserve_lab2_priorities",
  "20260912000000_expand_ticket_status",
];
const lab4Migration = "20261002000000_lab4_actions_foundation";

function postgresTool(name: string): string {
  const suffix = process.platform === "win32" ? ".exe" : "";
  const configured = process.env.PG_BIN;
  if (configured) return path.join(configured, name + suffix);
  const windowsInstall = path.join("C:\\Program Files\\PostgreSQL\\17\\bin", name + ".exe");
  return process.platform === "win32" && existsSync(windowsInstall) ? windowsInstall : name;
}

const legacySnapshotSql = `SELECT jsonb_build_object(
  'users', (SELECT COALESCE(jsonb_agg(to_jsonb(u) ORDER BY u.id), '[]'::jsonb) FROM "RequesterUser" u),
  'tickets', (SELECT COALESCE(jsonb_agg(to_jsonb(t) - 'version' ORDER BY t.id), '[]'::jsonb) FROM "Ticket" t),
  'attachments', (SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.id), '[]'::jsonb) FROM "Attachment" a),
  'comments', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.id), '[]'::jsonb) FROM "Comment" c),
  'notes', (SELECT COALESCE(jsonb_agg(to_jsonb(n) ORDER BY n.id), '[]'::jsonb) FROM "InternalNote" n)
)::text`;

const legacyFixturesSql = `
INSERT INTO "Category" ("id", "name") VALUES (11, 'Legacy category');
INSERT INTO "RelatedSystem" ("id", "name") VALUES (21, 'Legacy system');
INSERT INTO "RequesterUser" ("id", "name", "email", "role") VALUES
  (31, 'Legacy Requester', 'legacy-requester@toktickit.test', 'REQUESTER'),
  (32, 'Legacy Staff', 'legacy-staff@toktickit.test', 'IT_STAFF');
INSERT INTO "Ticket" ("id", "ticketNumber", "requesterId", "submissionKey", "categoryId", "relatedSystemId", "summary", "requestedPriority", "description", "currentStatus", "ownerId", "itPriority") VALUES
  (41, 'TKT-LAB3-PRESERVE-1', 31, '00000000-0000-4000-8000-000000000041', 11, 21, 'Legacy ticket one', 'HIGH', 'Keep the original description.', 'IN_PROGRESS', 32, 'HIGH'),
  (42, 'TKT-LAB3-PRESERVE-2', 31, '00000000-0000-4000-8000-000000000042', 11, 21, 'Legacy ticket two', 'LOW', 'Ticket without any Action.', 'NEW', NULL, 'LOW');
INSERT INTO "Attachment" ("id", "ticketId", "originalName", "storageKey", "mimeType", "sizeBytes")
  VALUES (51, 41, 'legacy.txt', 'lab4-migration-legacy-attachment', 'text/plain', 12);
INSERT INTO "Comment" ("id", "ticketId", "authorId", "content")
  VALUES (61, 41, 31, 'Original public comment.');
INSERT INTO "InternalNote" ("id", "ticketId", "authorId", "content")
  VALUES (71, 41, 32, 'Original internal note.');`;

function requireIsolatedDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw || new URL(raw).pathname !== "/toktickit_e2e") {
    throw new Error("Migration and seed tests require the dedicated toktickit_e2e database.");
  }
}

describe("API-07/08 additive migration and repeated seed", () => {
  it("preserves exact Lab 3 rows and relationships across the real Lab 4 migration", async () => {
    requireIsolatedDatabase();
    const sourceUrl = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(sourceUrl.hostname)) {
      throw new Error("Migration upgrade test only creates a local scratch database.");
    }
    const scratchName = `toktickit_lab4_upgrade_${randomBytes(4).toString("hex")}`;
    const scratchUrl = new URL(sourceUrl);
    scratchUrl.pathname = `/${scratchName}`;
    const connection = ["-h", sourceUrl.hostname, "-p", sourceUrl.port || "5432", "-U", decodeURIComponent(sourceUrl.username)];
    const env = { ...process.env, PGPASSWORD: decodeURIComponent(sourceUrl.password) };
    const run = (tool: string, args: string[]) => execFileSync(postgresTool(tool), [...connection, ...args], {
      env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    let created = false;
    let scratchPrisma: PrismaClient | undefined;
    try {
      run("createdb", ["-T", "template0", scratchName]);
      created = true;
      const sql = (statement: string) => run("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At", "-d", scratchName, "-c", statement]);
      const applyMigration = (directory: string) => {
        run("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", "-d", scratchName,
          "-f", path.join(migrationsRoot, directory, "migration.sql")]);
      };
      for (const migration of lab3Migrations) applyMigration(migration);
      sql(legacyFixturesSql);
      const before = JSON.parse(sql(legacySnapshotSql));
      expect(Object.fromEntries(Object.entries(before).map(([key, rows]) => [key, (rows as unknown[]).length])))
        .toEqual({ users: 2, tickets: 2, attachments: 1, comments: 1, notes: 1 });
      applyMigration(lab4Migration);
      const after = JSON.parse(sql(legacySnapshotSql));
      expect(after).toEqual(before);
      scratchPrisma = new PrismaClient({ datasources: { db: { url: scratchUrl.toString() } } });
      const legacyTicket = await scratchPrisma.ticket.findUniqueOrThrow({
        where: { id: 41 }, include: { requester: true, owner: true, attachments: true, comments: true, internalNotes: true, actions: true },
      });
      expect(legacyTicket.version).toBe(1);
      expect(legacyTicket.requester.id).toBe(31);
      expect(legacyTicket.owner?.id).toBe(32);
      expect(legacyTicket.attachments.map((attachment) => attachment.id)).toEqual([51]);
      expect(legacyTicket.comments.map((comment) => comment.id)).toEqual([61]);
      expect(legacyTicket.internalNotes.map((note) => note.id)).toEqual([71]);
      expect(legacyTicket.actions).toEqual([]);
      expect((await scratchPrisma.ticket.findUniqueOrThrow({ where: { id: 42 } })).version).toBe(1);
      expect(await scratchPrisma.actionTaken.count()).toBe(0);
    } finally {
      await scratchPrisma?.$disconnect();
      if (created && /^toktickit_lab4_upgrade_[0-9a-f]{8}$/.test(scratchName)) {
        run("dropdb", [scratchName]);
      }
    }
  });

  it("preserves existing Ticket IDs/owners and defaults every Ticket version to at least one", async () => {
    requireIsolatedDatabase();
    const tickets = await prisma.ticket.findMany({ select: { id: true, requesterId: true, ownerId: true, version: true } });
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((ticket) => ticket.version >= 1)).toBe(true);
    const legacy = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-LAB3-0002" } });
    expect(legacy.id).toBeGreaterThan(0);
    expect(await prisma.actionTaken.count({ where: { ticketId: legacy.id } })).toBe(0);
    const foreignKeys = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = '"ActionTaken"'::regclass AND contype = 'f'
    `;
    expect(foreignKeys.map((key) => key.conname)).toEqual(expect.arrayContaining([
      "ActionTaken_ticketId_fkey", "ActionTaken_performedById_fkey",
    ]));
  });

  it("seeds zero/one/many Actions without duplicates or changing legacy Ticket identity", async () => {
    requireIsolatedDatabase();
    if (!process.env.LAB3_INITIAL_PASSWORD) {
      throw new Error("LAB3_INITIAL_PASSWORD is required for isolated repeated-seed verification.");
    }
    await runSeed();
    const numbers = ["TKT-LAB3-0001", "TKT-LAB3-0002", "TKT-LAB3-0003"];
    const before = await prisma.ticket.findMany({
      where: { ticketNumber: { in: numbers } },
      select: { id: true, ticketNumber: true, requesterId: true, ownerId: true, version: true },
      orderBy: { ticketNumber: "asc" },
    });
    const actionCounts = async () => Promise.all(before.map((ticket) => prisma.actionTaken.count({ where: { ticketId: ticket.id } })));
    expect(await actionCounts()).toEqual([1, 0, 2]);
    const emptyRequester = await prisma.requesterUser.findUniqueOrThrow({
      where: { email: "lab4-empty-requester@toktickit.test" }, select: { id: true },
    });
    expect(await prisma.ticket.count({ where: { requesterId: emptyRequester.id } })).toBe(0);
    const dashboardTicket = await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-LAB4-DASH-RESOLVED" },
      select: { id: true, currentStatus: true, updatedAt: true },
    });
    expect(dashboardTicket.currentStatus).toBe("RESOLVED");
    expect(await prisma.actionTaken.count({ where: { ticketId: dashboardTicket.id } })).toBe(1);
    const beforeActions = await prisma.actionTaken.findMany({
      where: { ticketId: { in: before.map((ticket) => ticket.id) } },
      select: { id: true, ticketId: true, actionAt: true, performedById: true, version: true },
      orderBy: { id: "asc" },
    });
    await runSeed();
    const after = await prisma.ticket.findMany({
      where: { ticketNumber: { in: numbers } },
      select: { id: true, ticketNumber: true, requesterId: true, ownerId: true, version: true },
      orderBy: { ticketNumber: "asc" },
    });
    expect(after).toEqual(before);
    expect(await actionCounts()).toEqual([1, 0, 2]);
    expect(await prisma.ticket.findUniqueOrThrow({
      where: { ticketNumber: "TKT-LAB4-DASH-RESOLVED" },
      select: { id: true, currentStatus: true, updatedAt: true },
    })).toEqual(dashboardTicket);
    expect(await prisma.actionTaken.count({ where: { ticketId: dashboardTicket.id } })).toBe(1);
    expect(await prisma.actionTaken.findMany({
      where: { ticketId: { in: before.map((ticket) => ticket.id) } },
      select: { id: true, ticketId: true, actionAt: true, performedById: true, version: true },
      orderBy: { id: "asc" },
    })).toEqual(beforeActions);
  });
});
