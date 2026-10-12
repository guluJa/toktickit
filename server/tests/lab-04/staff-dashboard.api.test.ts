import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { TicketStatus, Prisma } from "@prisma/client";
import { app } from "../../src/app.js";
import { openStatuses, readDashboard } from "../../src/dashboards.js";
import { asOf, start, dashboardFixtures } from "./dashboard-fixtures.js";

describe("API-06/09 Staff and Administrator Dashboard", () => {
  let f: Awaited<ReturnType<typeof dashboardFixtures>>;
  beforeAll(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(asOf); f = await dashboardFixtures(); });
  afterAll(async () => { vi.useRealTimers(); vi.restoreAllMocks(); await f?.cleanup(); });
  it("matches database counts, all breakdown keys and current-user Actions, independent of list limit", async () => {
    const r = await f.staff.agent.get("/api/staff/dashboard?limit=5"); expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.metrics).toEqual({
      unassignedCount: await f.prisma.ticket.count({ where: { ownerId: null, currentStatus: { in: openStatuses } } }),
      mineCount: await f.prisma.ticket.count({ where: { ownerId: f.staff.id, currentStatus: { in: openStatuses } } }),
      highPriorityCount: await f.prisma.ticket.count({ where: { itPriority: "HIGH", currentStatus: { in: openStatuses } } }),
      recentlyUpdatedCount: await f.prisma.ticket.count({ where: { updatedAt: { gte: start, lt: asOf } } }),
      recentlyResolvedCount: await f.prisma.ticket.count({ where: { currentStatus: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: start, lt: asOf } } }),
    });
    expect(Object.keys(d.byStatus).sort()).toEqual(Object.values(TicketStatus).sort());
    for (const status of Object.values(TicketStatus)) expect(d.byStatus[status]).toBe(await f.prisma.ticket.count({ where: { currentStatus: status } }));
    for (const itPriority of ["LOW", "MEDIUM", "HIGH"] as const) expect(d.byPriority[itPriority]).toBe(await f.prisma.ticket.count({ where: { itPriority } }));
    const latest = await f.prisma.ticket.findMany({ where: { updatedAt: { gte: start, lt: asOf } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5 });
    expect(d.recentTickets.map((t: { id: number }) => t.id)).toEqual(latest.map(t => t.id));
    expect(d.recentActions.map((a: { id: number }) => a.id)).toEqual([f.ownAction.id]);
    expect(d.recentActions[0].performedBy.id).toBe(f.staff.id);
    expect(JSON.stringify(d)).not.toMatch(/passwordHash|tokenHash|sessionToken/);
  });
  it("permits Administrator on the same route with their own recent Actions", async () => {
    const r = await f.admin.agent.get("/api/staff/dashboard?limit=1"); expect(r.status).toBe(200);
    expect(r.body.data.recentActions[0].performedBy.id).toBe(f.admin.id);
    expect(r.body.data.metrics.mineCount).toBe(0);
    expect((await f.admin.agent.get("/api/admin/dashboard")).status).toBe(404);
  });
  it("applies Action date boundaries, descending ID tie-breaker and limit independently of ownership", async () => {
    const first = await f.prisma.actionTaken.create({ data: { ticketId: f.foreign.id, performedById: f.staff.id, actionAt: new Date(asOf.getTime() - 1), description: "Recent one", result: "Recorded", followUpRequired: false } });
    const second = await f.prisma.actionTaken.create({ data: { ticketId: f.rows[0].id, performedById: f.staff.id, actionAt: first.actionAt, description: "Recent two", result: "Recorded", followUpRequired: false } });
    const old = await f.prisma.actionTaken.create({ data: { ticketId: f.foreign.id, performedById: f.staff.id, actionAt: new Date(start.getTime() - 1), description: "Too old", result: "Recorded", followUpRequired: false } });
    const r = await f.staff.agent.get("/api/staff/dashboard?limit=2");
    expect(r.body.data.recentActions.map((a: { id: number }) => a.id)).toEqual([second.id, first.id]);
    const all = await f.staff.agent.get("/api/staff/dashboard?limit=100");
    expect(all.body.data.recentActions.map((a: { id: number }) => a.id)).toEqual([second.id, first.id, f.ownAction.id]);
    expect(all.body.data.recentActions.map((a: { id: number }) => a.id)).not.toContain(old.id);
    expect(r.body.data.recentActions[1].detailLink).toEqual({ rel: "ticketDetail", target: "staff-ticket-detail", ticketId: f.foreign.id });
  });
  it("returns zero breakdowns on an actually empty transactional snapshot and rolls back all fixture changes", async () => {
    const before = await f.prisma.ticket.count();
    const rollback = new Error("rollback isolated empty snapshot");
    await expect(f.prisma.$transaction(async tx => {
      // Only in the guarded test database; every deletion below is rolled back.
      await tx.actionTaken.deleteMany(); await tx.attachment.deleteMany(); await tx.comment.deleteMany(); await tx.internalNote.deleteMany(); await tx.ticket.deleteMany();
      const d = await readDashboard(tx, f.staff.id, true, 5, asOf);
      if (!("byStatus" in d)) throw Error("Expected Staff Dashboard shape.");
      expect(Object.values(d.metrics)).toEqual([0, 0, 0, 0, 0]);
      expect(Object.values(d.byStatus!)).toEqual(Array(8).fill(0)); expect(Object.values(d.byPriority!)).toEqual([0, 0, 0]);
      expect(d.recentTickets).toEqual([]); expect(d.recentlyResolvedTickets).toEqual([]); expect(d.recentActions).toEqual([]);
      throw rollback;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })).rejects.toBe(rollback);
    expect(await f.prisma.ticket.count()).toBe(before);
  });
  it("uses valid Queue links with pageSize=10 even for limit=5, including owner and priority", async () => {
    const { body } = await f.staff.agent.get("/api/staff/dashboard?limit=5");
    for (const predicate of [(q: Record<string, unknown>) => q.ownerId === "unassigned", (q: Record<string, unknown>) => q.ownerId === f.staff.id, (q: Record<string, unknown>) => q.itPriority === "HIGH", (q: Record<string, unknown>) => q.status === "CLOSED"]) {
      const link = body.data.links.find((l: { query: Record<string, unknown> }) => predicate(l.query));
      expect(link.query.pageSize).toBe(10); expect(link.query.sortOrder).toBe("desc"); expect(link.query).not.toHaveProperty("currentStatus");
      const queue = await f.staff.agent.get("/api/staff/tickets").query(link.query);
      expect(queue.status).toBe(200); expect(queue.body.data.pagination.pageSize).toBe(10);
    }
  });
  it("enforces authentication, Requester denial and invalid limits", async () => {
    expect((await request(app).get("/api/staff/dashboard")).status).toBe(401);
    expect((await f.requester.agent.get("/api/staff/dashboard")).body.error.code).toBe("ROLE_FORBIDDEN");
    for (const limit of ["0", "101", "1.5", "-1", "", "abc"]) expect((await f.staff.agent.get("/api/staff/dashboard").query({ limit })).status).toBe(400);
  });
  it("enforces the password-change gate for Staff and does not mutate Ticket or Action versions", async () => {
    await f.prisma.requesterUser.update({ where: { id: f.changing.id }, data: { role: "IT_STAFF" } });
    try { expect((await f.changing.agent.get("/api/staff/dashboard")).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED"); }
    finally { await f.prisma.requesterUser.update({ where: { id: f.changing.id }, data: { role: "REQUESTER" } }); }
    const tickets = await f.prisma.ticket.findMany({ where: { id: { in: f.rows.map(t => t.id) } }, orderBy: { id: "asc" } });
    const action = await f.prisma.actionTaken.findUniqueOrThrow({ where: { id: f.ownAction.id } });
    expect((await f.staff.agent.get("/api/staff/dashboard")).status).toBe(200);
    expect(await f.prisma.ticket.findMany({ where: { id: { in: f.rows.map(t => t.id) } }, orderBy: { id: "asc" } })).toEqual(tickets);
    expect(await f.prisma.actionTaken.findUniqueOrThrow({ where: { id: f.ownAction.id } })).toEqual(action);
  });
});
