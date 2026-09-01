import {
  APIRequestContext,
  expect,
  Page,
} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../../server/src/prisma.js";

export const API_URL = "http://127.0.0.1:3000";
export const REPOSITORY_ROOT = fileURLToPath(
  new URL("../../", import.meta.url),
);

export function screenshotPath(
  screen: "create-ticket" | "my-tickets" | "ticket-detail",
  filename: string,
): string {
  return path.join(
    REPOSITORY_ROOT,
    "artifacts",
    "lab-02",
    "screenshots",
    screen,
    filename,
  );
}

interface ReferenceItem {
  id: number;
  name: string;
}

export interface SeededTicket {
  id: number;
  ticketNumber: string;
  requester: ReferenceItem;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  summary: string;
}

export async function getRequesterId(
  request: APIRequestContext,
  requesterName: string,
): Promise<number> {
  const response = await request.get(
    `${API_URL}/api/development-requesters`,
  );
  expect(response.ok()).toBeTruthy();

  const requesters = (await response.json()) as Array<
    ReferenceItem & { email: string }
  >;
  const requester = requesters.find(
    (item) => item.name === requesterName,
  );

  if (!requester) {
    throw new Error(`Missing seeded requester: ${requesterName}`);
  }

  return requester.id;
}

export async function selectRequester(
  page: Page,
  requesterId: number,
): Promise<void> {
  await page.goto("/");
  await page
    .getByLabel("Development Requester")
    .selectOption(String(requesterId));
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Current Requester:")).toBeVisible();
}

export async function seedTicket(
  request: APIRequestContext,
  requesterId: number,
  submissionKey: string,
  summary: string,
): Promise<SeededTicket> {
  const [categoriesResponse, systemsResponse] = await Promise.all([
    request.get(`${API_URL}/api/categories`),
    request.get(`${API_URL}/api/related-systems`),
  ]);

  expect(categoriesResponse.ok()).toBeTruthy();
  expect(systemsResponse.ok()).toBeTruthy();

  const categories = (await categoriesResponse.json()) as ReferenceItem[];
  const systems = (await systemsResponse.json()) as ReferenceItem[];

  const response = await request.post(`${API_URL}/api/tickets`, {
    headers: {
      "X-Development-Requester-Id": String(requesterId),
    },
    data: {
      submissionKey,
      categoryId: categories[0].id,
      relatedSystemId: systems[0].id,
      summary,
      requestedPriority: "MEDIUM",
      description:
        "Automated Lab 2 browser evidence for the requester-owned Ticket flow.",
    },
  });

  expect([200, 201]).toContain(response.status());
  const body = (await response.json()) as { ticket: SeededTicket };
  return body.ticket;
}

export async function assertNoHorizontalOverflow(
  page: Page,
): Promise<void> {
  const metrics = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rectangle = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}${
            element.id ? `#${element.id}` : ""
          }${
            element.classList.length > 0
              ? `.${Array.from(element.classList).join(".")}`
              : ""
          }`,
          left: rectangle.left,
          right: rectangle.right,
        };
      })
      .filter(
        ({ left, right }) =>
          left < -0.5 || right > viewportWidth + 0.5,
      )
      .slice(0, 10);

    return {
      viewportWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders,
    };
  });

  expect(
    metrics,
    `Horizontal overflow detected: ${JSON.stringify(metrics)}`,
  ).toEqual({
    viewportWidth: metrics.viewportWidth,
    scrollWidth: metrics.viewportWidth,
    offenders: [],
  });
}

export async function openTicketFromMyTickets(
  page: Page,
  ticketNumber: string,
): Promise<void> {
  await page.getByRole("button", { name: "My Tickets" }).click();
  await page.getByLabel("Search Tickets").fill(ticketNumber);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(ticketNumber).first()).toBeVisible();
  await page.getByRole("button", { name: "View" }).first().click();
  await expect(
    page.getByRole("heading", { name: ticketNumber }),
  ).toBeVisible();
}

export async function removeE2EAttachments(
  ticketId: number,
  originalName: string,
): Promise<void> {
  const prisma = getPrisma();
  const attachments = await prisma.attachment.findMany({
    where: {
      ticketId,
      originalName,
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

  if (attachments.length === 0) {
    return;
  }

  await prisma.attachment.deleteMany({
    where: {
      id: {
        in: attachments.map((attachment) => attachment.id),
      },
    },
  });

  await Promise.all(
    attachments.map((attachment) =>
      fs.rm(
        path.join(
          REPOSITORY_ROOT,
          "server",
          "uploads",
          attachment.storageKey,
        ),
        { force: true },
      ),
    ),
  );
}

export async function removeE2ETicketsBySummary(
  requesterId: number,
  summary: string,
): Promise<void> {
  const prisma = getPrisma();
  const tickets = await prisma.ticket.findMany({
    where: {
      requesterId,
      summary,
    },
    select: {
      id: true,
    },
  });

  if (tickets.length === 0) {
    return;
  }

  const ticketIds = tickets.map((ticket) => ticket.id);
  const attachments = await prisma.attachment.findMany({
    where: {
      ticketId: {
        in: ticketIds,
      },
    },
    select: {
      storageKey: true,
    },
  });

  await prisma.$transaction([
    prisma.attachment.deleteMany({
      where: {
        ticketId: {
          in: ticketIds,
        },
      },
    }),
    prisma.ticket.deleteMany({
      where: {
        id: {
          in: ticketIds,
        },
      },
    }),
  ]);

  await Promise.all(
    attachments.map((attachment) =>
      fs.rm(
        path.join(
          REPOSITORY_ROOT,
          "server",
          "uploads",
          attachment.storageKey,
        ),
        { force: true },
      ),
    ),
  );
}
