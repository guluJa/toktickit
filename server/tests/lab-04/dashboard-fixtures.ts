import { randomUUID } from "node:crypto";
import request from "supertest";
import { TicketStatus, UserRole } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

export const asOf = new Date("2026-10-04T00:00:00+07:00");
export const start = new Date(asOf.getTime() - 7 * 86400000);
export async function dashboardFixtures() {
  if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/toktickit_e2e") throw Error("Dashboard tests require isolated toktickit_e2e.");
  const prisma = getPrisma();
  const users: number[] = [], tickets: number[] = [];
  const password = "Dashboard-Test-2026!";
  const passwordHash = await hashPassword(password);
  async function cleanup() {
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: tickets } } });
    await prisma.ticket.deleteMany({ where: { id: { in: tickets } } });
    await prisma.session.deleteMany({ where: { userId: { in: users } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
  async function user(role: UserRole, mustChangePassword = false) {
    const u = await prisma.requesterUser.create({ data: { name: `Dashboard ${role}`, email: `dashboard-${randomUUID()}@toktickit.test`, role, passwordHash, mustChangePassword } });
    users.push(u.id);
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: u.email, password });
    if (login.status !== 200) throw Error("Dashboard fixture login failed.");
    return { ...u, agent };
  }
  try {
  const requester = await user("REQUESTER"), other = await user("REQUESTER"), empty = await user("REQUESTER");
  const staff = await user("IT_STAFF"), admin = await user("ADMINISTRATOR"), changing = await user("REQUESTER", true);
  const categoryId = (await prisma.category.findFirstOrThrow()).id;
  const relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
  async function ticket(status: TicketStatus, updatedAt: Date, requesterId = requester.id, ownerId: number | null = staff.id) {
    const t = await prisma.ticket.create({ data: { ticketNumber: `DASH-${randomUUID()}`, submissionKey: randomUUID(), requesterId, ownerId, categoryId, relatedSystemId, summary: `Dashboard ${status}`, description: "Isolated fixture", currentStatus: status, requestedPriority: "LOW", itPriority: "HIGH", createdAt: start, updatedAt } });
    tickets.push(t.id); return t;
  }
  const rows = [];
  for (const status of Object.values(TicketStatus)) rows.push(await ticket(status, new Date(asOf.getTime() - 86400000)));
  const lower = await ticket("RESOLVED", start);
  const before = await ticket("CLOSED", new Date(start.getTime() - 1));
  const upper = await ticket("RESOLVED", asOf);
  const future = await ticket("NEW", new Date(asOf.getTime() + 1));
  const foreign = await ticket("WAITING_FOR_REQUESTER", new Date(asOf.getTime() - 1), other.id, null);
  const ownAction = await prisma.actionTaken.create({ data: { ticketId: foreign.id, performedById: staff.id, actionAt: start, description: "Own action", result: "Recorded", followUpRequired: false } });
  await prisma.actionTaken.create({ data: { ticketId: rows[0].id, performedById: admin.id, actionAt: new Date(asOf.getTime() - 1), description: "Admin action", result: "Recorded", followUpRequired: false } });
  await prisma.actionTaken.create({ data: { ticketId: rows[0].id, performedById: staff.id, actionAt: asOf, description: "Upper excluded", result: "Recorded", followUpRequired: false } });
  return { prisma, requester, other, empty, staff, admin, changing, rows, lower, before, upper, future, foreign, ownAction, ticket,
    cleanup,
  };
  } catch (error) { await cleanup(); throw error; }
}
