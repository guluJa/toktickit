import { expect, test } from "@playwright/test";
import {
  getRequesterId,
  removeE2ETicketsBySummary,
  screenshotPath,
  seedTicket,
  selectRequester,
} from "./support.js";

test("searches, filters, sorts, changes page size, and paginates", async ({
  page,
  request,
}) => {
  const requesterId = await getRequesterId(
    request,
    "Development Requester 3",
  );

  const tickets = [];
  for (let index = 1; index <= 11; index += 1) {
    const summary = `E2E controls Ticket ${String(index).padStart(2, "0")}`;
    await removeE2ETicketsBySummary(requesterId, summary);
    tickets.push(
      await seedTicket(
        request,
        requesterId,
        `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
        summary,
      ),
    );
  }

  await selectRequester(page, requesterId);
  await page.getByRole("button", { name: "My Tickets" }).click();
  await expect(page.getByLabel("My Tickets table")).toBeVisible();

  await page.getByLabel("Search Tickets").fill(tickets[0].ticketNumber);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(tickets[0].ticketNumber).first()).toBeVisible();
  await expect(page.getByText("1 matching Tickets")).toBeVisible();

  await page.getByRole("button", { name: "Clear Filters" }).click();
  await page.getByLabel("Category Filter").selectOption({ index: 1 });
  await page.getByLabel("Related System Filter").selectOption({ index: 1 });
  await page.getByLabel("Priority Filter").selectOption("MEDIUM");
  await page.getByLabel("Status Filter").selectOption("NEW");
  await page.getByLabel("Sort By").selectOption("ticketNumber");
  await page.getByLabel("Sort Direction").selectOption("asc");
  await page.getByLabel("Page Size").selectOption("10");
  await page.getByRole("button", { name: "Apply" }).click();

  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous Page" }),
  ).toBeDisabled();
  await page.screenshot({
    path: screenshotPath("my-tickets", "filters-sort-pagination.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next Page" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next Page" }),
  ).toBeDisabled();

  for (let index = 1; index <= 11; index += 1) {
    await removeE2ETicketsBySummary(
      requesterId,
      `E2E controls Ticket ${String(index).padStart(2, "0")}`,
    );
  }
});
