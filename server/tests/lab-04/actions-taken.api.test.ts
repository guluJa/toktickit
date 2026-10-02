import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const password = "Lab4-Test-Password1!";
const marker = "lab4-action-api";
const emails = {
  staff: `${marker}-staff@toktickit.test`,
  admin: `${marker}-admin@toktickit.test`,
  owner: `${marker}-owner@toktickit.test`,
  outsider: `${marker}-outsider@toktickit.test`,
};

function requireIsolatedDatabase(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw || new URL(raw).pathname !== "/toktickit_e2e") {
    throw new Error("Lab 4 integration tests require the dedicated toktickit_e2e database.");
  }
}

describe("API-01/02/03 Actions Taken routes", () => {
  let ticketId = 0;
  let otherTicketId = 0;
  let staffId = 0;
  let ownerId = 0;
  let staff: ReturnType<typeof request.agent>;
  let admin: ReturnType<typeof request.agent>;
  let owner: ReturnType<typeof request.agent>;
  let outsider: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    requireIsolatedDatabase();
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const hash = await hashPassword(password);
    const ids = new Map<string, number>();
    for (const [roleName, email] of Object.entries(emails)) {
      const role = roleName === "staff" ? "IT_STAFF" : roleName === "admin" ? "ADMINISTRATOR" : "REQUESTER";
      const user = await prisma.requesterUser.upsert({
        where: { email },
        update: { passwordHash: hash, role, isActive: true, mustChangePassword: false },
        create: { name: `Lab 4 ${roleName}`, email, passwordHash: hash, role, isActive: true, mustChangePassword: false },
      });
      ids.set(roleName, user.id);
    }
    staffId = ids.get("staff")!;
    ownerId = ids.get("owner")!;
    const makeTicket = async (requesterId: number) => prisma.ticket.create({
      data: {
        ticketNumber: `LAB4-ACTION-${randomUUID()}`, submissionKey: randomUUID(),
        requesterId, ownerId: staffId, categoryId: category.id, relatedSystemId: system.id,
        summary: "Lab 4 API fixture", requestedPriority: "MEDIUM", itPriority: "MEDIUM",
        description: "Isolated Actions Taken API fixture.",
      },
    });
    ticketId = (await makeTicket(ownerId)).id;
    otherTicketId = (await makeTicket(ids.get("outsider")!)).id;
    const signIn = async (email: string) => {
      const agent = request.agent(app);
      const login = await agent.post("/api/auth/login").send({ email, password });
      expect(login.status).toBe(200);
      return agent;
    };
    staff = await signIn(emails.staff);
    admin = await signIn(emails.admin);
    owner = await signIn(emails.owner);
    outsider = await signIn(emails.outsider);
  });

  afterAll(async () => {
    if (!ticketId) return;
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: [ticketId, otherTicketId] } } });
    await prisma.ticket.deleteMany({ where: { id: { in: [ticketId, otherTicketId] } } });
    const users = await prisma.requesterUser.findMany({ where: { email: { in: Object.values(emails) } }, select: { id: true } });
    await prisma.session.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
    await prisma.$disconnect();
  });

  it("lists zero, one and many records in stable pages and creates server-managed fields", async () => {
    const path = `/api/staff/tickets/${ticketId}/actions`;
    const empty = await staff.get(path);
    expect(empty.status).toBe(200);
    expect(empty.body.data.items).toEqual([]);
    expect(empty.body.data.pagination).toEqual({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
    for (const index of [1, 2, 3]) {
      const created = await staff.post(path).send({
        description: `  Diagnosis ${index}  `, result: "  Completed  ",
        followUpRequired: index === 3, followUpNote: index === 3 ? "Confirm later" : null,
        attachmentNotes: null,
      });
      expect(created.status).toBe(201);
      expect(created.body.data.action).toEqual(expect.objectContaining({
        ticketId, description: `Diagnosis ${index}`, result: "Completed", version: 1,
        performedBy: expect.objectContaining({ id: staffId }),
        ticketOwner: expect.objectContaining({ id: staffId }),
      }));
      expect(created.body.data.action).not.toHaveProperty("performedById");
      expect(created.body.data.action.performedBy).not.toHaveProperty("passwordHash");
      expect(new Date(created.body.data.action.actionAt).getTime()).not.toBeNaN();
    }
    const firstPage = await staff.get(`${path}?page=1&pageSize=2`);
    const secondPage = await staff.get(`${path}?page=2&pageSize=2`);
    expect(firstPage.body.data.pagination).toEqual({ page: 1, pageSize: 2, totalItems: 3, totalPages: 2 });
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.items.map((item: { id: number }) => item.id))
      .toEqual([...firstPage.body.data.items.map((item: { id: number }) => item.id)].sort((a, b) => a - b));
    expect((await staff.get(`${path}?pageSize=101`)).body.error.code).toBe("VALIDATION_ERROR");
  });

  it("enforces requester ownership/read-only access and Staff/Admin permissions", async () => {
    const ownPath = `/api/tickets/${ticketId}/actions`;
    const own = await owner.get(ownPath);
    expect(own.status).toBe(200);
    expect(own.body.data.items).toHaveLength(3);
    expect((await outsider.get(ownPath)).status).toBe(404);
    expect((await owner.post(`/api/staff/tickets/${ticketId}/actions`).send({})).body.error.code).toBe("ROLE_FORBIDDEN");
    // Supplying a cookie bypasses the Lab 2 test-only requester-header fallback.
    expect((await request(app).get(ownPath).set("Cookie", "toktickit_session=invalid")).body.error.code)
      .toBe("SESSION_INVALID");
    const adminRead = await admin.get(`/api/staff/tickets/${otherTicketId}/actions`);
    expect(adminRead.status).toBe(200);
  });

  it("rejects managed fields, validates follow-up and preserves stale edits", async () => {
    const path = `/api/staff/tickets/${ticketId}/actions`;
    const bad = await staff.post(path).send({
      description: "Action", result: "Result", followUpRequired: true, followUpNote: null,
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
    const impersonation = await admin.post(path).send({
      description: "Action", result: "Result", followUpRequired: false, followUpNote: null,
      performedById: staffId,
    });
    expect(impersonation.status).toBe(400);
    const item = (await staff.get(path)).body.data.items[0];
    const edited = await admin.patch(`${path}/${item.id}`).send({ result: "Admin edited", version: item.version });
    expect(edited.status).toBe(200);
    expect(edited.body.data.action.version).toBe(item.version + 1);
    expect(edited.body.data.action.performedBy.id).toBe(staffId);
    const stale = await staff.patch(`${path}/${item.id}`).send({ result: "Stale write", version: item.version });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("STALE_UPDATE");
    expect((await prisma.actionTaken.findUniqueOrThrow({ where: { id: item.id } })).result).toBe("Admin edited");
    expect((await staff.delete(`${path}/${item.id}`)).body.error.code).toBe("METHOD_NOT_ALLOWED");
    expect((await staff.patch(`${path}/999999999`).send({ result: "x", version: 1 })).body.error.code).toBe("ACTION_NOT_FOUND");
  });

  it("rejects mutations in CLOSED/CANCELLED but permits RESOLVED follow-up edits", async () => {
    const path = `/api/staff/tickets/${ticketId}/actions`;
    const item = (await staff.get(path)).body.data.items[2];
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "CLOSED" } });
    const payload = { description: "Blocked", result: "No", followUpRequired: false, followUpNote: null };
    expect((await staff.post(path).send(payload)).body.error.code).toBe("ACTION_STATE_CONFLICT");
    expect((await staff.patch(`${path}/${item.id}`).send({ result: "Blocked", version: item.version })).body.error.code)
      .toBe("ACTION_STATE_CONFLICT");
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "CANCELLED" } });
    expect((await staff.post(path).send(payload)).status).toBe(409);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "RESOLVED" } });
    const allowed = await staff.patch(`${path}/${item.id}`).send({ followUpRequired: false, followUpNote: null, version: item.version });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.action.followUpRequired).toBe(false);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW" } });
  });
});
