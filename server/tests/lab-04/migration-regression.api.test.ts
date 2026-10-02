import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { runSeed } from "../../prisma/seed.js";

const prisma = getPrisma();

function requireIsolatedDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw || new URL(raw).pathname !== "/toktickit_e2e") {
    throw new Error("Migration and seed tests require the dedicated toktickit_e2e database.");
  }
}

describe("API-07/08 additive migration and repeated seed", () => {
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
