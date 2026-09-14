import {
  APIRequestContext,
  expect,
  Page,
} from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPrisma } from "../../server/src/prisma.js";
import { assertDedicatedE2EDatabase } from "../database-guard.js";

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

export const ADMIN_EMAIL = "admin@toktickit.test";
export const E2E_PASSWORD = "Lab3-E2E-Password1!";

const e2eDatabaseUrl = assertDedicatedE2EDatabase(
  process.env.E2E_DATABASE_URL,
  path.join(REPOSITORY_ROOT, "server", ".env"),
);

// Prisma is lazy in this project. Setting DATABASE_URL before any helper uses
// getPrisma() ensures direct cleanup uses the same isolated database as the
// Playwright server process.
process.env.DATABASE_URL = e2eDatabaseUrl;

let initialPasswordPromise: Promise<string> | undefined;

export async function getInitialPassword(): Promise<string> {
  if (!initialPasswordPromise) {
    initialPasswordPromise = (async () => {
      if (process.env.LAB3_INITIAL_PASSWORD) return process.env.LAB3_INITIAL_PASSWORD;
      const envText = await fs.readFile(path.join(REPOSITORY_ROOT, "server", ".env"), "utf8");
      const line = envText.split(/\r?\n/).find((value) => /^\s*LAB3_INITIAL_PASSWORD\s*=/.test(value));
      if (!line) throw new Error("LAB3_INITIAL_PASSWORD is not configured for E2E.");
      return line.slice(line.indexOf("=") + 1).trim().replace(/^\"|\"$/g, "");
    })();
  }
  return initialPasswordPromise;
}

export function lab3ScreenshotPath(
  screen: "authentication" | "staff-queue" | "staff-ticket-detail" | "user-management",
  filename: string,
): string {
  return path.join(REPOSITORY_ROOT, "artifacts", "lab-03", "screenshots", screen, filename);
}

export async function loginApi(
  request: APIRequestContext,
  email: string,
  password?: string,
): Promise<{ id: number; name: string; email: string; role: string; isActive: boolean; mustChangePassword: boolean }> {
  const initialPassword = password ?? await getInitialPassword();
  let response = await request.post(`${API_URL}/api/auth/login`, { data: { email, password: initialPassword } });
  if (!response.ok() && password === undefined) {
    response = await request.post(`${API_URL}/api/auth/login`, { data: { email, password: E2E_PASSWORD } });
  }
  expect(response.status(), `login failed for ${email}`).toBe(200);
  let user = ((await response.json()) as { data: { user: { id: number; name: string; email: string; role: string; isActive: boolean; mustChangePassword: boolean } } }).data.user;
  if (user.mustChangePassword) {
    const changed = await request.post(`${API_URL}/api/auth/change-password`, { data: { newPassword: E2E_PASSWORD, confirmPassword: E2E_PASSWORD } });
    expect(changed.status(), `initial password change failed for ${email}`).toBe(200);
    user = { ...user, mustChangePassword: false };
  }
  return user;
}

export async function resetInitialPassword(
  request: APIRequestContext,
  email: string,
): Promise<number> {
  try {
    await loginApi(request, ADMIN_EMAIL);
  } catch (error) {
    // A previous E2E test may already have completed the Administrator's
    // first-login flow. Recover with the dedicated E2E password only; never
    // guess or print a database/application secret.
    await loginApi(request, ADMIN_EMAIL, E2E_PASSWORD);
  }
  const list = await request.get(`${API_URL}/api/admin/users?search=${encodeURIComponent(email)}&page=1&pageSize=20`);
  expect(list.status()).toBe(200);
  const body = (await list.json()) as { data: { items: Array<{ id: number; email: string }> } };
  const user = body.data.items.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`Missing E2E fixture user: ${email}`);
  const reset = await request.post(`${API_URL}/api/admin/users/${user.id}/initial-password`, { data: { initialPassword: await getInitialPassword() } });
  expect(reset.status()).toBe(200);
  return user.id;
}

export async function prepareApiUser(
  request: APIRequestContext,
  email: string,
): Promise<{ id: number; password: string; role: string }> {
  await resetInitialPassword(request, email);
  const user = await loginApi(request, email);
  // loginApi completes the first-login gate when needed, so every prepared
  // fixture is now authenticated with the dedicated E2E password.
  return { id: user.id, password: E2E_PASSWORD, role: user.role };
}

export async function loginPage(
  page: Page,
  email: string,
  password: string,
  screenshot?: string,
): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  if (await page.getByRole("heading", { name: "Change password required" }).isVisible().catch(() => false)) {
    await page.getByLabel("New password").fill(E2E_PASSWORD);
    await page.getByLabel("Confirm password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
  }
  if (screenshot) await page.screenshot({ path: screenshot, fullPage: true });
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
          containedInResponsiveTable: Boolean(element.closest(".table-responsive")),
        };
      })
      .filter(
        ({ left, right, containedInResponsiveTable }) =>
          !containedInResponsiveTable &&
          (left < -0.5 || right > viewportWidth + 0.5),
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
  if (!/^e2e[-_]/i.test(originalName)) {
    throw new Error("Refusing attachment cleanup without an E2E filename marker.");
  }
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
  if (!/^e2e\b/i.test(summary)) {
    throw new Error("Refusing Ticket cleanup without an E2E summary marker.");
  }
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

export async function removeE2EUserByEmail(email: string): Promise<void> {
  if (!/^e2e[-_]/i.test(email.split("@")[0] ?? "")) {
    throw new Error("Refusing User cleanup without an E2E email marker.");
  }
  const prisma = getPrisma();
  const users = await prisma.requesterUser.findMany({
    where: { email },
    select: {
      id: true,
      _count: {
        select: {
          tickets: true,
          ownedTickets: true,
          comments: true,
          internalNotes: true,
          removedAttachments: true,
        },
      },
    },
  });

  if (users.length === 0) return;
  if (users.some(({ _count }) => Object.values(_count).some((count) => count > 0))) {
    throw new Error(`Refusing to delete E2E user with related data: ${email}`);
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: { in: users.map(({ id }) => id) } } }),
    prisma.requesterUser.deleteMany({ where: { id: { in: users.map(({ id }) => id) } } }),
  ]);
}
