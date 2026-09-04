import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import {
  API_URL,
  getRequesterId,
  openTicketFromMyTickets,
  removeE2EAttachments,
  removeE2ETicketsBySummary,
  screenshotPath,
  seedTicket,
  selectRequester,
} from "./support.js";

test.describe("Lab 2 requester-owned Ticket flow", () => {
  test("selects a requester, creates a Ticket, finds it, and opens read-only detail", async ({
    page,
    request,
  }) => {
    const requesterId = await getRequesterId(
      request,
      "Development Requester 1",
    );
    const summary = "E2E requester Ticket flow";
    await removeE2ETicketsBySummary(requesterId, summary);
    await selectRequester(page, requesterId);

    await expect(page.getByLabel("Category")).toBeEnabled();
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Related System").selectOption({ index: 1 });
    await page.getByLabel("Summary").fill(summary);
    await page.getByLabel("Requested Priority").selectOption("HIGH");
    await page
      .getByLabel("Description")
      .fill("The complete requester-owned Ticket flow is verified in a real browser.");
    await page.getByRole("button", { name: "Create Ticket" }).last().click();

    const success = page.getByRole("status").filter({
      hasText: "Ticket Created",
    });
    await expect(success).toBeVisible();

    const ticketNumber = (
      await success.locator("dt", { hasText: "Official Ticket Number" })
        .locator("xpath=following-sibling::dd[1]")
        .textContent()
    )?.trim();

    expect(ticketNumber).toMatch(/^TKT-\d{8}-[A-F0-9]{6}$/);
    await success.getByRole("button", { name: "My Tickets" }).click();
    await page.getByLabel("Search Tickets").fill(ticketNumber!);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(ticketNumber!).first()).toBeVisible();
    await page.getByRole("button", { name: "View" }).first().click();

    await expect(
      page.getByRole("heading", { name: ticketNumber! }),
    ).toBeVisible();
    await expect(page.getByText("E2E requester Ticket flow").first()).toBeVisible();
    await expect(page.getByText("Development Requester 1").last()).toBeVisible();
    await removeE2ETicketsBySummary(requesterId, summary);
  });

  test("prevents requester B from seeing requester A Ticket", async ({
    page,
    request,
  }) => {
    const requesterA = await getRequesterId(
      request,
      "Development Requester 1",
    );
    const requesterB = await getRequesterId(
      request,
      "Development Requester 2",
    );
    const ticket = await seedTicket(
      request,
      requesterA,
      "20000000-0000-4000-8000-000000000001",
      "E2E requester ownership boundary",
    );
    await removeE2EAttachments(ticket.id, "e2e-cross-owner.png");

    const uploaded = await request.post(
      `${API_URL}/api/tickets/${ticket.id}/attachments`,
      {
        headers: {
          "X-Development-Requester-Id": String(requesterA),
        },
        multipart: {
          file: {
            name: "e2e-cross-owner.png",
            mimeType: "image/png",
            buffer: Buffer.from("requester ownership boundary"),
          },
        },
      },
    );
    expect(uploaded.status()).toBe(201);
    const uploadedAttachment = (await uploaded.json()) as { id: number };

    await selectRequester(page, requesterA);
    await page.getByRole("button", { name: "My Tickets" }).click();
    await page.getByLabel("Search Tickets").fill(ticket.ticketNumber);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(ticket.ticketNumber).first()).toBeVisible();

    await page.getByRole("button", { name: "Change Requester" }).click();
    await page
      .getByLabel("Development Requester")
      .selectOption(String(requesterB));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.locator("strong", { hasText: "Development Requester 2" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "My Tickets" }).click();
    await page.getByLabel("Search Tickets").fill(ticket.ticketNumber);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(
      page.getByRole("heading", {
        name: "No Tickets match the current Search or Filters.",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: screenshotPath("my-tickets", "requester-switch.png"),
      fullPage: true,
    });

    const forbiddenDetail = await request.get(
      `${API_URL}/api/tickets/${ticket.id}`,
      {
        headers: {
          "X-Development-Requester-Id": String(requesterB),
        },
      },
    );
    expect(forbiddenDetail.status()).toBe(404);
    expect(JSON.stringify(await forbiddenDetail.json())).not.toContain(
      ticket.ticketNumber,
    );

    const requesterBHeaders = {
      "X-Development-Requester-Id": String(requesterB),
    };
    const crossOwnerResponses = await Promise.all([
      request.get(`${API_URL}/api/tickets/${ticket.id}/attachments`, {
        headers: requesterBHeaders,
      }),
      request.get(`${API_URL}/api/attachments/${uploadedAttachment.id}`, {
        headers: requesterBHeaders,
      }),
      request.get(
        `${API_URL}/api/attachments/${uploadedAttachment.id}/download`,
        { headers: requesterBHeaders },
      ),
      request.delete(`${API_URL}/api/attachments/${uploadedAttachment.id}`, {
        headers: requesterBHeaders,
        data: {
          removalReason: "Cross-owner operation must be rejected.",
        },
      }),
    ]);

    for (const response of crossOwnerResponses) {
      expect(response.status()).toBe(404);
      expect(JSON.stringify(await response.json())).not.toMatch(
        /storageKey|requesterId|ownerId|e2e-cross-owner/i,
      );
    }

    await removeE2EAttachments(ticket.id, "e2e-cross-owner.png");
    await removeE2ETicketsBySummary(
      requesterA,
      "E2E requester ownership boundary",
    );
  });

  test("uploads, downloads, and soft-removes an owned Attachment", async ({
    page,
    request,
  }) => {
    const requesterId = await getRequesterId(
      request,
      "Development Requester 1",
    );
    const ticket = await seedTicket(
      request,
      requesterId,
      "20000000-0000-4000-8000-000000000002",
      "E2E Attachment lifecycle",
    );

    await selectRequester(page, requesterId);
    await openTicketFromMyTickets(page, ticket.ticketNumber);

    const filename = `e2e-evidence-${Date.now()}.png`;
    await page.getByLabel("Select supporting files").setInputFiles({
      name: filename,
      mimeType: "image/png",
      buffer: Buffer.from("Lab 2 attachment evidence"),
    });

    const attachment = page
      .getByRole("listitem")
      .filter({ hasText: filename });
    await expect(attachment).toContainText("ACTIVE");

    const downloadPromise = page.waitForEvent("download");
    await attachment.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(filename);
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    await expect(fs.readFile(downloadedPath!)).resolves.toEqual(
      Buffer.from("Lab 2 attachment evidence"),
    );

    await attachment.getByRole("button", { name: "Remove" }).click();
    await attachment
      .getByLabel("Removal Reason")
      .fill("E2E lifecycle evidence completed.");
    await attachment
      .getByRole("button", { name: "Confirm Removal" })
      .click();

    await expect(attachment).toContainText("REMOVED");
    await expect(attachment).toContainText(
      "E2E lifecycle evidence completed.",
    );
    await expect(
      attachment.getByRole("button", { name: "Download" }),
    ).toHaveCount(0);

    const attachmentList = await request.get(
      `${API_URL}/api/tickets/${ticket.id}/attachments`,
      {
        headers: {
          "X-Development-Requester-Id": String(requesterId),
        },
      },
    );
    expect(attachmentList.status()).toBe(200);
    const attachmentMetadata = (await attachmentList.json()) as {
      items: Array<{ id: number; originalName: string; state: string }>;
    };
    const removedAttachment = attachmentMetadata.items.find(
      (item) => item.originalName === filename,
    );
    expect(removedAttachment?.state).toBe("REMOVED");
    const removedDownload = await request.get(
      `${API_URL}/api/attachments/${removedAttachment!.id}/download`,
      {
        headers: {
          "X-Development-Requester-Id": String(requesterId),
        },
      },
    );
    expect(removedDownload.status()).toBe(410);
    expect(JSON.stringify(await removedDownload.json())).not.toMatch(
      /storageKey|sql|prisma|password/i,
    );
    await removeE2EAttachments(ticket.id, filename);
    await removeE2ETicketsBySummary(
      requesterId,
      "E2E Attachment lifecycle",
    );
  });

  test("shows safe failure and Retry states without exposing internal detail", async ({
    page,
    request,
  }) => {
    const requesterId = await getRequesterId(
      request,
      "Development Requester 1",
    );

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
    await page.goto("/");
    const requesterAlert = page.getByRole("alert");
    await expect(requesterAlert).toContainText(
      "Unable to load Development Requesters",
    );
    await expect(requesterAlert).not.toContainText(/password|sql|prisma/i);
    await page.unroute("**/api/development-requesters");
    await requesterAlert.getByRole("button", { name: "Retry" }).click();
    await page
      .getByLabel("Development Requester")
      .selectOption(String(requesterId));
    await page.getByRole("button", { name: "Continue" }).click();

    const createFailureSummary = "E2E retained create failure values";
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Related System").selectOption({ index: 1 });
    await page.getByLabel("Summary").fill(createFailureSummary);
    await page.getByLabel("Requested Priority").selectOption("LOW");
    await page
      .getByLabel("Description")
      .fill("A safe create failure must preserve every valid form value.");
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
    const createAlert = page.getByRole("alert");
    await expect(createAlert).toContainText("Unable to create the Ticket");
    await expect(page.getByLabel("Summary")).toHaveValue(createFailureSummary);
    await expect(page.getByLabel("Requested Priority")).toHaveValue("LOW");
    await page.unroute("**/api/tickets");

    let allowSuccess = false;
    await page.route("http://localhost:3000/api/tickets?*", async (route) => {
      if (
        route.request().method() === "GET" &&
        !allowSuccess
      ) {
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
      await route.continue();
    });

    await page.getByRole("button", { name: "My Tickets" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Unable to load your Tickets");
    await expect(alert).not.toContainText(/password|sql|prisma/i);
    allowSuccess = true;
    await alert.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByLabel("My Tickets controls")).toBeVisible();

    const detailTicket = await seedTicket(
      request,
      requesterId,
      "10000000-0000-4000-8000-000000000004",
      "E2E safe Ticket Detail failure",
    );
    await page.getByLabel("Search Tickets").fill(detailTicket.ticketNumber);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(detailTicket.ticketNumber).first()).toBeVisible();
    await page.route(`**/api/tickets/${detailTicket.id}`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Unable to load the Ticket.",
          },
        }),
      });
    });
    await page.getByRole("button", { name: "View" }).first().click();
    const detailAlert = page.getByRole("alert");
    await expect(detailAlert).toContainText("Unable to load Ticket Detail");
    await expect(detailAlert).not.toContainText(/password|sql|prisma/i);
    await expect(
      page.getByRole("button", { name: "Back to My Tickets" }),
    ).toBeVisible();
    await page.unroute(`**/api/tickets/${detailTicket.id}`);
    await removeE2ETicketsBySummary(
      requesterId,
      "E2E safe Ticket Detail failure",
    );
  });
});
