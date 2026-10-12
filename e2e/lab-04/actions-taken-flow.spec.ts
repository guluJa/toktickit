import { test, expect, staffDetail, signIn, create, actionFields, API_URL, E2E_PASSWORD, loginPage, captureViews, focusCheck, guard } from "./support.js";
import type { APIResponse } from "@playwright/test";

test("E2E-01: real create/edit, validation, saving guard, stale conflict and Requester/Admin authorization", async ({ page, request, f }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await staffDetail(page, f);
  await page.getByRole("button", { name: "Create Action", exact: true }).click();
  await expect(page.getByLabel("Action description")).toHaveAttribute("aria-invalid", "true");
  const id = await page.getByLabel("Action description").getAttribute("aria-describedby"); await expect(page.locator(`#${id}`)).toHaveText("Enter an Action description.");
  await page.getByLabel("Action description").fill(actionFields.description); await page.getByLabel("Result", { exact: true }).fill(actionFields.result);
  await page.getByLabel("Follow-up required").check(); await page.getByRole("button", { name: "Create Action", exact: true }).click();
  await expect(page.getByLabel("Follow-up note")).toHaveAttribute("aria-invalid", "true");
  await focusCheck(page, "Action description", "Result"); await captureViews(page, "actions-taken", "create-validation");
  await page.getByLabel("Follow-up note").fill("Verify next morning");
  let posts = 0; await page.route(`**/api/staff/tickets/${f.primary.id}/actions`, async route => { if (route.request().method() === "POST") { posts++; const r = await route.fetch(); await new Promise(resolve => setTimeout(resolve, 300)); await route.fulfill({ response: r }); } else await route.continue(); });
  await page.getByRole("button", { name: "Create Action", exact: true }).dblclick(); await expect(page.getByText("Action created successfully.")).toBeVisible(); expect(posts).toBe(1);
  const a = await f.prisma.actionTaken.findFirstOrThrow({ where: { ticketId: f.primary.id } }); expect(a.performedById).toBe(f.staff.id);
  await page.getByRole("button", { name: `Edit Action #${a.id}`, exact: true }).click(); await page.getByLabel("Result", { exact: true }).fill("Preserved edit");
  await signIn(request, f.admin.email); const edit = await request.patch(`${API_URL}/api/staff/tickets/${f.primary.id}/actions/${a.id}`, { data: { ...actionFields, result: "Administrator edit", version: a.version } }); expect(edit.status()).toBe(200);
  expect((await edit.json()).data.action.performedBy.id).toBe(f.staff.id);
  await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(page.getByRole("button", { name: "Use latest version" })).toBeVisible(); await expect(page.getByLabel("Result", { exact: true })).toHaveValue("Preserved edit");
  await page.getByRole("button", { name: "Use latest version" }).click(); await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(page.getByText("Action updated successfully.")).toBeVisible();
  await captureViews(page, "actions-taken", "edit");
  const adminAction = await create(request, f.primary.id); expect(adminAction.performedBy.id).toBe(f.admin.id); expect((await request.delete(`${API_URL}/api/staff/tickets/${f.primary.id}/actions/${a.id}`)).status()).toBe(405);
  await signIn(request, f.other.email); expect((await request.get(`${API_URL}/api/tickets/${f.primary.id}/actions`)).status()).toBe(404);
  await signIn(request, f.requester.email); expect((await request.post(`${API_URL}/api/staff/tickets/${f.primary.id}/actions`, { data: actionFields })).status()).toBe(403);
  await page.getByRole("button", { name: "Logout" }).click(); await loginPage(page, f.requester.email, E2E_PASSWORD); await page.getByRole("button", { name: "My Tickets", exact: true }).click(); await page.getByRole("button", { name: "View", exact: true }).first().click();
  await expect(page.getByText("Actions Taken are read-only for Requesters.")).toBeVisible(); await expect(page.getByLabel("Action description")).toHaveCount(0); expect(errors).toEqual([]);
});

test("E2E-01/AC-16: lost POST response, identical old Action, late commit on later page, failed reconciliation and preserved draft", async ({ page, request, f }) => {
  await staffDetail(page, f); await signIn(request, f.staff.email);
  await create(request, f.primary.id);
  // Direct fixture insertion is confined to this test's Ticket in the guarded E2E database.
  guard(); await f.prisma.actionTaken.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ ticketId: f.primary.id, performedById: f.staff.id, ...actionFields, description: `Earlier Action ${i}`, actionAt: new Date(Date.now() - 1000) })) });
  await page.getByLabel("Action description").fill(actionFields.description); await page.getByLabel("Result", { exact: true }).fill(actionFields.result);
  let posts = 0, lateId = 0, lockPid = 0;
  let release!: () => void, locked!: () => void;
  const releaseGate = new Promise<void>(resolve => { release = resolve; });
  const lockReady = new Promise<void>(resolve => { locked = resolve; });
  guard();
  const hold = f.prisma.$transaction(async tx => {
    lockPid = (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0].pid;
    await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${f.primary.id} FOR UPDATE`;
    locked(); await releaseGate;
  }, { timeout: 30_000 });
  await lockReady;
  let pending!: Promise<APIResponse>;
  await page.route(`**/api/staff/tickets/${f.primary.id}/actions`, async route => {
    if (route.request().method() !== "POST") return route.continue(); posts++;
    // Relay the actual original request. Hold its database write until after
    // the browser loses the response; do not replay POST as another request.
    pending = route.fetch();
    await expect.poll(async () => (await f.prisma.$queryRaw<{ waiting: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE ${lockPid} = ANY(pg_blocking_pids(pid))) AS waiting
    `)[0].waiting).toBe(true);
    await route.abort("failed");
  });
  try {
  await page.getByRole("button", { name: "Create Action", exact: true }).click(); await expect(page.getByRole("button", { name: "Refresh all Actions" })).toBeVisible();
  await expect(page.getByLabel("Action description")).toHaveValue(actionFields.description); await expect(page.getByText("Action created successfully.")).toHaveCount(0);
  expect(await f.prisma.actionTaken.count({ where: { ticketId: f.primary.id } })).toBe(101);
  release(); await hold; const response = await pending; expect(response.status()).toBe(201); lateId = (await response.json()).data.action.id;
  let pages: string[] = [];
  page.on("request", r => { if (r.method() === "GET" && r.url().includes(`/tickets/${f.primary.id}/actions`)) pages.push(new URL(r.url()).searchParams.get("page")!); });
  await page.getByRole("button", { name: "Refresh all Actions" }).click(); await expect(page.getByRole("button", { name: `Edit Action #${lateId}`, exact: true })).toBeDisabled(); expect(pages).toContain("2");
  await expect(page.getByText(/Submission still uncertain/)).toBeVisible(); expect(posts).toBe(1); await expect(page.getByText("Action created successfully.")).toHaveCount(0);
  await page.route(`**/api/staff/tickets/${f.primary.id}/actions?**`, route => route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR" } } }));
  await page.getByRole("button", { name: "Refresh all Actions" }).click(); await expect(page.getByRole("button", { name: "Retry loading Actions" })).toBeVisible(); await expect(page.getByLabel("Result", { exact: true })).toHaveValue(actionFields.result); expect(posts).toBe(1);
  await page.unroute(`**/api/staff/tickets/${f.primary.id}/actions?**`); await page.getByRole("button", { name: "Retry loading Actions" }).click();
  page.once("dialog", dialog => { expect(dialog.message()).toContain("duplicate"); void dialog.dismiss(); }); await page.getByRole("button", { name: "Send a new Action (duplicate risk)" }).click(); expect(posts).toBe(1);
  } finally { release(); await hold; await pending?.catch(() => undefined); }
});

test("E2E-01: client 30-second timeout after real server commit remains uncertain without automatic retry", async ({ page, f }) => {
  await staffDetail(page, f);
  await page.clock.install();
  let release!: () => void, committed!: () => void, posts = 0;
  const responseGate = new Promise<void>(resolve => { release = resolve; });
  const serverCommit = new Promise<void>(resolve => { committed = resolve; });
  await page.route(`**/api/staff/tickets/${f.primary.id}/actions`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    posts++; const response = await route.fetch(); expect(response.status()).toBe(201); committed();
    await responseGate;
    // The client has already aborted. Delivering the late response may be rejected.
    try { await route.fulfill({ response }); } catch { /* deliberate timeout fault */ }
  });
  await page.getByLabel("Action description").fill(actionFields.description);
  await page.getByLabel("Result", { exact: true }).fill(actionFields.result);
  await page.getByRole("button", { name: "Create Action", exact: true }).click(); await serverCommit;
  await page.clock.fastForward(30_001);
  await expect(page.getByRole("button", { name: "Refresh all Actions" })).toBeVisible(); release();
  await page.getByRole("button", { name: "Refresh all Actions" }).click();
  await expect(page.getByText(/Submission still uncertain/)).toBeVisible();
  await expect(page.getByText("Action created successfully.")).toHaveCount(0);
  await expect(page.getByLabel("Result", { exact: true })).toHaveValue(actionFields.result);
  expect(posts).toBe(1); expect(await f.prisma.actionTaken.count({ where: { ticketId: f.primary.id } })).toBe(1);
});
