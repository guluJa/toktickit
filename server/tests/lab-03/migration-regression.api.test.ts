import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("Lab 3 migration compatibility", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
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
      mustChangePassword: expect.any(Boolean),
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
});
