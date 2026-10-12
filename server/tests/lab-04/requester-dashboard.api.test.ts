import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app.js";
import { asOf, dashboardFixtures } from "./dashboard-fixtures.js";

describe("API-05/09 Requester Dashboard", () => {
  let f: Awaited<ReturnType<typeof dashboardFixtures>>;
  beforeAll(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(asOf); f = await dashboardFixtures(); });
  afterAll(async () => { vi.useRealTimers(); vi.restoreAllMocks(); await f?.cleanup(); });
  it("counts authoritative owned rows independently from limit and honours half-open Bangkok boundaries", async () => {
    const r = await f.requester.agent.get("/api/requester/dashboard?limit=5");
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(d.timezone).toBe("Asia/Bangkok"); expect(d.asOf).toBe(asOf.toISOString());
    expect(d.metrics).toEqual({ openCount: 6, waitingForRequesterCount: 1, resolvedCount: 5, recentlyUpdatedCount: 9, recentlyResolvedCount: 3 });
    expect(d.recentTickets).toHaveLength(5);
    expect(d.recentlyResolvedTickets.map((t: { id: number }) => t.id)).toContain(f.lower.id);
    expect(d.recentlyResolvedTickets.map((t: { id: number }) => t.id)).not.toContain(f.before.id);
    expect(d.recentlyResolvedTickets.map((t: { id: number }) => t.id)).not.toContain(f.upper.id);
    expect(d.recentTickets.every((t: { id: number }) => t.id !== f.foreign.id)).toBe(true);
    expect(d.recentTickets.map((t: { id: number }) => t.id)).toEqual([...f.rows].reverse().slice(0, 5).map(t => t.id));
    expect(d.recentTickets[0].detailLink).toEqual({ rel: "ticketDetail", target: "requester-ticket-detail", ticketId: f.rows[7].id });
    expect(d.recentTickets[0]).not.toHaveProperty("owner");
  });
  it("returns real zero metrics and empty lists for a Requester without Tickets", async () => {
    const { body, status } = await f.empty.agent.get("/api/requester/dashboard");
    expect(status).toBe(200); expect(Object.values(body.data.metrics)).toEqual([0, 0, 0, 0, 0]);
    expect(body.data.recentTickets).toEqual([]); expect(body.data.recentlyResolvedTickets).toEqual([]);
  });
  it("defaults to 20, accepts 1/100 and counts rows beyond the embedded list", async () => {
    for (let i = 0; i < 25; i++) await f.ticket("OPEN", new Date(asOf.getTime() - 1000));
    const normal = await f.requester.agent.get("/api/requester/dashboard");
    const small = await f.requester.agent.get("/api/requester/dashboard?limit=1");
    const maximum = await f.requester.agent.get("/api/requester/dashboard?limit=100");
    expect(normal.status).toBe(200); expect(normal.body.data.recentTickets).toHaveLength(20);
    expect(small.body.data.recentTickets).toHaveLength(1); expect(maximum.body.data.recentTickets).toHaveLength(34);
    expect(normal.body.data.metrics.recentlyUpdatedCount).toBe(34);
    expect(small.body.data.metrics).toEqual(maximum.body.data.metrics);
  });
  it("drills down with the original unwrapped My Tickets API and preserves ownership", async () => {
    const { body } = await f.requester.agent.get("/api/requester/dashboard?limit=5");
    const link = body.data.links.find((l: { query: { currentStatus?: string }; rel: string }) => l.rel === "recentlyResolved" && l.query.currentStatus === "CLOSED");
    expect(link.query).toEqual({ currentStatus: "CLOSED", sortBy: "updatedAt", sortDirection: "desc", page: 1, pageSize: 10 });
    const list = await f.requester.agent.get("/api/tickets").query(link.query);
    expect(list.status).toBe(200); expect(list.body).not.toHaveProperty("data");
    expect(list.body.items.every((t: { currentStatus: string }) => t.currentStatus === "CLOSED")).toBe(true);
    expect((await f.requester.agent.get(`/api/tickets/${f.foreign.id}`)).status).toBe(404);
  });
  it.each(["0", "101", "-1", "1.5", "abc", "", "2147483648"])("rejects invalid limit %s", async limit => {
    const r = await f.requester.agent.get("/api/requester/dashboard").query({ limit });
    expect(r.status).toBe(400); expect(r.body.error.code).toBe("VALIDATION_ERROR");
  });
  it("enforces session, password gate, roles and rejects identity/date injection", async () => {
    expect((await request(app).get("/api/requester/dashboard").set("x-requester-id", String(f.requester.id))).status).toBe(401);
    expect((await request(app).get("/api/requester/dashboard").set("Cookie", "toktickit_session=invalid")).body.error.code).toBe("SESSION_INVALID");
    expect((await f.staff.agent.get("/api/requester/dashboard")).status).toBe(403);
    expect((await f.admin.agent.get("/api/requester/dashboard")).status).toBe(403);
    expect((await f.changing.agent.get("/api/requester/dashboard")).body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    for (const query of [{ requesterId: f.other.id }, { start: asOf.toISOString() }, { limit: ["1", "2"] }]) expect((await f.requester.agent.get("/api/requester/dashboard").query(query)).status).toBe(400);
  });
  it("returns safe errors when a Dashboard query fails", async () => {
    const spy = vi.spyOn(f.prisma, "$transaction").mockRejectedValueOnce(new Error("private SQL DATABASE_URL password"));
    try { const r = await f.requester.agent.get("/api/requester/dashboard"); expect(r.status).toBe(500); expect(r.body.error.code).toBe("INTERNAL_ERROR"); expect(JSON.stringify(r.body)).not.toMatch(/private|SQL|password|DATABASE_URL/); } finally { spy.mockRestore(); }
  });
});
