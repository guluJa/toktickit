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

let staffTicketCleanup:
  | { requesterId: number; summary: string; ticketId?: number; attachmentName?: string }
  | undefined;
let extraTicketSummaries: string[] = [];

test.afterEach(async () => {
  if (!staffTicketCleanup) return;
  if (staffTicketCleanup.ticketId && staffTicketCleanup.attachmentName) {
    await removeE2EAttachments(
      staffTicketCleanup.ticketId,
      staffTicketCleanup.attachmentName,
    );
  }
  await removeE2ETicketsBySummary(
    staffTicketCleanup.requesterId,
    staffTicketCleanup.summary,
  );
  for (const extraSummary of extraTicketSummaries) {
    await removeE2ETicketsBySummary(staffTicketCleanup.requesterId, extraSummary);
  }
  extraTicketSummaries = [];
  staffTicketCleanup = undefined;
});

test.afterAll(async ({ request }) => {
  for (const email of ["requester3@toktickit.test", "staff1@toktickit.test", "staff2@toktickit.test"]) {
    await resetInitialPassword(request, email);
  }
});

test("IT Staff can search the Queue, open Detail, operate safely, and use responsive layouts", async ({ page, request }) => {
  const summary = `E2E staff workflow ${Date.now()}`;
  const requester = await prepareApiUser(request, "requester3@toktickit.test");
  staffTicketCleanup = { requesterId: requester.id, summary };
  let contrastingTicket: { id: number; ticketNumber: string } | undefined;
  const categories = (await (await request.get(`${API_URL}/api/categories`)).json()) as Array<{ id: number }>;
  const systems = (await (await request.get(`${API_URL}/api/related-systems`)).json()) as Array<{ id: number }>;
  const created = await request.post(`${API_URL}/api/tickets`, { data: { submissionKey: crypto.randomUUID(), categoryId: categories[0].id, relatedSystemId: systems[0].id, summary, requestedPriority: "MEDIUM", description: "Staff workflow E2E ticket." } });
  expect(created.status()).toBe(201);
  const ticket = (await created.json()).ticket as { id: number; ticketNumber: string };
  for (let index = 0; index < 11; index += 1) {
    const extraSummary = `${summary} page-${index + 1}`;
    extraTicketSummaries.push(extraSummary);
    const extra = await request.post(`${API_URL}/api/tickets`, { data: { submissionKey: crypto.randomUUID(), categoryId: categories[0].id, relatedSystemId: systems[0].id, summary: extraSummary, requestedPriority: index === 0 ? "HIGH" : index % 2 === 0 ? "MEDIUM" : "LOW", description: "Staff queue pagination E2E fixture." } });
    expect(extra.status()).toBe(201);
    if (index === 0) {
      const extraBody = (await extra.json()) as { ticket: { id: number; ticketNumber: string } };
      contrastingTicket = extraBody.ticket;
    }
  }
  await loginApi(request, "staff1@toktickit.test");
  const contrastStaff2 = await prepareApiUser(request, "staff2@toktickit.test");
  if (!contrastingTicket) throw new Error("Missing contrasting Staff Queue fixture.");
  const contrastStatus = await request.patch(`${API_URL}/api/staff/tickets/${contrastingTicket.id}/status`, { data: { status: "OPEN" } });
  expect(contrastStatus.status()).toBe(200);
  const contrastOwner = await request.post(`${API_URL}/api/staff/tickets/${contrastingTicket.id}/assignment`, { data: { ownerId: contrastStaff2.id } });
  expect(contrastOwner.status()).toBe(200);
  const pageOne = await request.get(`${API_URL}/api/staff/tickets?search=${encodeURIComponent(summary)}&page=1&pageSize=10&sortBy=ticketNumber&sortOrder=asc`);
  const pageTwo = await request.get(`${API_URL}/api/staff/tickets?search=${encodeURIComponent(summary)}&page=2&pageSize=10&sortBy=ticketNumber&sortOrder=asc`);
  expect(pageOne.status()).toBe(200); expect(pageTwo.status()).toBe(200);
  const pageOneBody = (await pageOne.json()) as {
    data: { items: Array<{ ticketNumber: string }>; pagination: { totalItems: number } };
  };
  const pageTwoBody = (await pageTwo.json()) as {
    data: { items: Array<{ ticketNumber: string }> };
  };
  expect(pageOneBody.data.pagination.totalItems).toBe(12);
  expect(pageOneBody.data.items).toHaveLength(10);
  expect(pageTwoBody.data.items).toHaveLength(2);
  const ascendingNumbers = [...pageOneBody.data.items, ...pageTwoBody.data.items].map((item) => item.ticketNumber);
  expect(ascendingNumbers).toEqual([...ascendingNumbers].sort((left, right) => left.localeCompare(right)));
  const descending = await request.get(`${API_URL}/api/staff/tickets?search=${encodeURIComponent(summary)}&page=1&pageSize=50&sortBy=ticketNumber&sortOrder=desc`);
  expect(descending.status()).toBe(200);
  const descendingItems = ((await descending.json()) as { data: { items: Array<{ ticketNumber: string }> } }).data.items;
  const descendingNumbers = descendingItems.map((item) => item.ticketNumber);
  expect(descendingNumbers).toEqual([...descendingNumbers].sort((left, right) => right.localeCompare(left)));
  const filterExpectations: Array<[string, (item: { currentStatus: string; requestedPriority: string; itPriority: string; owner: unknown }) => boolean]> = [
    ["status=NEW", (item) => item.currentStatus === "NEW"],
    ["requestedPriority=MEDIUM", (item) => item.requestedPriority === "MEDIUM"],
    ["itPriority=MEDIUM", (item) => item.itPriority === "MEDIUM"],
    ["ownerId=unassigned", (item) => item.owner === null],
  ];
  for (const [query, matches] of filterExpectations) {
    const filtered = await request.get(`${API_URL}/api/staff/tickets?search=${encodeURIComponent(summary)}&${query}`);
    expect(filtered.status(), query).toBe(200);
    const filteredItems = ((await filtered.json()) as { data: { items: Array<{ ticketNumber: string; currentStatus: string; requestedPriority: string; itPriority: string; owner: unknown }> } }).data.items;
    expect(filteredItems.length, query).toBeGreaterThan(0);
    expect(filteredItems.every(matches), query).toBe(true);
    expect(filteredItems.some((item) => item.ticketNumber === contrastingTicket?.ticketNumber), query).toBe(false);
  }
  const rejected = await request.patch(`${API_URL}/api/staff/tickets/${ticket.id}/status`, { data: { status: "CLOSED" } });
  expect(rejected.status()).toBe(409);
  expect((await rejected.json()).error.code).toBe("STATUS_TRANSITION_NOT_ALLOWED");
  await loginApi(request, "requester3@toktickit.test");
  const filename = `e2e-staff-${Date.now()}.pdf`;
  staffTicketCleanup.ticketId = ticket.id;
  staffTicketCleanup.attachmentName = filename;
  const uploaded = await request.post(`${API_URL}/api/tickets/${ticket.id}/attachments`, { multipart: { file: { name: filename, mimeType: "application/pdf", buffer: Buffer.from("safe E2E attachment") } } });
  expect(uploaded.status()).toBe(201);

  const staff = await prepareApiUser(request, "staff1@toktickit.test");
  await loginPage(page, "staff1@toktickit.test", staff.password);
  await expect(page.getByRole("heading", { name: "Staff Ticket Queue" })).toBeVisible();
  await expect(page.getByLabel("Staff Ticket Queue controls")).toBeVisible();
  const searchInput = page.getByLabel("Search Tickets");
  await searchInput.focus();
  await expect(searchInput).toBeFocused();
  await page.keyboard.press("Tab");
  const statusSelect = page.getByLabel("Status");
  await expect(statusSelect).toBeFocused();
  const focusStyle = await statusSelect.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  const hasVisibleOutline = focusStyle.outlineStyle !== "none" && focusStyle.outlineWidth !== "0px";
  const hasVisibleShadow = focusStyle.boxShadow !== "none";
  expect(hasVisibleOutline || hasVisibleShadow).toBe(true);
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

  const staff2 = await prepareApiUser(request, "staff2@toktickit.test");
  const reassigned = await request.post(`${API_URL}/api/staff/tickets/${ticket.id}/assignment`, { data: { ownerId: staff2.id } });
  expect(reassigned.status()).toBe(200);
  expect((await reassigned.json()).data.ticket.owner.id).toBe(staff2.id);
  const unassigned = await request.post(`${API_URL}/api/staff/tickets/${ticket.id}/assignment`, { data: { ownerId: null } });
  expect(unassigned.status()).toBe(200);
  expect((await unassigned.json()).data.ticket.owner).toBeNull();
  await prepareApiUser(request, "requester3@toktickit.test");
  const resolved = await request.post(`${API_URL}/api/tickets/${ticket.id}/resolved`);
  expect(resolved.status()).toBe(200);
  await loginApi(request, "staff1@toktickit.test");
  const resolvedDetail = await request.get(`${API_URL}/api/staff/tickets/${ticket.id}`);
  expect(resolvedDetail.status()).toBe(200);
  expect((await resolvedDetail.json()).data.ticket.requesterResolvedAt).toBeTruthy();

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
  for (const extraSummary of extraTicketSummaries) {
    await removeE2ETicketsBySummary(requester.id, extraSummary);
  }
  extraTicketSummaries = [];
  staffTicketCleanup = undefined;
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
