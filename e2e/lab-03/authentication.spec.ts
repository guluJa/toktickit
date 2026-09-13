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
  removeE2ETicketsBySummary,
  resetInitialPassword,
} from "./support.js";

test.describe("Lab 3 authentication and requester regression", () => {
  test.afterAll(async ({ request }) => {
    for (const email of ["requester1@toktickit.test", "requester2@toktickit.test"]) {
      await resetInitialPassword(request, email);
    }
  });

  test("rejects invalid credentials, authenticates an Administrator, and logs out", async ({ page, request }) => {
    const initialPassword = await getInitialPassword();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "tablet", width: 820, height: 1180 },
      { name: "mobile", width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: lab3ScreenshotPath("authentication", `login-${viewport.name}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toContainText("incorrect");
    await page.getByLabel("Password").fill(initialPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Authenticated User:")).toBeVisible();
    await expect(page.getByText("Role: ADMINISTRATOR")).toBeVisible();
    const me = await request.get(`${API_URL}/api/auth/me`);
    expect(me.status()).toBe(401);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("enforces first-login password change, logout invalidation, and inactive-account rejection", async ({ page, request }) => {
    const initialPassword = await getInitialPassword();
    const requesterEmail = "requester1@toktickit.test";
    await resetInitialPassword(request, requesterEmail);
    await page.goto("/");
    await page.getByLabel("Email").fill(requesterEmail);
    await page.getByLabel("Password").fill(initialPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Change password required" })).toBeVisible();
    for (const viewport of [
      { name: "desktop", width: 1440, height: 1000 },
      { name: "tablet", width: 820, height: 1180 },
      { name: "mobile", width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: lab3ScreenshotPath("authentication", `change-password-${viewport.name}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel("New password").fill(E2E_PASSWORD);
    await page.getByLabel("Confirm password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("Authenticated session")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Development Requester/i })).toHaveCount(0);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    const requester = await prepareApiUser(request, requesterEmail);
    expect(requester.role).toBe("REQUESTER");
    const logout = await request.post(`${API_URL}/api/auth/logout`);
    expect(logout.status()).toBe(200);
    const afterLogout = await request.get(`${API_URL}/api/auth/me`);
    expect(afterLogout.status()).toBe(401);
    const inactiveLogin = await request.post(`${API_URL}/api/auth/login`, { data: { email: "inactive-requester@toktickit.test", password: initialPassword } });
    expect(inactiveLogin.status()).toBe(401);
    expect(JSON.stringify(await inactiveLogin.json())).not.toMatch(/passwordHash|stack|sql|prisma/i);
  });

  test("keeps requester ownership authenticated and blocks role-forbidden direct access", async ({ page, request }) => {
    const requesterEmail = "requester2@toktickit.test";
    const requester = await prepareApiUser(request, requesterEmail);
    const categories = (await (await request.get(`${API_URL}/api/categories`)).json()) as Array<{ id: number }>;
    const systems = (await (await request.get(`${API_URL}/api/related-systems`)).json()) as Array<{ id: number }>;
    const summary = `E2E authenticated requester ${Date.now()}`;
    const created = await request.post(`${API_URL}/api/tickets`, { data: { submissionKey: crypto.randomUUID(), categoryId: categories[0].id, relatedSystemId: systems[0].id, summary, requestedPriority: "LOW", description: "Authenticated requester regression evidence." } });
    expect(created.status()).toBe(201);
    const ticket = (await created.json()).ticket as { id: number; requester: { id: number } };
    expect(ticket.requester.id).toBe(requester.id);
    const staffQueue = await request.get(`${API_URL}/api/staff/tickets`);
    expect(staffQueue.status()).toBe(403);
    expect((await staffQueue.json()).error.code).toBe("ROLE_FORBIDDEN");
    await page.goto("/");
    await page.getByLabel("Email").fill(requesterEmail);
    await page.getByLabel("Password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Authenticated session")).toBeVisible();
    await expect(page.getByText("Current Requester:")).toBeVisible();
    await expect(page.getByRole("combobox", { name: /Development Requester/i })).toHaveCount(0);
    await removeE2ETicketsBySummary(requester.id, summary);
  });
});
