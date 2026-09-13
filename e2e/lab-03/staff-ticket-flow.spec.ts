import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  API_URL,
  E2E_PASSWORD,
  assertNoHorizontalOverflow,
  getInitialPassword,
  lab3ScreenshotPath,
  loginApi,
  loginPage,
  prepareApiUser,
  removeE2EAttachments,
  removeE2ETicketsBySummary,
  resetInitialPassword,
} from "./support.js";

test.afterAll(async ({ request }) => {
  for (const email of ["requester3@toktickit.test", "staff1@toktickit.test", "staff2@toktickit.test"]) {
    await resetInitialPassword(request, email);
  }
});

test("IT Staff can search the Queue, open Detail, operate safely, and use responsive layouts", async ({ page, request }) => {
  const summary = `E2E staff workflow ${Date.now()}`;
  const requester = await prepareApiUser(request, "requester3@toktickit.test");
  const categories = (await (await request.get(`${API_URL}/api/categories`)).json()) as Array<{ id: number }>;
  const systems = (await (await request.get(`${API_URL}/api/related-systems`)).json()) as Array<{ id: number }>;
  const created = await request.post(`${API_URL}/api/tickets`, { data: { submissionKey: crypto.randomUUID(), categoryId: categories[0].id, relatedSystemId: systems[0].id, summary, requestedPriority: "MEDIUM", description: "Staff workflow E2E ticket." } });
  expect(created.status()).toBe(201);
  const ticket = (await created.json()).ticket as { id: number; ticketNumber: string };
  const filename = `e2e-staff-${Date.now()}.pdf`;
  const uploaded = await request.post(`${API_URL}/api/tickets/${ticket.id}/attachments`, { multipart: { file: { name: filename, mimeType: "application/pdf", buffer: Buffer.from("safe E2E attachment") } } });
  expect(uploaded.status()).toBe(201);

  const staff = await prepareApiUser(request, "staff1@toktickit.test");
  await loginPage(page, "staff1@toktickit.test", staff.password);
  await expect(page.getByRole("heading", { name: "Staff Ticket Queue" })).toBeVisible();
  await expect(page.getByLabel("Staff Ticket Queue controls")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("staff-queue", "desktop.png"), fullPage: true });

  await page.getByLabel("Search Tickets").fill(ticket.ticketNumber);
  await page.getByLabel("Status").selectOption("NEW");
  await page.getByLabel("Sort By").selectOption("ticketNumber");
  await page.getByLabel("Sort Direction").selectOption("asc");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(ticket.ticketNumber).first()).toBeVisible();
  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("staff-queue", "tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("staff-queue", "mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Open Ticket" }).click();
  await expect(page.getByRole("heading", { name: ticket.ticketNumber })).toBeVisible();
  await page.screenshot({ path: lab3ScreenshotPath("staff-ticket-detail", "mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("staff-ticket-detail", "tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("staff-ticket-detail", "desktop.png"), fullPage: true });

  await page.getByRole("button", { name: "Claim" }).click();
  await expect(page.getByRole("alert")).toContainText("Ticket updated successfully");
  await page.getByLabel("IT Priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Save IT Priority" }).click();
  await expect(page.getByRole("alert")).toContainText("Ticket updated successfully");
  await page.getByLabel("Status").selectOption("OPEN");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Change Status" }).click();
  await expect(page.getByRole("alert")).toContainText("Ticket updated successfully");
  await page.getByLabel("Add a public comment").fill("Staff public comment evidence.");
  await page.getByRole("button", { name: "Add Comment" }).click();
  await expect(page.getByRole("alert")).toContainText("Public Comment added successfully");
  await page.getByLabel("Add an internal note").fill("Private staff note evidence.");
  await page.getByRole("button", { name: "Add Note" }).click();
  await expect(page.getByRole("alert")).toContainText("Internal Note added successfully");
  const attachment = page.getByRole("listitem").filter({ hasText: filename });
  await expect(attachment).toContainText("ACTIVE");
  const download = page.waitForEvent("download");
  await attachment.getByRole("button", { name: "Download" }).click();
  const downloadEvent = await download;
  expect(downloadEvent.suggestedFilename()).toBe(filename);

  const admin = await loginApi(request, ADMIN_EMAIL);
  expect(admin.role).toBe("ADMINISTRATOR");
  const forbiddenStatus = await request.patch(`${API_URL}/api/staff/tickets/${ticket.id}/status`, { data: { status: "CLOSED" } });
  expect(forbiddenStatus.status()).toBe(403);
  expect((await forbiddenStatus.json()).error.code).toBe("ROLE_FORBIDDEN");
  await prepareApiUser(request, "requester3@toktickit.test");
  const requesterAccess = await request.get(`${API_URL}/api/staff/tickets/${ticket.id}`);
  expect(requesterAccess.status()).toBe(403);
  expect((await requesterAccess.json()).error.code).toBe("ROLE_FORBIDDEN");

  await removeE2EAttachments(ticket.id, filename);
  await removeE2ETicketsBySummary(requester.id, summary);
});

test("rejects malformed Queue queries with a safe error", async ({ request }) => {
  const staff = await prepareApiUser(request, "staff2@toktickit.test");
  expect(staff.role).toBe("IT_STAFF");
  const response = await request.get(`${API_URL}/api/staff/tickets?pageSize=7&sortBy=not-a-field`);
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.error.code).toBe("INVALID_QUERY");
  expect(JSON.stringify(body)).not.toMatch(/passwordHash|sql|stack|prisma|secret/i);
});
