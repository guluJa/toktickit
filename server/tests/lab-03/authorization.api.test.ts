import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const password = "Valid-Password1!";
const ownerEmail = "lab3-authorization-owner@toktickit.test";
const otherEmail = "lab3-authorization-other@toktickit.test";
const staffEmail = "lab3-authorization-staff@toktickit.test";
const adminEmail = "lab3-authorization-admin@toktickit.test";

describe("Lab 3 requester authorization", () => {
  let ownerId: number;
  let otherId: number;
  let staffId: number;
  let adminId: number;
  let ownerTicketId: number;
  let otherTicketId: number;

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const owner = await prisma.requesterUser.upsert({ where: { email: ownerEmail }, update: { passwordHash, role: "REQUESTER", isActive: true, mustChangePassword: false }, create: { name: "Authorization Owner", email: ownerEmail, passwordHash, role: "REQUESTER", isActive: true, mustChangePassword: false } });
    const other = await prisma.requesterUser.upsert({ where: { email: otherEmail }, update: { passwordHash, role: "REQUESTER", isActive: true, mustChangePassword: false }, create: { name: "Authorization Other", email: otherEmail, passwordHash, role: "REQUESTER", isActive: true, mustChangePassword: false } });
    const staff = await prisma.requesterUser.upsert({ where: { email: staffEmail }, update: { passwordHash, role: "IT_STAFF", isActive: true, mustChangePassword: false }, create: { name: "Authorization Staff", email: staffEmail, passwordHash, role: "IT_STAFF", isActive: true, mustChangePassword: false } });
    const admin = await prisma.requesterUser.upsert({ where: { email: adminEmail }, update: { passwordHash, role: "ADMINISTRATOR", isActive: true, mustChangePassword: false }, create: { name: "Authorization Admin", email: adminEmail, passwordHash, role: "ADMINISTRATOR", isActive: true, mustChangePassword: false } });
    ownerId = owner.id; otherId = other.id; staffId = staff.id; adminId = admin.id;
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const base = { categoryId: category.id, relatedSystemId: system.id, summary: "Authorization fixture ticket", requestedPriority: "MEDIUM" as const, description: "Fixture ticket for ownership checks." };
    const ownerTicket = await prisma.ticket.create({ data: { ...base, requesterId: ownerId, submissionKey: randomUUID(), ticketNumber: `AUTH-${Date.now()}-1` } });
    const otherTicket = await prisma.ticket.create({ data: { ...base, requesterId: otherId, submissionKey: randomUUID(), ticketNumber: `AUTH-${Date.now()}-2` } });
    ownerTicketId = ownerTicket.id; otherTicketId = otherTicket.id;
  });

  afterAll(async () => {
    await prisma.comment.deleteMany({ where: { ticketId: { in: [ownerTicketId, otherTicketId] } } });
    await prisma.ticket.deleteMany({ where: { id: { in: [ownerTicketId, otherTicketId] } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: [ownerId, otherId] } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: [staffId, adminId] } } });
    await prisma.$disconnect();
  });

  async function signedIn(email = ownerEmail) {
    const agent = request.agent(app);
    const response = await agent.post("/api/auth/login").send({ email, password });
    expect(response.status).toBe(200);
    return agent;
  }

  it("requires a session and derives list ownership from the authenticated user", async () => {
    const previousOptIn = process.env.ALLOW_LEGACY_REQUESTER_CONTEXT_TESTS;
    process.env.ALLOW_LEGACY_REQUESTER_CONTEXT_TESTS = "false";
    const missing = await request(app).get("/api/tickets");
    process.env.ALLOW_LEGACY_REQUESTER_CONTEXT_TESTS = previousOptIn;
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    const agent = await signedIn();
    const response = await agent.get("/api/tickets").set("X-Development-Requester-Id", String(otherId));
    expect(response.status).toBe(200);
    expect(response.body.items.some((item: { id: number }) => item.id === otherTicketId)).toBe(false);
  });

  it("returns a safe 404 for another requester's ticket", async () => {
    const agent = await signedIn();
    const response = await agent.get(`/api/tickets/${otherTicketId}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TICKET_NOT_FOUND");
    expect(JSON.stringify(response.body)).not.toContain(otherEmail);
  });

  it("returns ROLE_FORBIDDEN when IT Staff or Administrator calls a Requester API", async () => {
    for (const email of [staffEmail, adminEmail]) {
      const agent = await signedIn(email);
      const response = await agent.get("/api/tickets");
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("ROLE_FORBIDDEN");
    }
  });

  it("allows owner public comments and resolved indication without changing formal status", async () => {
    const agent = await signedIn();
    const comment = await agent.post(`/api/tickets/${ownerTicketId}/comments`).send({ content: "It is still happening." });
    expect(comment.status).toBe(201);
    expect(comment.body.data.comment.author.id).toBe(ownerId);
    const resolved = await agent.post(`/api/tickets/${ownerTicketId}/resolved`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.currentStatus).toBe("NEW");
  });
});
