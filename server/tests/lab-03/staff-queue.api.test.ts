import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const password = "Valid-Password1!";
const staffEmail = "lab3-staff-queue-staff@toktickit.test";
const adminEmail = "lab3-staff-queue-admin@toktickit.test";
const requesterEmail = "lab3-staff-queue-requester@toktickit.test";

describe("Lab 3 Staff Ticket Queue", () => {
  let staffId = 0; let adminId = 0; let requesterId = 0; const ticketIds: number[] = [];
  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const staff = await prisma.requesterUser.upsert({ where: { email: staffEmail }, update: { passwordHash, role: "IT_STAFF", isActive: true, mustChangePassword: false }, create: { name: "Queue Staff", email: staffEmail, passwordHash, role: "IT_STAFF", isActive: true, mustChangePassword: false } });
    const admin = await prisma.requesterUser.upsert({ where: { email: adminEmail }, update: { passwordHash, role: "ADMINISTRATOR", isActive: true, mustChangePassword: false }, create: { name: "Queue Admin", email: adminEmail, passwordHash, role: "ADMINISTRATOR", isActive: true, mustChangePassword: false } });
    const requester = await prisma.requesterUser.upsert({ where: { email: requesterEmail }, update: { passwordHash, role: "REQUESTER", isActive: true, mustChangePassword: false }, create: { name: "Queue Requester", email: requesterEmail, passwordHash, role: "REQUESTER", isActive: true, mustChangePassword: false } });
    staffId = staff.id; adminId = admin.id; requesterId = requester.id;
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const fixtures = [{ summary: "Queue alpha", priority: "HIGH" as const, owned: true }, { summary: "Queue beta", priority: "LOW" as const, owned: false }];
    for (const [index, fixture] of fixtures.entries()) {
      const ticket = await prisma.ticket.create({ data: { ticketNumber: `QUEUE-${Date.now()}-${index}`, submissionKey: randomUUID(), requesterId, ownerId: fixture.owned ? staffId : null, categoryId: category.id, relatedSystemId: system.id, summary: fixture.summary, description: "Staff queue fixture", requestedPriority: fixture.priority, itPriority: fixture.priority } });
      ticketIds.push(ticket.id);
    }
    for (let index = 0; index < 11; index += 1) {
      const ticket = await prisma.ticket.create({ data: {
        ticketNumber: `QUEUE-PAGE-${Date.now()}-${index}`,
        submissionKey: randomUUID(), requesterId, ownerId: index === 0 ? staffId : null,
        categoryId: category.id, relatedSystemId: system.id,
        summary: `Queue page fixture ${index + 1}`, description: "Staff queue pagination fixture",
        requestedPriority: index % 2 === 0 ? "MEDIUM" : "LOW", itPriority: index % 3 === 0 ? "HIGH" : "MEDIUM",
        currentStatus: index % 2 === 0 ? "OPEN" : "NEW",
      } });
      ticketIds.push(ticket.id);
    }
  });
  afterAll(async () => { await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } }); await prisma.session.deleteMany({ where: { userId: { in: [staffId, adminId, requesterId] } } }); await prisma.requesterUser.deleteMany({ where: { id: { in: [staffId, adminId, requesterId] } } }); await prisma.$disconnect(); });
  async function signedIn(email: string) { const agent = request.agent(app); const result = await agent.post("/api/auth/login").send({ email, password }); expect(result.status).toBe(200); return agent; }

  it("returns the contract envelope and Staff Queue fields to IT Staff", async () => {
    const response = await (await signedIn(staffEmail)).get("/api/staff/tickets").query({ search: "Queue alpha", sortBy: "ticketNumber", sortOrder: "asc" });
    expect(response.status).toBe(200); expect(response.body.data.pagination).toMatchObject({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
    expect(response.body.data.items[0]).toEqual(expect.objectContaining({ ticketNumber: expect.any(String), summary: expect.any(String), requestedPriority: expect.any(String), itPriority: expect.any(String), currentStatus: "NEW", owner: { id: staffId, name: "Queue Staff", role: "IT_STAFF" }, category: expect.any(Object), relatedSystem: expect.any(Object) }));
    expect(response.body.data.items[0].owner).not.toHaveProperty("email"); expect(response.body.data.items[0].owner).not.toHaveProperty("isActive"); expect(response.body.data.items[0].owner).not.toHaveProperty("mustChangePassword");
  });
  it("supports search, filters, owner and page-one empty results", async () => {
    const agent = await signedIn(staffEmail);
    const filtered = await agent.get("/api/staff/tickets").query({ search: "alpha", requestedPriority: "HIGH", itPriority: "HIGH", ownerId: String(staffId), pageSize: 10 });
    expect(filtered.status).toBe(200); expect(filtered.body.data.items).toHaveLength(1); expect(filtered.body.data.items[0].summary).toBe("Queue alpha");
    const empty = await agent.get("/api/staff/tickets").query({ search: "does-not-exist" });
    expect(empty.status).toBe(200); expect(empty.body.data.items).toEqual([]); expect(empty.body.data.pagination.totalPages).toBe(0);
  });
  it("supports real pagination, status/priority/unassigned filters and sort direction", async () => {
    const agent = await signedIn(staffEmail);
    const pageOne = await agent.get("/api/staff/tickets").query({ search: "Queue page fixture", page: 1, pageSize: 10, sortBy: "ticketNumber", sortOrder: "asc" });
    const pageTwo = await agent.get("/api/staff/tickets").query({ search: "Queue page fixture", page: 2, pageSize: 10, sortBy: "ticketNumber", sortOrder: "asc" });
    expect(pageOne.status).toBe(200); expect(pageTwo.status).toBe(200);
    expect(pageOne.body.data.pagination).toMatchObject({ page: 1, pageSize: 10, totalItems: 11, totalPages: 2 });
    expect(pageOne.body.data.items).toHaveLength(10); expect(pageTwo.body.data.items).toHaveLength(1);
    expect(pageOne.body.data.items[0].id).not.toBe(pageTwo.body.data.items[0].id);
    const filtered = await agent.get("/api/staff/tickets").query({ search: "Queue page fixture", status: "OPEN", requestedPriority: "MEDIUM", itPriority: "HIGH", ownerId: "unassigned", pageSize: 50 });
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.items.every((item: { currentStatus: string; requestedPriority: string; itPriority: string; owner: unknown }) => item.currentStatus === "OPEN" && item.requestedPriority === "MEDIUM" && item.itPriority === "HIGH" && item.owner === null)).toBe(true);
    const descending = await agent.get("/api/staff/tickets").query({ search: "Queue page fixture", sortBy: "ticketNumber", sortOrder: "desc", pageSize: 50 });
    expect(descending.status).toBe(200);
    expect(descending.body.data.items[0].ticketNumber > descending.body.data.items.at(-1).ticketNumber).toBe(true);
  });
  it("rejects invalid query and out-of-range pages safely", async () => {
    const agent = await signedIn(staffEmail);
    const invalid = await agent.get("/api/staff/tickets").query({ sortBy: "bad" });
    expect(invalid.status).toBe(400); expect(invalid.body.error.code).toBe("INVALID_QUERY");
    const out = await agent.get("/api/staff/tickets").query({ search: "Queue alpha", page: 2 });
    expect(out.status).toBe(400); expect(out.body.error.code).toBe("PAGE_OUT_OF_RANGE");
  });
  it("allows Administrator and rejects Requester and anonymous callers", async () => {
    expect((await (await signedIn(adminEmail)).get("/api/staff/tickets")).status).toBe(200);
    const forbidden = await (await signedIn(requesterEmail)).get("/api/staff/tickets"); expect(forbidden.status).toBe(403); expect(forbidden.body.error.code).toBe("ROLE_FORBIDDEN");
    const missing = await request(app).get("/api/staff/tickets"); expect(missing.status).toBe(401); expect(missing.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
