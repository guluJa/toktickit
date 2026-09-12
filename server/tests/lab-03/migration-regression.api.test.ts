import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { runSeed } from "../../prisma/seed.js";

const prisma = getPrisma();
const fixtureEmail = "lab3-migration-fixture@toktickit.test";
const fixturePassword = "Migrated-Password1!";
let fixtureTicketId: number | undefined;

async function removeFixture(): Promise<void> {
  const fixture = await prisma.requesterUser.findUnique({ where: { email: fixtureEmail } });
  if (!fixture) return;
  await prisma.session.deleteMany({ where: { userId: fixture.id } });
  await prisma.ticket.deleteMany({ where: { requesterId: fixture.id } });
  await prisma.requesterUser.delete({ where: { id: fixture.id } });
}

describe("Lab 3 migration compatibility", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
    await removeFixture();
    const category = await prisma.category.findFirstOrThrow();
    const relatedSystem = await prisma.relatedSystem.findFirstOrThrow();
    const fixture = await prisma.requesterUser.create({
      data: {
        name: "Lab 3 Migration Fixture",
        email: fixtureEmail,
        passwordHash: "!",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
      },
    });
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-LAB3-MIGRATION-FIXTURE",
        requesterId: fixture.id,
        submissionKey: randomUUID(),
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Migration preservation fixture",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        description: "Fixture for migration and repeated seed verification.",
      },
    });
    fixtureTicketId = ticket.id;
  });

  afterAll(async () => {
    await removeFixture();
    await prisma.$disconnect();
  });

  it("keeps Lab 2 requester identity fields and introduces first-login defaults", async () => {
    const user = await prisma.requesterUser.findUnique({
      where: { email: "requester1@toktickit.test" },
      select: { id: true, role: true, mustChangePassword: true },
    });

    expect(user).toEqual({
      id: expect.any(Number),
      role: "REQUESTER",
      mustChangePassword: true,
    });
  });

  it("preserves requester-ticket foreign-key identity and priority copy", async () => {
    const ticket = await prisma.ticket.findFirst({
      where: { requester: { email: "requester1@toktickit.test" } },
      select: { id: true, requesterId: true, requestedPriority: true, itPriority: true },
      orderBy: { id: "asc" },
    });

    expect(ticket).not.toBeNull();
    expect(ticket?.id).toEqual(expect.any(Number));
    expect(ticket?.requesterId).toEqual(expect.any(Number));
    expect(ticket?.itPriority).toBe(ticket?.requestedPriority);
  });

  it("provisions every placeholder Requester and allows initial-password login", async () => {
    const previousPassword = process.env.LAB3_INITIAL_PASSWORD;
    process.env.LAB3_INITIAL_PASSWORD = fixturePassword;
    try {
      await runSeed();
    } finally {
      if (previousPassword === undefined) delete process.env.LAB3_INITIAL_PASSWORD;
      else process.env.LAB3_INITIAL_PASSWORD = previousPassword;
    }

    const fixture = await prisma.requesterUser.findUniqueOrThrow({ where: { email: fixtureEmail } });
    expect(fixture.mustChangePassword).toBe(true);
    expect(fixture.passwordHash).not.toBe("!");
    expect(fixtureTicketId).toEqual(expect.any(Number));
    const preservedTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: fixtureTicketId } });
    expect(preservedTicket.requesterId).toBe(fixture.id);

    const login = await request(app).post("/api/auth/login").send({
      email: fixtureEmail,
      password: fixturePassword,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.mustChangePassword).toBe(true);
  });

  it("keeps repeated seed execution idempotent", async () => {
    const previousPassword = process.env.LAB3_INITIAL_PASSWORD;
    process.env.LAB3_INITIAL_PASSWORD = fixturePassword;
    try {
      const before = await prisma.ticket.count({ where: { ticketNumber: { startsWith: "TKT-LAB3-" } } });
      await runSeed();
      const after = await prisma.ticket.count({ where: { ticketNumber: { startsWith: "TKT-LAB3-" } } });
      expect(after).toBe(before);
    } finally {
      if (previousPassword === undefined) delete process.env.LAB3_INITIAL_PASSWORD;
      else process.env.LAB3_INITIAL_PASSWORD = previousPassword;
    }
  });

  it("preserves explicit IT Priority initialization and exposes the complete Ticket lifecycle", async () => {
    const enumRows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'TicketStatus'
      ORDER BY e.enumsortorder
    `;
    expect(enumRows.map((row) => row.enumlabel)).toEqual(expect.arrayContaining([
      "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
    ]));
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const requesterId = fixtureTicketId
      ? (await prisma.ticket.findUniqueOrThrow({ where: { id: fixtureTicketId }, select: { requesterId: true } })).requesterId
      : 1;
    for (const requestedPriority of ["LOW", "MEDIUM", "HIGH"] as const) {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-LAB3-PRIORITY-${requestedPriority}-${Date.now()}`,
          requesterId,
          submissionKey: randomUUID(), categoryId: category.id, relatedSystemId: system.id,
          summary: "Explicit priority fixture", requestedPriority, itPriority: requestedPriority,
          description: "New Ticket priority is copied explicitly from requested priority.",
        },
      });
      expect(ticket.itPriority).toBe(requestedPriority);
      await prisma.ticket.delete({ where: { id: ticket.id } });
    }
  });
});
