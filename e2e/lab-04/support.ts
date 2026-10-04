import { test as base, expect, type Page, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "../../server/src/prisma.js";
import { hashPassword } from "../../server/src/auth.js";
import { assertDedicatedE2EDatabase } from "../database-guard.js";
import { API_URL, E2E_PASSWORD, REPOSITORY_ROOT, loginPage, assertNoHorizontalOverflow } from "../lab-02/support.js";
export { expect, API_URL, E2E_PASSWORD, loginPage, assertNoHorizontalOverflow };

export function guard() { process.env.DATABASE_URL = assertDedicatedE2EDatabase(process.env.E2E_DATABASE_URL, path.join(REPOSITORY_ROOT, "server/.env")); }
export async function fixtures() {
  guard(); const prisma = getPrisma(); const users: number[] = [], tickets: number[] = [];
  const passwordHash = await hashPassword(E2E_PASSWORD);
  async function cleanup() {
    guard(); await prisma.$transaction(async tx => {
      const owned = { ticketId: { in: tickets } };
      await tx.actionTaken.deleteMany({ where: owned }); await tx.comment.deleteMany({ where: owned }); await tx.internalNote.deleteMany({ where: owned }); await tx.attachment.deleteMany({ where: owned });
      await tx.ticket.deleteMany({ where: { id: { in: tickets } } }); await tx.session.deleteMany({ where: { userId: { in: users } } }); await tx.requesterUser.deleteMany({ where: { id: { in: users } } });
    }); await prisma.$disconnect();
  }
  async function user(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR", isActive = true) {
    guard(); const u = await prisma.requesterUser.create({ data: { name: `E2E ${role}`, email: `e2e-lab4-${randomUUID()}@toktickit.test`, role, isActive, passwordHash, mustChangePassword: false } }); users.push(u.id); return u;
  }
  try {
    const requester = await user("REQUESTER"), other = await user("REQUESTER"), staff = await user("IT_STAFF"), admin = await user("ADMINISTRATOR"), inactive = await user("IT_STAFF", false);
    const category = await prisma.category.findFirstOrThrow(), system = await prisma.relatedSystem.findFirstOrThrow();
    async function ticket(currentStatus: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED" = "IN_PROGRESS", requesterId = requester.id, updatedAt = new Date()) {
      guard(); const t = await prisma.ticket.create({ data: { ticketNumber: `E2E4-${randomUUID().slice(0, 8)}`, submissionKey: randomUUID(), summary: "E2E Lab 4 network service", description: "Isolated hardening fixture", requesterId, ownerId: staff.id, categoryId: category.id, relatedSystemId: system.id, currentStatus, requestedPriority: "HIGH", itPriority: "HIGH", updatedAt } }); tickets.push(t.id); return t;
    }
    const primary = await ticket();
    return { prisma, requester, other, staff, admin, inactive, ticket, primary, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
export type Fixture = Awaited<ReturnType<typeof fixtures>>;
export const test = base.extend<{ f: Fixture; browserEvidence: void }>({
  f: async ({}, use) => { const f = await fixtures(); try { await use(f); } finally { await f.cleanup(); } },
  browserEvidence: [async ({ page }, use, info) => {
    const consoleMessages: { type: string; text: string }[] = [], pageErrors: string[] = [];
    const responses: { method: string; path: string; status: number }[] = [];
    page.on("console", m => { if (["error", "warning"].includes(m.type())) consoleMessages.push({ type: m.type(), text: m.text() }); });
    page.on("pageerror", e => pageErrors.push(e.message));
    page.on("response", r => { const url = new URL(r.url()); if (url.pathname.startsWith("/api/")) responses.push({ method: r.request().method(), path: url.pathname, status: r.status() }); });
    await use();
    const folder = path.join(REPOSITORY_ROOT, "artifacts/lab-04/verification/browser"); await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, info.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 150) + ".json"), JSON.stringify({ title: info.title, status: info.status, note: "Includes deliberate authorization/conflict/network-failure injection and unauthenticated auth/me probes; these are not normal-flow failures. No request bodies, cookies or headers recorded.", pageErrors, consoleMessages, responses }, null, 2) + "\n");
    expect(pageErrors, "No uncaught browser exceptions").toEqual([]);
  }, { auto: true }],
});
export async function signIn(request: APIRequestContext, email: string) { const r = await request.post(`${API_URL}/api/auth/login`, { data: { email, password: E2E_PASSWORD } }); expect(r.status()).toBe(200); }
export async function staffDetail(page: Page, f: Fixture) {
  await loginPage(page, f.staff.email, E2E_PASSWORD); await page.getByLabel("Search Tickets").fill(f.primary.ticketNumber); await page.getByRole("button", { name: "Apply", exact: true }).click(); await page.getByRole("button", { name: "Open Ticket", exact: true }).first().click(); await expect(page.getByRole("heading", { name: f.primary.ticketNumber })).toBeVisible(); await expect(page.getByText("No Actions Taken yet.")).toBeVisible();
}
export const actionFields = { description: "Connection checked", result: "Connection restored", followUpRequired: false, followUpNote: null, attachmentNotes: null };
export async function create(request: APIRequestContext, id: number, fields = actionFields) { const r = await request.post(`${API_URL}/api/staff/tickets/${id}/actions`, { data: fields }); expect(r.status()).toBe(201); return (await r.json()).data.action; }
export async function transition(request: APIRequestContext, id: number, status: string, reopenReason?: string) { const d = (await (await request.get(`${API_URL}/api/staff/tickets/${id}`)).json()).data.ticket; return request.patch(`${API_URL}/api/staff/tickets/${id}/status`, { data: { status, version: d.version, ...(reopenReason ? { reopenReason } : {}) } }); }
export async function browserCheck(page: Page) {
  await assertNoHorizontalOverflow(page);
  const problems = await page.evaluate(() => {
    const visible = (e: Element) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    return [...document.querySelectorAll("input:not([type=hidden]),select,textarea")].filter(visible).filter(e => !e.id || !document.querySelector(`label[for="${e.id}"]`)).map(e => e.tagName + ":" + e.id);
  }); expect(problems, "Every visible input has a visible associated label").toEqual([]);
  const buttons = page.getByRole("button"); for (let i = 0; i < await buttons.count(); i++) if (await buttons.nth(i).isVisible()) expect((await buttons.nth(i).innerText()).trim()).not.toBe("");
  const overlaps = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0);
    const bad: string[] = [];
    for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i].getBoundingClientRect(), b = buttons[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) bad.push(`${buttons[i].textContent?.trim()} / ${buttons[j].textContent?.trim()}`);
    }
    return bad;
  }); expect(overlaps, "Visible buttons do not overlap").toEqual([]);
}
export async function screenshot(page: Page, group: string, name: string) {
  const folder = path.join(REPOSITORY_ROOT, "artifacts/lab-04/screenshots", group); await fs.mkdir(folder, { recursive: true }); await browserCheck(page); await page.screenshot({ path: path.join(folder, `${name}.png`), fullPage: true });
}
export const viewports = [{ name: "desktop", width: 1440, height: 1000 }, { name: "tablet", width: 820, height: 1180 }, { name: "mobile", width: 375, height: 812 }];
export async function captureViews(page: Page, group: string, state: string) {
  for (const v of viewports) {
    await page.setViewportSize(v); await screenshot(page, group, `${state}-${v.name}`);
    const folder = path.join(REPOSITORY_ROOT, "artifacts/lab-04/screenshots", group);
    // Keep full-page evidence plus readable native element captures for reports.
    if (group === "actions-taken") await page.getByRole("region", { name: "Actions Taken", exact: true }).screenshot({ path: path.join(folder, `${state}-${v.name}-actions-panel.png`) });
    else if (state === "populated") {
      await page.locator(".row.g-3.mb-4").screenshot({ path: path.join(folder, `${state}-${v.name}-metrics.png`) });
      if (group === "staff-dashboard") await page.getByRole("region", { name: "My Recent Actions", exact: true }).screenshot({ path: path.join(folder, `${state}-${v.name}-my-actions.png`) });
    }
  }
}
export async function focusCheck(page: Page, label: string, nextLabel: string) {
  const input = page.getByLabel(label, { exact: true }); await input.focus(); await expect(input).toBeFocused(); await page.keyboard.press("Tab"); await expect(page.getByLabel(nextLabel, { exact: true })).toBeFocused();
  expect(await page.getByLabel(nextLabel, { exact: true }).evaluate(e => { const s = getComputedStyle(e); return s.boxShadow !== "none" || (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0); })).toBe(true);
}
