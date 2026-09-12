import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const password = "Valid-Password1!";
const staffEmail = "lab3-detail-staff@toktickit.test";
const adminEmail = "lab3-detail-admin@toktickit.test";
const requesterEmail = "lab3-detail-requester@toktickit.test";
const inactiveStaffEmail = "lab3-detail-inactive-staff@toktickit.test";

describe("Lab 3 Staff Ticket Detail and operations", () => {
  let staffId = 0; let adminId = 0; let requesterId = 0; let inactiveStaffId = 0; let ticketId = 0; let removedAttachmentId = 0; let activeAttachmentId = 0; let activeStoragePath = "";

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const makeUser = async (email: string, name: string, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR", isActive = true) => prisma.requesterUser.upsert({ where: { email }, update: { name, role, isActive, passwordHash, mustChangePassword: false }, create: { name, email, role, isActive, passwordHash, mustChangePassword: false } });
    staffId = (await makeUser(staffEmail, "Detail Staff", "IT_STAFF")).id;
    adminId = (await makeUser(adminEmail, "Detail Admin", "ADMINISTRATOR")).id;
    requesterId = (await makeUser(requesterEmail, "Detail Requester", "REQUESTER")).id;
    inactiveStaffId = (await makeUser(inactiveStaffEmail, "Inactive Detail Staff", "IT_STAFF", false)).id;
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    const ticket = await prisma.ticket.create({ data: { ticketNumber: `DETAIL-${Date.now()}`, submissionKey: randomUUID(), requesterId, categoryId: category.id, relatedSystemId: system.id, summary: "Staff detail fixture", requestedPriority: "HIGH", itPriority: "HIGH", description: "Fixture for Staff Ticket Detail operations." } });
    ticketId = ticket.id;
    await prisma.comment.create({ data: { ticketId, authorId: requesterId, content: "Requester public comment." } });
    await prisma.internalNote.create({ data: { ticketId, authorId: staffId, content: "Private operational note." } });
    const removed = await prisma.attachment.create({ data: { ticketId, originalName: "removed.txt", storageKey: `missing-${randomUUID()}`, mimeType: "text/plain", sizeBytes: 10, removedAt: new Date(), removalReason: "No longer needed.", removedByRequesterId: requesterId } });
    removedAttachmentId = removed.id;
    const activeStorageKey = `staff-visible-${randomUUID()}.txt`;
    activeStoragePath = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"), activeStorageKey);
    await fs.mkdir(path.dirname(activeStoragePath), { recursive: true });
    await fs.writeFile(activeStoragePath, "staff-visible attachment");
    const active = await prisma.attachment.create({ data: { ticketId, originalName: "active.txt", storageKey: activeStorageKey, mimeType: "text/plain", sizeBytes: 24 } });
    activeAttachmentId = active.id;
  });

  afterAll(async () => {
    await prisma.internalNote.deleteMany({ where: { ticketId } });
    await prisma.comment.deleteMany({ where: { ticketId } });
    await prisma.attachment.deleteMany({ where: { ticketId } });
    if (activeStoragePath) await fs.rm(activeStoragePath, { force: true });
    await prisma.ticket.deleteMany({ where: { id: ticketId } });
    await prisma.session.deleteMany({ where: { userId: { in: [staffId, adminId, requesterId, inactiveStaffId] } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: [staffId, adminId, requesterId, inactiveStaffId] } } });
    await prisma.$disconnect();
  });

  async function signedIn(email: string) { const agent = request.agent(app); const response = await agent.post("/api/auth/login").send({ email, password }); expect(response.status).toBe(200); return agent; }

  it("returns complete Staff Detail data with requester, owner, priorities, resolution and attachments", async () => {
    const response = await (await signedIn(staffEmail)).get(`/api/staff/tickets/${ticketId}`);
    expect(response.status).toBe(200);
    expect(response.body.data.ticket).toEqual(expect.objectContaining({ id: ticketId, requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", requesterResolvedAt: null, owner: null }));
    expect(response.body.data.ticket.requester).toEqual(expect.objectContaining({ id: requesterId, name: "Detail Requester", email: requesterEmail }));
    expect(response.body.data.ticket.attachments[0]).toEqual(expect.objectContaining({ originalName: "removed.txt", state: "REMOVED", removalReason: "No longer needed." }));
    expect(response.body.data.comments[0].content).toBe("Requester public comment.");
    expect(response.body.data.internalNotes[0].content).toBe("Private operational note.");
  });

  it("supports claim, assign, reassign and unassign with eligible active owners only", async () => {
    const agent = await signedIn(staffEmail);
    expect((await agent.post(`/api/staff/tickets/${ticketId}/assignment`).send({ ownerId: staffId })).status).toBe(200);
    expect((await agent.post(`/api/staff/tickets/${ticketId}/assignment`).send({ ownerId: adminId })).body.data.ticket.owner.id).toBe(adminId);
    expect((await agent.post(`/api/staff/tickets/${ticketId}/assignment`).send({ ownerId: null })).body.data.ticket.owner).toBeNull();
    const inactive = await agent.post(`/api/staff/tickets/${ticketId}/assignment`).send({ ownerId: inactiveStaffId });
    expect(inactive.status).toBe(404);
    expect(inactive.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("enforces priority role permission and the status transition matrix", async () => {
    const staff = await signedIn(staffEmail);
    const admin = await signedIn(adminEmail);
    expect((await admin.patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority: "LOW" })).status).toBe(200);
    expect((await staff.patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "OPEN" })).status).toBe(200);
    const invalid = await staff.patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "RESOLVED" });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe("STATUS_TRANSITION_NOT_ALLOWED");
    expect((await staff.patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "IN_PROGRESS" })).status).toBe(200);
    const requester = await signedIn(requesterEmail);
    const forbidden = await requester.patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority: "HIGH" });
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe("ROLE_FORBIDDEN");
  });

  it("returns safe errors for missing detail and removed attachment downloads", async () => {
    const staff = await signedIn(staffEmail);
    const missing = await staff.get("/api/staff/tickets/999999999");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("TICKET_NOT_FOUND");
    const removed = await staff.get(`/api/attachments/${removedAttachmentId}/download`);
    expect(removed.status).toBe(410);
    expect(removed.body.error.code).toBe("ATTACHMENT_REMOVED");
  });

  it("allows Staff and Administrator read-only download of an active Attachment", async () => {
    const staff = await signedIn(staffEmail);
    const admin = await signedIn(adminEmail);
    const staffResponse = await staff.get(`/api/attachments/${activeAttachmentId}/download`);
    expect(staffResponse.status).toBe(200);
    expect(staffResponse.text).toBe("staff-visible attachment");
    const adminResponse = await admin.get(`/api/attachments/${activeAttachmentId}/download`);
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.text).toBe("staff-visible attachment");
  });
});
