import { performance } from "node:perf_hooks";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { dashboardFixtures } from "./dashboard-fixtures.js";

describe("PERF-01 bounded Dashboard response on seeded data", () => {
  let f: Awaited<ReturnType<typeof dashboardFixtures>>;
  beforeAll(async () => { f = await dashboardFixtures(); });
  afterAll(async () => { await f?.cleanup(); });
  it("keeps all embedded lists bounded while counts use the full database", async () => {
    for (const [agent, route] of [[f.requester.agent, "/api/requester/dashboard"], [f.staff.agent, "/api/staff/dashboard"]] as const) {
      const before = performance.now(); const r = await agent.get(route).query({ limit: 5 });
      expect(r.status).toBe(200); expect(performance.now() - before).toBeLessThan(2000);
      for (const key of ["recentTickets", "recentlyResolvedTickets", "recentActions"]) if (key in r.body.data) expect(r.body.data[key].length).toBeLessThanOrEqual(5);
      expect(JSON.stringify(r.body).length).toBeLessThan(100000);
    }
  });
});
