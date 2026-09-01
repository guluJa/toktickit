import { expect, test } from "@playwright/test";
import {
  API_URL,
  assertNoHorizontalOverflow,
  getRequesterId,
  openTicketFromMyTickets,
  removeE2EAttachments,
  removeE2ETicketsBySummary,
  screenshotPath,
  seedTicket,
  selectRequester,
} from "./support.js";

async function fillTicketForm(
  page: Parameters<typeof assertNoHorizontalOverflow>[0],
  summary: string,
): Promise<void> {
  await expect(page.getByLabel("Category")).toBeEnabled();
  await page.getByLabel("Category").selectOption({ index: 1 });
  await page.getByLabel("Related System").selectOption({ index: 1 });
  await page.getByLabel("Summary").fill(summary);
  await page.getByLabel("Requested Priority").selectOption("MEDIUM");
  await page
    .getByLabel("Description")
    .fill("Responsive Lab 2 evidence uses a complete and valid Ticket description.");
}

test("captures required responsive and UI-state evidence", async ({
  page,
  request,
}) => {
  const requesterId = await getRequesterId(
    request,
    "Development Requester 4",
  );
  await removeE2ETicketsBySummary(
    requesterId,
    "Responsive submitting and success evidence",
  );
  const seededTicket = await seedTicket(
    request,
    requesterId,
    "40000000-0000-4000-8000-000000000001",
    "Responsive Ticket Detail evidence",
  );
  const responsiveAttachmentFilename =
    "responsive-evidence-with-a-very-long-filename-that-wraps-without-overflow.png";

  let releaseRequesterLoading!: () => void;
  const requesterLoadingGate = new Promise<void>((resolve) => {
    releaseRequesterLoading = resolve;
  });
  await page.route("**/api/development-requesters", async (route) => {
    await requesterLoadingGate;
    await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(
    "Loading development requesters",
  );
  await page.screenshot({
    path: screenshotPath("create-ticket", "requester-loading.png"),
    fullPage: true,
  });
  releaseRequesterLoading();
  await expect(page.getByLabel("Development Requester")).toBeEnabled();
  await page.unroute("**/api/development-requesters");
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("create-ticket", "requester-selection.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("create-ticket", "requester-selection-tablet.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("create-ticket", "requester-selection-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.route("**/api/development-requesters", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to load Development Requesters.",
        },
      }),
    });
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Unable to load Development Requesters",
  );
  await page.screenshot({
    path: screenshotPath("create-ticket", "requester-failure.png"),
    fullPage: true,
  });
  await page.unroute("**/api/development-requesters");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByLabel("Development Requester")).toBeEnabled();

  await selectRequester(page, requesterId);
  await expect(page.getByLabel("Category")).toBeEnabled();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(245, 247, 246)",
  );
  await expect(
    page.getByRole("button", { name: "Create Ticket" }).first(),
  ).toHaveCSS("background-color", "rgb(0, 107, 60)");
  await expect(page.locator('[data-readonly="true"]').first()).toHaveCSS(
    "background-color",
    "rgb(240, 244, 241)",
  );
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("create-ticket", "desktop-initial.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("create-ticket", "tablet.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoHorizontalOverflow(page);
  const mobileNavigationToggle = page.getByRole("button", {
    name: "Hide workspace navigation",
  });
  await mobileNavigationToggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("navigation", { name: "Requester workspace" }),
  ).toBeHidden();
  const showMobileNavigation = page.getByRole("button", {
    name: "Show workspace navigation",
  });
  await showMobileNavigation.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("navigation", { name: "Requester workspace" }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("create-ticket", "mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "Create Ticket" }).last().click();
  await expect(page.getByLabel("Category")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.screenshot({
    path: screenshotPath("create-ticket", "desktop-validation.png"),
    fullPage: true,
  });

  await fillTicketForm(page, "Responsive submitting and success evidence");

  let releaseSubmission!: () => void;
  const submissionGate = new Promise<void>((resolve) => {
    releaseSubmission = resolve;
  });
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() === "POST") {
      await submissionGate;
    }
    await route.continue();
  });

  await page.getByRole("button", { name: "Create Ticket" }).last().click();
  await expect(
    page.getByRole("button", { name: "Creating Ticket..." }),
  ).toBeDisabled();
  await page.screenshot({
    path: screenshotPath("create-ticket", "desktop-submitting.png"),
    fullPage: true,
  });
  releaseSubmission();

  const success = page.getByRole("status").filter({
    hasText: "Ticket Created",
  });
  await expect(success).toBeVisible();
  await page.screenshot({
    path: screenshotPath("create-ticket", "desktop-success.png"),
    fullPage: true,
  });
  await page.unroute("**/api/tickets");

  await page.getByLabel("Select supporting files").setInputFiles([
    {
      name: "responsive-valid.png",
      mimeType: "image/png",
      buffer: Buffer.from("valid responsive Attachment evidence"),
    },
    {
      name: "responsive-invalid.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("invalid Attachment evidence"),
    },
  ]);
  const validSelection = page
    .getByRole("listitem")
    .filter({ hasText: "responsive-valid.png" });
  const invalidSelection = page
    .getByRole("listitem")
    .filter({ hasText: "responsive-invalid.exe" });
  await expect(validSelection).toContainText("ACTIVE");
  await expect(invalidSelection).toContainText("INVALID");
  await expect(invalidSelection.getByRole("alert")).toBeVisible();
  await page.screenshot({
    path: screenshotPath("create-ticket", "invalid-attachment.png"),
    fullPage: true,
  });

  await success
    .getByRole("button", { name: "Create Another Ticket" })
    .click();
  await fillTicketForm(page, "Responsive safe failure evidence");
  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Unable to create the Ticket.",
          },
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Create Ticket" }).last().click();
  await expect(page.getByRole("alert")).toContainText(
    "Unable to create the Ticket",
  );
  await page.screenshot({
    path: screenshotPath("create-ticket", "desktop-failure.png"),
    fullPage: true,
  });
  await page.unroute("**/api/tickets");

  await page.getByRole("button", { name: "My Tickets" }).click();
  await page.getByLabel("Search Tickets").fill(seededTicket.ticketNumber);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(seededTicket.ticketNumber).first()).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("my-tickets", "desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("my-tickets", "tablet.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByLabel("My Tickets cards")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("my-tickets", "mobile.png"),
    fullPage: true,
  });

  await page.getByLabel("Search Tickets").fill("NO_MATCH_FOR_LAB_02_EVIDENCE");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(
    page.getByRole("heading", {
      name: "No Tickets match the current Search or Filters.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("my-tickets", "no-results.png"),
    fullPage: true,
  });

  let listEvidenceMode: "failure" | "empty" = "failure";
  await page.route("http://localhost:3000/api/tickets?*", async (route) => {
    if (route.request().method() === "GET") {
      if (listEvidenceMode === "failure") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "INTERNAL_ERROR",
              message: "Unable to load Tickets.",
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalOwnedItems: 0,
          totalPages: 1,
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Clear Filters" }).click();
  const listFailure = page.getByRole("alert");
  await expect(listFailure).toContainText("Unable to load your Tickets");
  await page.screenshot({
    path: screenshotPath("my-tickets", "failure.png"),
    fullPage: true,
  });
  listEvidenceMode = "empty";
  await listFailure.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByRole("heading", {
      name: "You have not created any Tickets yet.",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("my-tickets", "empty.png"),
    fullPage: true,
  });
  await page.unroute("http://localhost:3000/api/tickets?*");

  await removeE2EAttachments(
    seededTicket.id,
    responsiveAttachmentFilename,
  );
  const uploaded = await request.post(
    `${API_URL}/api/tickets/${seededTicket.id}/attachments`,
    {
      headers: {
        "X-Development-Requester-Id": String(requesterId),
      },
      multipart: {
        file: {
          name: responsiveAttachmentFilename,
          mimeType: "image/png",
          buffer: Buffer.from("responsive removed attachment evidence"),
        },
      },
    },
  );
  expect(uploaded.status()).toBe(201);
  const attachment = (await uploaded.json()) as { id: number; state: string };
  expect(attachment.state).toBe("ACTIVE");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "My Tickets" }).click();
  await openTicketFromMyTickets(page, seededTicket.ticketNumber);
  await assertNoHorizontalOverflow(page);
  const activeAttachment = page
    .getByRole("listitem")
    .filter({ hasText: responsiveAttachmentFilename });
  await expect(activeAttachment).toContainText("ACTIVE");
  await expect(
    activeAttachment.getByRole("button", { name: "Download" }),
  ).toBeVisible();
  await page.screenshot({
    path: screenshotPath("ticket-detail", "desktop.png"),
    fullPage: true,
  });

  const removed = await request.delete(
    `${API_URL}/api/attachments/${attachment.id}`,
    {
      headers: {
        "X-Development-Requester-Id": String(requesterId),
      },
      data: {
        removalReason: "Responsive removed Attachment evidence.",
      },
    },
  );
  expect(removed.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByLabel("Category")).toBeEnabled();
  await openTicketFromMyTickets(page, seededTicket.ticketNumber);
  const removedAttachment = page
    .getByRole("listitem")
    .filter({ hasText: responsiveAttachmentFilename });
  await expect(removedAttachment).toContainText("REMOVED");
  await expect(
    removedAttachment.getByRole("button", { name: "Download" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: screenshotPath("ticket-detail", "removed-attachment.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("ticket-detail", "tablet.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: screenshotPath("ticket-detail", "mobile.png"),
    fullPage: true,
  });

  await removeE2EAttachments(
    seededTicket.id,
    responsiveAttachmentFilename,
  );
  await removeE2ETicketsBySummary(
    requesterId,
    "Responsive Ticket Detail evidence",
  );
  await removeE2ETicketsBySummary(
    requesterId,
    "Responsive submitting and success evidence",
  );
});
