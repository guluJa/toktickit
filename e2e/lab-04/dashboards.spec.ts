import { test, expect, signIn, API_URL, E2E_PASSWORD, loginPage, captureViews, create, screenshot } from "./support.js";
import fs from "node:fs/promises";
import path from "node:path";
import { REPOSITORY_ROOT } from "../lab-02/support.js";

test("E2E-03: selected metrics agree with PostgreSQL/API/UI, ordered limited lists, links and responsive layouts", async ({ page, request, f }) => {
  const errors: string[] = [], failed: string[] = []; page.on("pageerror", e => errors.push(e.message)); page.on("response", r => { const p = new URL(r.url()).pathname; if (p.startsWith("/api/") && r.status() >= 400 && !(p === "/api/auth/me" && r.status() === 401)) failed.push(`${r.status()} ${p}`); });
  await f.ticket("RESOLVED"); await f.ticket("CLOSED"); await f.ticket("WAITING_FOR_REQUESTER"); await f.ticket("WAITING_FOR_REQUESTER", f.other.id);
  await signIn(request, f.staff.email); await create(request, f.primary.id); await signIn(request, f.admin.email); await create(request, f.primary.id);
  const snapshot: Record<string, unknown> = {};
  for (const [role, user, route] of [["requester", f.requester, "requester"], ["staff", f.staff, "staff"], ["admin", f.admin, "staff"]] as const) {
    await signIn(request, user.email); const r = await request.get(`${API_URL}/api/${route}/dashboard?limit=5`); expect(r.status()).toBe(200); const d = (await r.json()).data;
    const at = new Date(d.asOf), window = { gte: new Date(at.getTime() - 7 * 86400000), lt: at }; const base = role === "requester" ? { requesterId: user.id } : {};
    const counts = { recentlyUpdatedCount: await f.prisma.ticket.count({ where: { ...base, updatedAt: window } }), recentlyResolvedCount: await f.prisma.ticket.count({ where: { ...base, currentStatus: { in: ["RESOLVED", "CLOSED"] }, updatedAt: window } }) };
    expect(d.metrics).toMatchObject(counts); expect(d.recentTickets.length).toBeLessThanOrEqual(5);
    const expected = await f.prisma.ticket.findMany({ where: { ...base, updatedAt: window }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true } }); expect(d.recentTickets.map((t: { id: number }) => t.id)).toEqual(expected.map(t => t.id));
    const resolved = await f.prisma.ticket.findMany({ where: { ...base, updatedAt: window, currentStatus: { in: ["RESOLVED", "CLOSED"] } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 5, select: { id: true } });
    expect(d.recentlyResolvedTickets.map((t: { id: number }) => t.id)).toEqual(resolved.map(t => t.id));
    const ownActions = role === "requester" ? [] : await f.prisma.actionTaken.findMany({ where: { performedById: user.id, actionAt: window }, orderBy: [{ actionAt: "desc" }, { id: "desc" }], take: 5, select: { id: true } });
    if (role !== "requester") expect(d.recentActions.map((a: { id: number }) => a.id)).toEqual(ownActions.map(a => a.id));
    snapshot[role] = { asOf: d.asOf, expected: counts, actual: d.metrics, ids: expected.map(t => t.id), resolvedIds: resolved.map(t => t.id), currentUserActionIds: ownActions.map(a => a.id) };
    await page.goto("/");
    await page.getByRole("button", { name: "Logout" }).or(page.getByRole("heading", { name: "Sign in", exact: true })).first().waitFor();
    if (await page.getByRole("button", { name: "Logout" }).isVisible()) await page.getByRole("button", { name: "Logout" }).click();
    await loginPage(page, user.email, E2E_PASSWORD);
    await page.getByRole("button", { name: role === "requester" ? "Requester Dashboard" : "Staff Dashboard", exact: true }).click();
    await expect(page.getByRole("region", { name: "Recently Updated", exact: true }).getByText(String(counts.recentlyUpdatedCount), { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Recently Resolved", exact: true }).getByText(String(counts.recentlyResolvedCount), { exact: true })).toBeVisible();
    if (role !== "requester") {
      const actions = page.getByRole("region", { name: "My Recent Actions", exact: true });
      await expect(actions.getByRole("listitem")).toHaveCount(ownActions.length); await expect(actions).toContainText(`Performed by ${user.name}`);
    }
    if (role !== "admin") await captureViews(page, `${role}-dashboard`, "populated");
    const destination = page.waitForRequest(r => r.method() === "GET" && r.url().includes(role === "requester" ? "/api/tickets?" : "/api/staff/tickets?"));
    await page.getByRole("button", { name: "View Recently Resolved: CLOSED", exact: true }).click(); const q = new URL((await destination).url()).searchParams;
    expect(q.get(role === "requester" ? "currentStatus" : "status")).toBe("CLOSED"); expect(q.get("pageSize")).toBe("10"); await expect(page.getByRole("heading", { name: role === "requester" ? "My Tickets" : "Staff Ticket Queue", exact: true })).toBeVisible();
    // The mobile Requester menu intentionally collapses after drill-down.
    if (role === "requester" && !await page.getByRole("button", { name: "Requester Dashboard", exact: true }).isVisible()) await page.getByRole("button", { name: "Show workspace navigation", exact: true }).click();
    await page.getByRole("button", { name: role === "requester" ? "Requester Dashboard" : "Staff Dashboard", exact: true }).click();
    await page.getByRole("region", { name: "Recently Updated Tickets", exact: true }).getByRole("button").first().click();
    await expect(page.getByRole("heading", { name: d.recentTickets[0].ticketNumber, exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]); expect(failed).toEqual([]);
  await fs.writeFile(path.join(REPOSITORY_ROOT, "artifacts/lab-04/verification/dashboard-metrics.json"), JSON.stringify({ baseline: "51bcf9c", scope: "feature branch working tree; not Final-main", results: snapshot }, null, 2) + "\n");
});

test("E2E-03: Staff Dashboard browser feedback states with controlled empty response and keyboard recovery", async ({ page, request, f }) => {
  await signIn(request, f.staff.email);
  const original = (await (await request.get(`${API_URL}/api/staff/dashboard`)).json()).data;
  const zeros = (record: Record<string, number>) => Object.fromEntries(Object.keys(record).map(key => [key, 0]));
  const empty = { ...original, metrics: zeros(original.metrics), byStatus: zeros(original.byStatus), byPriority: zeros(original.byPriority), recentTickets: [], recentlyResolvedTickets: [], recentActions: [] };
  await loginPage(page, f.staff.email, E2E_PASSWORD);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/staff/dashboard?**", async route => { await gate; await route.fulfill({ json: { data: empty } }); });
  await page.getByRole("button", { name: "Staff Dashboard", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Loading dashboard"); release();
  await expect(page.getByText("No Tickets match these dashboard metrics.")).toBeVisible();
  await captureViews(page, "staff-dashboard", "empty-fixture");
  await page.unroute("**/api/staff/dashboard?**");
  await page.route("**/api/staff/dashboard?**", route => route.fulfill({ status: 403, json: { error: { code: "ROLE_FORBIDDEN" } } }));
  await page.getByRole("button", { name: "Refresh Dashboard" }).click(); await expect(page.getByRole("alert")).toContainText("Access denied"); await screenshot(page, "staff-dashboard", "forbidden-mobile");
  await page.unroute("**/api/staff/dashboard?**");
  await page.route("**/api/staff/dashboard?**", route => route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR", message: "private query details" } } }));
  await page.getByRole("button", { name: "Refresh Dashboard" }).click(); await expect(page.getByRole("alert")).toContainText("Unable to load"); await expect(page.getByText("private query details")).toHaveCount(0); await screenshot(page, "staff-dashboard", "safe-failure-mobile");
  await page.unroute("**/api/staff/dashboard?**");
  await page.getByRole("button", { name: "Retry", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Recently Updated", exact: true })).toBeVisible();
});

test("E2E-03: zero, loading, forbidden and safe failure with keyboard retry", async ({ page, f }) => {
  await loginPage(page, f.other.email, E2E_PASSWORD);
  let release!: () => void, handled!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); const done = new Promise<void>(resolve => { handled = resolve; });
  await page.route("**/api/requester/dashboard?**", async route => { await gate; await route.continue(); handled(); });
  await page.getByRole("button", { name: "Requester Dashboard", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Loading dashboard"); release(); await done; await page.unroute("**/api/requester/dashboard?**");
  await expect(page.getByText("No Tickets match these dashboard metrics.")).toBeVisible(); await captureViews(page, "requester-dashboard", "empty");
  await page.route("**/api/requester/dashboard?**", route => route.fulfill({ status: 403, json: { error: { code: "ROLE_FORBIDDEN" } } })); await page.getByRole("button", { name: "Refresh Dashboard" }).click(); await expect(page.getByRole("alert")).toContainText("Access denied");
  await page.unroute("**/api/requester/dashboard?**"); await page.route("**/api/requester/dashboard?**", route => route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR", message: "private details" } } })); await page.getByRole("button", { name: "Refresh Dashboard" }).click(); await expect(page.getByRole("alert")).toContainText("Unable to load"); await expect(page.getByText("private details")).toHaveCount(0);
  await page.unroute("**/api/requester/dashboard?**"); await page.getByRole("button", { name: "Retry", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(page.getByText("No Tickets match these dashboard metrics.")).toBeVisible();
});
