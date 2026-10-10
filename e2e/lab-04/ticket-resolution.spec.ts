import { test, expect, staffDetail, signIn, API_URL, create, actionFields, transition, captureViews } from "./support.js";

test("E2E-02: gate, assignment, follow-up completion, close/reopen/cancel and advisory indication", async ({ page, request, f }) => {
  await staffDetail(page, f); await signIn(request, f.staff.email);
  page.on("dialog", dialog => void dialog.accept());
  await page.getByLabel("Status", { exact: true }).selectOption("RESOLVED"); await page.getByRole("button", { name: "Change Status", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refresh latest Ticket" })).toBeVisible();
  expect((await f.prisma.ticket.findUniqueOrThrow({ where: { id: f.primary.id } })).currentStatus).toBe("IN_PROGRESS");
  await page.getByLabel("Action description").fill("Resolution investigation"); await page.getByLabel("Result", { exact: true }).fill("Recovered service"); await page.getByLabel("Follow-up required").check(); await page.getByLabel("Follow-up note").fill("Confirm tomorrow");
  await page.getByRole("button", { name: "Create Action", exact: true }).click(); await expect(page.getByText("Action created successfully.")).toBeVisible();
  await page.getByRole("button", { name: "Refresh latest Ticket" }).click(); await page.getByLabel("Status", { exact: true }).selectOption("RESOLVED"); await page.getByRole("button", { name: "Change Status", exact: true }).click();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue("RESOLVED");
  await page.getByLabel("Status", { exact: true }).selectOption("CLOSED"); await page.getByRole("button", { name: "Change Status", exact: true }).click(); await expect(page.getByRole("button", { name: "Refresh latest Ticket" })).toBeVisible();
  const a = await f.prisma.actionTaken.findFirstOrThrow({ where: { ticketId: f.primary.id } });
  await page.getByRole("button", { name: `Edit Action #${a.id}`, exact: true }).click(); await page.getByLabel("Follow-up required").uncheck(); await page.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(page.getByText("Action updated successfully.")).toBeVisible();
  await page.getByRole("button", { name: "Refresh latest Ticket" }).click(); await page.getByLabel("Status", { exact: true }).selectOption("CLOSED"); await page.getByRole("button", { name: "Change Status", exact: true }).click();
  await expect(page.getByText("Actions Taken cannot be changed on a closed or cancelled Ticket.")).toBeVisible(); expect((await request.post(`${API_URL}/api/staff/tickets/${f.primary.id}/actions`, { data: actionFields })).status()).toBe(409);
  await page.getByLabel("Status", { exact: true }).selectOption("REOPENED"); await page.getByRole("button", { name: "Change Status", exact: true }).click(); await expect(page.getByLabel("Reopen reason")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Reopen reason").focus(); await captureViews(page, "actions-taken", "workflow-reopen");
  await page.getByLabel("Reopen reason").fill("Same incident returned"); await page.getByRole("button", { name: "Change Status", exact: true }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("IN_PROGRESS"); await page.getByRole("button", { name: "Change Status", exact: true }).click(); await expect(page.getByLabel("Status", { exact: true })).toHaveValue("IN_PROGRESS");
  await page.getByLabel("Owner ID for assignment").fill(String(f.inactive.id)); await page.getByRole("button", { name: "Assign/Reassign", exact: true }).click(); await expect(page.getByRole("alert").first()).toContainText("User not found");
  const rejection = await request.post(`${API_URL}/api/staff/tickets/${f.primary.id}/assignment`, { data: { ownerId: f.inactive.id } }); expect(rejection.status()).toBe(404); expect((await rejection.json()).error.code).toBe("USER_NOT_FOUND");
  await page.getByLabel("Owner ID for assignment").fill(String(f.admin.id)); await page.getByRole("button", { name: "Assign/Reassign", exact: true }).click(); await expect(page.getByLabel("Owner", { exact: true })).toHaveValue(new RegExp(String(f.admin.id)));
  await signIn(request, f.requester.email); const indicated = await request.post(`${API_URL}/api/tickets/${f.primary.id}/resolved`); expect(indicated.status()).toBe(200); expect((await indicated.json()).data.currentStatus).toBe("IN_PROGRESS");
  await signIn(request, f.admin.email); expect((await transition(request, f.primary.id, "CANCELLED")).status()).toBe(403);
  await signIn(request, f.staff.email); expect((await transition(request, f.primary.id, "CANCELLED")).status()).toBe(200); expect((await transition(request, f.primary.id, "OPEN")).status()).toBe(409);
});

test("E2E-02: concurrent Action versions and stale Ticket UI preserve newer changes and draft", async ({ page, request, f }) => {
  await staffDetail(page, f); await signIn(request, f.staff.email); const a = await create(request, f.primary.id);
  const [one, two] = await Promise.all(["First", "Second"].map(result => request.patch(`${API_URL}/api/staff/tickets/${f.primary.id}/actions/${a.id}`, { data: { ...actionFields, result, version: a.version } })));
  expect([one.status(), two.status()].sort()).toEqual([200, 409]); expect((await f.prisma.actionTaken.findUniqueOrThrow({ where: { id: a.id } })).version).toBe(2);
  await page.getByLabel("Action description").fill("Preserve workflow draft");
  expect((await transition(request, f.primary.id, "WAITING_FOR_REQUESTER")).status()).toBe(200);
  page.on("dialog", dialog => void dialog.accept()); await page.getByLabel("Status", { exact: true }).selectOption("RESOLVED"); await page.getByRole("button", { name: "Change Status", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refresh latest Ticket" })).toBeVisible(); await expect(page.getByLabel("Action description")).toHaveValue("Preserve workflow draft");
  await page.getByRole("button", { name: "Refresh latest Ticket" }).click(); await expect(page.getByLabel("Action description")).toHaveValue("Preserve workflow draft");
  await page.getByLabel("Status", { exact: true }).selectOption("RESOLVED"); await page.getByRole("button", { name: "Change Status", exact: true }).click(); await expect(page.getByLabel("Status", { exact: true })).toHaveValue("RESOLVED");
});
