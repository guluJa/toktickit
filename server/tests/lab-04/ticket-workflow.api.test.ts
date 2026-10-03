import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { TicketStatus } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import * as mutation from "../../src/ticket-mutation.js";

const prisma = getPrisma();
const password = "Lab4-Workflow-Test1!";
const ticketIds: number[] = [];
const userIds: number[] = [];
let staffId: number, adminId: number, requesterId: number, otherId: number, inactiveId: number;
let categoryId: number, relatedSystemId: number;
let staff: ReturnType<typeof request.agent>, admin: ReturnType<typeof request.agent>, requester: ReturnType<typeof request.agent>, outsider: ReturnType<typeof request.agent>;
const fields = { description: "Diagnosis", result: "Restored", followUpRequired: false, followUpNote: null, attachmentNotes: null };
const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS"], CANCELLED: [],
};
async function makeTicket(currentStatus: TicketStatus = "IN_PROGRESS", action = true) {
  const ticket = await prisma.ticket.create({ data: {
    ticketNumber: `WORKFLOW-${randomUUID()}`, submissionKey: randomUUID(), requesterId, ownerId: staffId,
    categoryId, relatedSystemId, summary: "Workflow test", description: "Isolated workflow fixture", requestedPriority: "MEDIUM", currentStatus,
  } });
  ticketIds.push(ticket.id);
  if (action) await prisma.actionTaken.create({ data: { ticketId: ticket.id, performedById: staffId, ...fields } });
  return ticket;
}
const statusPath = (id: number) => `/api/staff/tickets/${id}/status`;
const actionPath = (id: number) => `/api/staff/tickets/${id}/actions`;

describe("API-04 Ticket workflow and atomic Action/Status changes", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/toktickit_e2e") throw Error("Workflow integration tests require isolated toktickit_e2e.");
    categoryId = (await prisma.category.findFirstOrThrow()).id;
    relatedSystemId = (await prisma.relatedSystem.findFirstOrThrow()).id;
    const hash = await hashPassword(password);
    const createUser = async (role: "IT_STAFF" | "ADMINISTRATOR" | "REQUESTER", isActive = true) => {
      const user = await prisma.requesterUser.create({ data: { name: "Workflow fixture", email: `workflow-${randomUUID()}@toktickit.test`, role, isActive, mustChangePassword: false, passwordHash: hash } });
      userIds.push(user.id);
      return user;
    };
    const staffUser = await createUser("IT_STAFF"); staffId = staffUser.id;
    const adminUser = await createUser("ADMINISTRATOR"); adminId = adminUser.id;
    const requesterUser = await createUser("REQUESTER"); requesterId = requesterUser.id;
    const other = await createUser("REQUESTER"); otherId = other.id;
    inactiveId = (await createUser("IT_STAFF", false)).id;
    const login = async (email: string) => { const agent = request.agent(app); expect((await agent.post("/api/auth/login").send({ email, password })).status).toBe(200); return agent; };
    staff = await login(staffUser.email); admin = await login(adminUser.email); requester = await login(requesterUser.email); outsider = await login(other.email);
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("checks all 64 transition pairs, increments once and preserves data on rejection", async () => {
    const ticket = await makeTicket();
    for (const from of Object.values(TicketStatus)) for (const to of Object.values(TicketStatus)) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { currentStatus: from, version: 5 } });
      const response = await staff.patch(statusPath(ticket.id)).send({ status: to, version: 5, ...(to === "REOPENED" ? { reopenReason: "Same issue returned" } : {}) });
      const allowed = matrix[from].includes(to);
      expect(response.status, `${from} -> ${to}`).toBe(allowed ? 200 : 409);
      const saved = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(saved.currentStatus).toBe(allowed ? to : from); expect(saved.version).toBe(allowed ? 6 : 5);
      if (allowed) expect(response.body.data.ticket.version).toBe(6);
      else expect(response.body.error.code).toBe("STATUS_TRANSITION_NOT_ALLOWED");
    }
  });
  it("rejects bad version, reason, fields and IDs without writes; returns safe missing/auth/role errors", async () => {
    const ticket = await makeTicket("CLOSED");
    for (const body of [{ status: "REOPENED", version: 1 }, { status: "REOPENED", version: 1, reopenReason: " " }, { status: "OPEN", version: 2147483648 }, { status: "OPEN" }, { status: "OPEN", version: "1" }, { status: "OPEN", version: 1, performedById: staffId }]) expect((await staff.patch(statusPath(ticket.id)).send(body)).body.error.code).toBe("VALIDATION_ERROR");
    expect((await staff.patch(statusPath(2147483648)).send({ status: "OPEN", version: 1 })).status).toBe(400);
    expect((await staff.patch(statusPath(2147483647)).send({ status: "OPEN", version: 1 })).body.error.code).toBe("TICKET_NOT_FOUND");
    expect((await request(app).patch(statusPath(ticket.id)).send({ status: "REOPENED", version: 1 })).body.error.code).toBe("AUTHENTICATION_REQUIRED");
    for (const agent of [admin, requester]) expect((await agent.patch(statusPath(ticket.id)).send({ status: "REOPENED", version: 1, reopenReason: "Returned" })).body.error.code).toBe("ROLE_FORBIDDEN");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "CLOSED", version: 1 });
  });
  it("requires eligible active owner and valid Action; follows multi-Action resolution/closure gates", async () => {
    const ticket = await makeTicket("IN_PROGRESS", false);
    const resolve = () => staff.patch(statusPath(ticket.id)).send({ status: "RESOLVED", version: 1 });
    expect((await resolve()).body.error.code).toBe("RESOLUTION_GATE_FAILED");
    const action = await prisma.actionTaken.create({ data: { ticketId: ticket.id, performedById: staffId, ...fields, result: " " } });
    expect((await resolve()).body.error.code).toBe("RESOLUTION_GATE_FAILED");
    await prisma.actionTaken.update({ where: { id: action.id }, data: { result: "Restored" } });
    for (const ownerId of [null, inactiveId, requesterId]) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { ownerId } });
      expect((await resolve()).body.error.code).toBe("RESOLUTION_GATE_FAILED");
      expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "IN_PROGRESS", version: 1 });
    }
    await prisma.ticket.update({ where: { id: ticket.id }, data: { ownerId: adminId } });
    const pending = await prisma.actionTaken.create({ data: { ticketId: ticket.id, performedById: staffId, ...fields, followUpRequired: true, followUpNote: "Confirm" } });
    expect((await resolve()).status).toBe(200);
    const blocked = await staff.patch(statusPath(ticket.id)).send({ status: "CLOSED", version: 2 });
    expect(blocked.body.error.code).toBe("RESOLUTION_GATE_FAILED");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "RESOLVED", version: 2 });
    expect((await admin.patch(`${actionPath(ticket.id)}/${pending.id}`).send({ followUpRequired: false, followUpNote: null, version: 1 })).status).toBe(200);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(2);
    expect((await prisma.actionTaken.findUniqueOrThrow({ where: { id: pending.id } })).version).toBe(2);
    expect((await staff.patch(statusPath(ticket.id)).send({ status: "CLOSED", version: 2 })).status).toBe(200);
    expect((await staff.post(actionPath(ticket.id)).send(fields)).body.error.code).toBe("ACTION_STATE_CONFLICT");
    expect((await staff.patch(`${actionPath(ticket.id)}/${action.id}`).send({ result: "No", version: 1 })).body.error.code).toBe("ACTION_STATE_CONFLICT");
  });
  it("returns current Ticket version in Detail/Queue and keeps requester indication and ownership unchanged", async () => {
    const ticket = await makeTicket();
    const indicated = await requester.post(`/api/tickets/${ticket.id}/resolved`);
    expect(indicated.body.data).toMatchObject({ resolved: true, currentStatus: "IN_PROGRESS" });
    expect((await outsider.post(`/api/tickets/${ticket.id}/resolved`)).status).toBe(404);
    expect((await requester.get(`/api/tickets/${ticket.id}`)).body).toMatchObject({ id: ticket.id, version: 1, currentStatus: "IN_PROGRESS" });
    expect((await staff.get(`/api/staff/tickets/${ticket.id}`)).body.data.ticket.version).toBe(1);
    const queue = await staff.get("/api/staff/tickets").query({ search: ticket.ticketNumber });
    expect(queue.body.data.items[0].version).toBe(1);
    const inactive = await staff.post(`/api/staff/tickets/${ticket.id}/assignment`).send({ ownerId: inactiveId });
    expect(inactive.status).toBe(404); expect(inactive.body.error.code).toBe("USER_NOT_FOUND");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ ownerId: staffId, version: 1, currentStatus: "IN_PROGRESS" });
  });
  it("makes concurrent status writes with the same Ticket version have exactly one winner", async () => {
    const ticket = await makeTicket("OPEN");
    const responses = await Promise.all(["IN_PROGRESS", "CANCELLED"].map((status) => staff.patch(statusPath(ticket.id)).send({ status, version: 1 })));
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(responses.find((r) => r.status === 409)!.body.error).toMatchObject({ code: "STALE_UPDATE", fields: { expectedVersion: 1, actualVersion: 2 } });
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version).toBe(2);
  });

  // Hold the first real parent lock; wait until PostgreSQL reports the second
  // HTTP transaction blocked on it. This proves overlap, not sequential calls.
  async function orderedRace(id: number, first: () => PromiseLike<request.Response>, second: () => PromiseLike<request.Response>) {
    let entered!: () => void, release!: () => void;
    const locked = new Promise<void>((resolve) => { entered = resolve; });
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const original = mutation.lockTicketMutation;
    let firstLock = true;
    let firstPid = 0;
    const spy = vi.spyOn(mutation, "lockTicketMutation").mockImplementation(async (tx, ticketId) => {
      await original(tx, ticketId);
      if (ticketId === id && firstLock) {
        firstLock = false;
        firstPid = (await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`)[0].pid;
        entered(); await hold;
      }
    });
    let secondRequest: Promise<request.Response> | undefined;
    const firstRequest = Promise.resolve(first());
    try {
      await locked;
      secondRequest = Promise.resolve(second());
      const deadline = Date.now() + 2500;
      let waiting = false;
      while (!waiting && Date.now() < deadline) {
        const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND ${firstPid} = ANY(pg_blocking_pids(pid)) AND query LIKE '%FOR UPDATE%' AND query LIKE '%Ticket%') AS waiting`;
        waiting = rows[0].waiting;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waiting, "second writer must block on the shared parent lock").toBe(true);
    } finally { release(); }
    try { return await Promise.all([firstRequest, secondRequest!]); }
    finally { spy.mockRestore(); }
  }

  it("reads a just-created valid Action before evaluating RESOLVED", async () => {
    const ticket = await makeTicket("IN_PROGRESS", false);
    const [action, status] = await orderedRace(ticket.id,
      () => staff.post(actionPath(ticket.id)).send(fields),
      () => staff.patch(statusPath(ticket.id)).send({ status: "RESOLVED", version: 1 }));
    expect(action.status).toBe(201); expect(status.status).toBe(200);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "RESOLVED", version: 2 });
  });
  it("reads newly added follow-up before CLOSED and preserves status/version when gate fails", async () => {
    const ticket = await makeTicket("RESOLVED");
    const [action, status] = await orderedRace(ticket.id,
      () => staff.post(actionPath(ticket.id)).send({ ...fields, followUpRequired: true, followUpNote: "Outstanding" }),
      () => staff.patch(statusPath(ticket.id)).send({ status: "CLOSED", version: 1 }));
    expect(action.status).toBe(201); expect(status.body.error.code).toBe("RESOLUTION_GATE_FAILED");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "RESOLVED", version: 1 });
  });
  it.each(["CLOSED", "CANCELLED"] as const)("rejects a waiting Action create after %s commits", async (status) => {
    const ticket = await makeTicket(status === "CLOSED" ? "RESOLVED" : "OPEN");
    const [changed, action] = await orderedRace(ticket.id,
      () => staff.patch(statusPath(ticket.id)).send({ status, version: 1 }),
      () => staff.post(actionPath(ticket.id)).send(fields));
    expect(changed.status).toBe(200); expect(action.body.error.code).toBe("ACTION_STATE_CONFLICT");
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
  });
  it("rejects waiting Action PATCH after closure without changing fields or Action version", async () => {
    const ticket = await makeTicket("RESOLVED");
    const before = await prisma.actionTaken.findFirstOrThrow({ where: { ticketId: ticket.id } });
    const [changed, action] = await orderedRace(ticket.id,
      () => staff.patch(statusPath(ticket.id)).send({ status: "CLOSED", version: 1 }),
      () => staff.patch(`${actionPath(ticket.id)}/${before.id}`).send({ version: 1, followUpRequired: true, followUpNote: "Late follow-up" }));
    expect(changed.status).toBe(200); expect(action.body.error.code).toBe("ACTION_STATE_CONFLICT");
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
  });
  it("sees a committed follow-up PATCH before attempting closure", async () => {
    const ticket = await makeTicket("RESOLVED");
    const action = await prisma.actionTaken.findFirstOrThrow({ where: { ticketId: ticket.id } });
    const [patched, changed] = await orderedRace(ticket.id,
      () => staff.patch(`${actionPath(ticket.id)}/${action.id}`).send({ version: 1, followUpRequired: true, followUpNote: "Check again" }),
      () => staff.patch(statusPath(ticket.id)).send({ status: "CLOSED", version: 1 }));
    expect(patched.status).toBe(200); expect(changed.body.error.code).toBe("RESOLUTION_GATE_FAILED");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "RESOLVED", version: 1 });
  });
  it("allows closure after a concurrent follow-up clearance commits first", async () => {
    const ticket = await makeTicket("RESOLVED");
    const action = await prisma.actionTaken.findFirstOrThrow({ where: { ticketId: ticket.id } });
    await prisma.actionTaken.update({ where: { id: action.id }, data: { followUpRequired: true, followUpNote: "Pending" } });
    const [patched, changed] = await orderedRace(ticket.id,
      () => staff.patch(`${actionPath(ticket.id)}/${action.id}`).send({ version: 1, followUpRequired: false, followUpNote: null }),
      () => staff.patch(statusPath(ticket.id)).send({ status: "CLOSED", version: 1 }));
    expect(patched.status).toBe(200); expect(changed.status).toBe(200);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).toMatchObject({ currentStatus: "CLOSED", version: 2 });
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } })).toMatchObject({ followUpRequired: false, followUpNote: null, version: 2 });
  });
});
