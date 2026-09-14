import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import type { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const password = "Valid-Password1!";
const staffEmail = "lab3-detail-staff@toktickit.test";
const adminEmail = "lab3-detail-admin@toktickit.test";
const requesterEmail = "lab3-detail-requester@toktickit.test";
const inactiveStaffEmail = "lab3-detail-inactive-staff@toktickit.test";
const otherRequesterEmail = "lab3-detail-other-requester@toktickit.test";

describe("Lab 3 Staff Ticket Detail and operations", () => {
  let staffId = 0; let adminId = 0; let requesterId = 0; let inactiveStaffId = 0; let otherRequesterId = 0; let ticketId = 0; let otherTicketId = 0; const createdPriorityTicketIds: number[] = []; let removedAttachmentId = 0; let activeAttachmentId = 0; let otherAttachmentId = 0; let activeStoragePath = ""; let otherStoragePath = "";

  beforeAll(async () => {
    const previousUsers = await prisma.requesterUser.findMany({ where: { email: { in: [staffEmail, adminEmail, requesterEmail, inactiveStaffEmail, otherRequesterEmail] } }, select: { id: true } });
    const previousUserIds = previousUsers.map((user) => user.id);
    if (previousUserIds.length) {
      const previousTickets = await prisma.ticket.findMany({ where: { requesterId: { in: previousUserIds } }, select: { id: true } });
      const previousTicketIds = previousTickets.map((ticket) => ticket.id);
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: previousTicketIds } } });
      await prisma.comment.deleteMany({ where: { ticketId: { in: previousTicketIds } } });
      await prisma.attachment.deleteMany({ where: { ticketId: { in: previousTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: previousTicketIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: previousUserIds } } });
      await prisma.requesterUser.deleteMany({ where: { id: { in: previousUserIds } } });
    }
    const passwordHash = await hashPassword(password);
    const makeUser = async (email: string, name: string, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR", isActive = true) => prisma.requesterUser.upsert({ where: { email }, update: { name, role, isActive, passwordHash, mustChangePassword: false }, create: { name, email, role, isActive, passwordHash, mustChangePassword: false } });
    staffId = (await makeUser(staffEmail, "Detail Staff", "IT_STAFF")).id;
    adminId = (await makeUser(adminEmail, "Detail Admin", "ADMINISTRATOR")).id;
    requesterId = (await makeUser(requesterEmail, "Detail Requester", "REQUESTER")).id;
    inactiveStaffId = (await makeUser(inactiveStaffEmail, "Inactive Detail Staff", "IT_STAFF", false)).id;
    otherRequesterId = (await makeUser(otherRequesterEmail, "Other Detail Requester", "REQUESTER")).id;
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
    const otherTicket = await prisma.ticket.create({ data: { ticketNumber: `DETAIL-OTHER-${Date.now()}`, submissionKey: randomUUID(), requesterId: otherRequesterId, categoryId: category.id, relatedSystemId: system.id, summary: "Other owner fixture", requestedPriority: "LOW", itPriority: "LOW", description: "Attachment ownership fixture for another requester." } });
    otherTicketId = otherTicket.id;
    const otherStorageKey = `other-requester-${randomUUID()}.txt`;
    otherStoragePath = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads"), otherStorageKey);
    await fs.writeFile(otherStoragePath, "other requester attachment");
    const otherAttachment = await prisma.attachment.create({ data: { ticketId: otherTicketId, originalName: "other.txt", storageKey: otherStorageKey, mimeType: "text/plain", sizeBytes: 26 } });
    otherAttachmentId = otherAttachment.id;
  });

  afterAll(async () => {
    await prisma.internalNote.deleteMany({ where: { ticketId } });
    await prisma.comment.deleteMany({ where: { ticketId } });
    await prisma.attachment.deleteMany({ where: { ticketId } });
    if (activeStoragePath) await fs.rm(activeStoragePath, { force: true });
    await prisma.attachment.deleteMany({ where: { ticketId: otherTicketId } });
    if (otherStoragePath) await fs.rm(otherStoragePath, { force: true });
    await prisma.ticket.deleteMany({ where: { id: ticketId } });
    await prisma.ticket.deleteMany({ where: { id: otherTicketId } });
    await prisma.ticket.deleteMany({ where: { id: { in: createdPriorityTicketIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: [staffId, adminId, requesterId, inactiveStaffId, otherRequesterId] } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: [staffId, adminId, requesterId, inactiveStaffId, otherRequesterId] } } });
    await prisma.$disconnect();
  });

  async function signedIn(email: string) { const agent = request.agent(app); const response = await agent.post("/api/auth/login").send({ email, password }); expect(response.status).toBe(200); return agent; }

  it("returns complete Staff Detail data with requester, owner, priorities, resolution and attachments", async () => {
    await prisma.ticket.update({ where: { id: ticketId }, data: { requesterResolvedAt: new Date() } });
    const response = await (await signedIn(staffEmail)).get(`/api/staff/tickets/${ticketId}`);
    expect(response.status).toBe(200);
    expect(response.body.data.ticket).toEqual(expect.objectContaining({ id: ticketId, requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", requesterResolvedAt: expect.any(String), owner: null }));
    expect(response.body.data.ticket.requester).toEqual(expect.objectContaining({ id: requesterId, name: "Detail Requester", email: requesterEmail }));
    expect(response.body.data.ticket.attachments[0]).toEqual(expect.objectContaining({ originalName: "removed.txt", state: "REMOVED", removalReason: "No longer needed." }));
    expect(response.body.data.comments[0].content).toBe("Requester public comment.");
    expect(response.body.data.internalNotes[0].content).toBe("Private operational note.");
    await prisma.ticket.update({ where: { id: ticketId }, data: { requesterResolvedAt: null } });
  });

  it("copies requested priority to IT Priority for every Create Ticket priority", async () => {
    const requester = await signedIn(requesterEmail);
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
    for (const requestedPriority of ["LOW", "MEDIUM", "HIGH"] as const) {
      const response = await requester.post("/api/tickets").send({
        submissionKey: randomUUID(), categoryId: category.id, relatedSystemId: system.id,
        summary: `Priority ${requestedPriority} fixture`, requestedPriority,
        description: "Verify requested and IT priorities stay aligned.",
      });
      expect(response.status).toBe(201);
      createdPriorityTicketIds.push(response.body.ticket.id);
      expect(response.body.ticket.itPriority).toBe(requestedPriority);
      const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: response.body.ticket.id } });
      expect(saved.itPriority).toBe(requestedPriority);
    }
  });

  it("supports claim, assign, reassign and unassign with eligible active owners only", async () => {
    const agent = await signedIn(staffEmail);
    const invalidAssignment = await agent.post(`/api/staff/tickets/${ticketId}/assignment`).send({ ownerId: "invalid" });
    expect(invalidAssignment.status).toBe(400);
    expect(invalidAssignment.body.error.code).toBe("VALIDATION_ERROR");
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
    const invalidPriority = await admin.patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority: "URGENT" });
    expect(invalidPriority.status).toBe(400);
    expect(invalidPriority.body.error.code).toBe("VALIDATION_ERROR");
    const adminAssignment = await admin.post(`/api/staff/tickets/${ticketId}/assignment`).send({ ownerId: staffId });
    expect(adminAssignment.status).toBe(403);
    const adminStatus = await admin.patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "OPEN" });
    expect(adminStatus.status).toBe(403);
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

  it("accepts every contract transition and rejects every other transition with 409", async () => {
    const staff = await signedIn(staffEmail);
    const transitions: Record<string, readonly string[]> = {
      NEW: ["OPEN"],
      OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
      WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      RESOLVED: ["CLOSED", "REOPENED"],
      CLOSED: ["REOPENED"],
      REOPENED: [],
      CANCELLED: [],
    };
    const statuses = Object.keys(transitions);
    for (const [from, allowed] of Object.entries(transitions)) {
      for (const to of statuses) {
        await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: from as TicketStatus } });
        const response = await staff.patch(`/api/staff/tickets/${ticketId}/status`).send({ status: to });
        if (allowed.includes(to)) {
          expect(response.status, `${from}->${to}`).toBe(200);
        } else {
          expect(response.status, `${from}->${to}`).toBe(409);
          expect(response.body.error.code).toBe("STATUS_TRANSITION_NOT_ALLOWED");
        }
      }
    }
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

  it("enforces requester session ownership for Attachment download and Staff Detail", async () => {
    const requester = await signedIn(requesterEmail);
    const ownDownload = await requester.get(`/api/attachments/${activeAttachmentId}/download`);
    expect(ownDownload.status).toBe(200);
    expect(ownDownload.text).toBe("staff-visible attachment");
    const crossOwnerDownload = await requester.get(`/api/attachments/${otherAttachmentId}/download`);
    expect(crossOwnerDownload.status).toBe(404);
    expect(crossOwnerDownload.body.error.code).toBe("ATTACHMENT_NOT_FOUND");
    const staffDetail = await requester.get(`/api/staff/tickets/${ticketId}`);
    expect(staffDetail.status).toBe(403);
    expect(staffDetail.body.error.code).toBe("ROLE_FORBIDDEN");
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
