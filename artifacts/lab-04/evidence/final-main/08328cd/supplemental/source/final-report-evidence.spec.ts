// Supplemental evidence only; copied into an isolated main snapshot by its runner.
// This file is not part of the original-main 15-test suite.
import { test, expect, staffDetail, signIn, create, actionFields, API_URL, E2E_PASSWORD, loginPage, captureViews, guard } from "./support.js";
import { removeE2EAttachments } from "../lab-02/support.js";

test("REPORT-01: multiple performers, current owner, shared/private content and Requester read-only views", async ({ page, request, f }) => {
  const filename = `e2e-final-report-${f.primary.id}.pdf`;
  try {
    await staffDetail(page, f);
    await signIn(request, f.staff.email);
    await create(request, f.primary.id, { ...actionFields, description: "Network diagnosis", result: "Connection verified" });
    await create(request, f.primary.id, { ...actionFields, description: "Service restored", result: "Service available", followUpRequired: true, followUpNote: "Confirm with the Requester", attachmentNotes: "Review the attached verification note" });
    guard();
    const second = await f.prisma.requesterUser.update({ where: { id: f.inactive.id }, data: { isActive: true, name: "E2E Secondary Staff" } });
    await signIn(request, second.email);
    const otherAction = await create(request, f.primary.id, { ...actionFields, description: "Independent follow-up", result: "Requester access checked" });
    expect(otherAction.performedBy.id).toBe(second.id);
    expect(otherAction.ticketOwner.id).toBe(f.staff.id);
    await signIn(request, f.staff.email);
    expect((await request.post(`${API_URL}/api/staff/tickets/${f.primary.id}/comments`, { data: { content: "The service is restored. Please confirm access." } })).status()).toBe(201);
    expect((await request.post(`${API_URL}/api/staff/tickets/${f.primary.id}/notes`, { data: { content: "Private coordination note for IT Staff only." } })).status()).toBe(201);
    await signIn(request, f.requester.email);
    expect((await request.post(`${API_URL}/api/tickets/${f.primary.id}/attachments`, { multipart: { file: { name: filename, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nIsolated verification fixture\n%%EOF") } } })).status()).toBe(201);

    await page.getByRole("button", { name: "Back to Staff Queue", exact: true }).click();
    await page.getByLabel("Search Tickets").fill(f.primary.ticketNumber);
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await page.getByRole("button", { name: "Open Ticket", exact: true }).first().click();
    const actions = page.getByRole("region", { name: "Actions Taken", exact: true });
    await expect(actions.getByRole("listitem")).toHaveCount(3);
    await expect(actions).toContainText("E2E Secondary Staff");
    await expect(page.getByText("Private coordination note for IT Staff only.")).toBeVisible();
    await expect(page.getByText(filename, { exact: true })).toBeVisible();
    await captureViews(page, "actions-taken", "many-staff");
    await page.setViewportSize({ width: 1440, height: 1000 });
    const shared = page.getByRole("heading", { name: "Public Comments", exact: true }).locator("..");
    await shared.screenshot({ path: `../artifacts/lab-04/screenshots/actions-taken/shared-comments-desktop.png` });

    await page.getByRole("button", { name: "Logout" }).click();
    await loginPage(page, f.requester.email, E2E_PASSWORD);
    await expect(page.getByRole("button", { name: "My Tickets", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "My Tickets", exact: true }).click();
    await page.getByRole("button", { name: "View", exact: true }).first().click();
    await expect(page.getByText("Actions Taken are read-only for Requesters.")).toBeVisible();
    await expect(actions.getByRole("listitem")).toHaveCount(3);
    await expect(page.getByLabel("Action description")).toHaveCount(0);
    await expect(page.getByText("Private coordination note for IT Staff only.")).toHaveCount(0);
    await expect(page.getByText("The service is restored. Please confirm access.")).toBeVisible();
    await expect(page.getByText(filename, { exact: true })).toBeVisible();
    console.info("REPORT-01 button-name diagnostic", await page.getByRole("button").evaluateAll(elements => elements.filter(e => !e.textContent?.trim()).map(e => ({ tag: e.tagName, type: e.getAttribute("type"), id: e.id, ariaLabel: e.getAttribute("aria-label"), label: document.querySelector(`label[for="${e.id}"]`)?.textContent }))));
    await captureViews(page, "actions-taken", "many-requester-read-only");
  } finally {
    guard();
    await removeE2EAttachments(f.primary.id, filename);
  }
});
