import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const password = "Valid-Password1!";
const staffEmail = "lab3-comments-staff@toktickit.test";
const adminEmail = "lab3-comments-admin@toktickit.test";
const requesterEmail = "lab3-comments-requester@toktickit.test";

describe("Lab 3 Public Comments and Internal Notes", () => {
  let staffId = 0; let adminId = 0; let requesterId = 0; let ticketId = 0;
  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const create = async (email: string, name: string, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") => prisma.requesterUser.upsert({ where: { email }, update: { name, role, isActive: true, passwordHash, mustChangePassword: false }, create: { name, email, role, isActive: true, passwordHash, mustChangePassword: false } });
    staffId = (await create(staffEmail, "Comments Staff", "IT_STAFF")).id;
    adminId = (await create(adminEmail, "Comments Admin", "ADMINISTRATOR")).id;
    requesterId = (await create(requesterEmail, "Comments Requester", "REQUESTER")).id;
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    ticketId = (await prisma.ticket.create({ data: { ticketNumber: `COMMENTS-${Date.now()}`, submissionKey: randomUUID(), requesterId, categoryId: category.id, relatedSystemId: system.id, summary: "Comments fixture", requestedPriority: "MEDIUM", itPriority: "MEDIUM", description: "Fixture for comment and note authorization." } })).id;
  });
  afterAll(async () => { await prisma.internalNote.deleteMany({ where: { ticketId } }); await prisma.comment.deleteMany({ where: { ticketId } }); await prisma.ticket.deleteMany({ where: { id: ticketId } }); await prisma.session.deleteMany({ where: { userId: { in: [staffId, adminId, requesterId] } } }); await prisma.requesterUser.deleteMany({ where: { id: { in: [staffId, adminId, requesterId] } } }); await prisma.$disconnect(); });
  async function signedIn(email: string) { const agent = request.agent(app); const response = await agent.post("/api/auth/login").send({ email, password }); expect(response.status).toBe(200); return agent; }

  it("lets Staff create Public Comments and lets Staff/Admin read them", async () => {
    const staff = await signedIn(staffEmail);
    const created = await staff.post(`/api/staff/tickets/${ticketId}/comments`).send({ content: "  Staff update  " });
    expect(created.status).toBe(201);
    expect(created.body.data.comment).toEqual(expect.objectContaining({ content: "Staff update", author: { id: staffId, name: "Comments Staff" }, createdAt: expect.any(String) }));
    expect((await (await signedIn(adminEmail)).get(`/api/staff/tickets/${ticketId}/comments`)).body.data.items.some((item: { content: string }) => item.content === "Staff update")).toBe(true);
  });

  it("keeps Internal Notes private and prevents Administrator mutation", async () => {
    const staff = await signedIn(staffEmail);
    const created = await staff.post(`/api/staff/tickets/${ticketId}/notes`).send({ content: "  Staff-only note  " });
    expect(created.status).toBe(201);
    expect(created.body.data.note).toEqual(expect.objectContaining({ content: "Staff-only note", author: { id: staffId, name: "Comments Staff" }, createdAt: expect.any(String) }));
    expect((await (await signedIn(adminEmail)).get(`/api/staff/tickets/${ticketId}/notes`)).body.data.items.some((item: { content: string }) => item.content === "Staff-only note")).toBe(true);
    const adminCreate = await (await signedIn(adminEmail)).post(`/api/staff/tickets/${ticketId}/notes`).send({ content: "Not allowed" });
    expect(adminCreate.status).toBe(403);
    expect(adminCreate.body.error.code).toBe("ROLE_FORBIDDEN");
    const requesterRead = await (await signedIn(requesterEmail)).get(`/api/staff/tickets/${ticketId}/notes`);
    expect(requesterRead.status).toBe(403);
    expect(requesterRead.body.error.code).toBe("ROLE_FORBIDDEN");
  });

  it("rejects blank or oversized content and exposes no edit/delete operation", async () => {
    const staff = await signedIn(staffEmail);
    const blank = await staff.post(`/api/staff/tickets/${ticketId}/comments`).send({ content: "   " });
    expect(blank.status).toBe(400);
    expect(blank.body.error.code).toBe("VALIDATION_ERROR");
    const oversized = await staff.post(`/api/staff/tickets/${ticketId}/notes`).send({ content: "x".repeat(5001) });
    expect(oversized.status).toBe(400);
    const edit = await staff.patch(`/api/staff/tickets/${ticketId}/comments/1`).send({ content: "changed" });
    expect(edit.status).toBe(404);
  });
});
