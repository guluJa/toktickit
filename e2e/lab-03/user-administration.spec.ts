import { expect, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  API_URL,
  assertNoHorizontalOverflow,
  getInitialPassword,
  lab3ScreenshotPath,
  loginPage,
} from "./support.js";

test("Administrator manages users with search, role filtering, safe editing and responsive evidence", async ({ page, request }) => {
  await loginPage(page, ADMIN_EMAIL, await getInitialPassword());
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Administrator User List" })).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("user-management", "desktop.png"), fullPage: true });

  await page.getByLabel("Search users").fill("admin@toktickit.test");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();
  await page.getByLabel("Search users").fill("");
  const searchForm = page.getByRole("form", { name: "User search and filters" });
  await searchForm.getByLabel("Role", { exact: true }).selectOption("IT_STAFF");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.locator("table tbody tr").filter({ hasText: "IT_STAFF" }).first()).toBeVisible();
  await searchForm.getByLabel("Role", { exact: true }).selectOption("");
  await page.getByRole("button", { name: "Apply" }).click();

  await page.getByRole("button", { name: "Create User" }).first().click();
  const uniqueEmail = `e2e-admin-${Date.now()}@toktickit.test`;
  await page.getByLabel("Name", { exact: true }).fill("E2E Managed User");
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail);
  await page.getByRole("form", { name: "Create user form" }).getByLabel("Role", { exact: true }).selectOption("REQUESTER");
  await page.getByLabel("Status", { exact: true }).selectOption("inactive");
  await page.getByLabel("Initial Password").fill("Initial-E2E-Password1!");
  await page.getByRole("button", { name: "Create User" }).last().click();
  await expect(page.getByText("User created successfully.")).toBeVisible();
  await expect(page.getByText(uniqueEmail)).toBeVisible();

  const row = page.locator("tr").filter({ hasText: uniqueEmail });
  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Name", { exact: true }).fill("E2E Managed User Updated");
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("User updated successfully.")).toBeVisible();
  const resetRegion = page.getByRole("region", { name: "Set New Initial Password" });
  await resetRegion.getByLabel("New Initial Password", { exact: true }).fill("Reset-E2E-Password1!");
  await resetRegion.getByRole("button", { name: "Reset Initial Password" }).click();
  await expect(page.getByText("Initial password reset successfully.")).toBeVisible();

  const nextLogin = await request.post(`${API_URL}/api/auth/login`, {
    data: { email: uniqueEmail, password: "Reset-E2E-Password1!" },
  });
  expect(nextLogin.status()).toBe(200);
  expect((await nextLogin.json()).data.user.mustChangePassword).toBe(true);
  const nonAdminUsers = await request.get(`${API_URL}/api/admin/users`);
  expect(nonAdminUsers.status()).toBe(403);
  expect((await nonAdminUsers.json()).error.code).toBe("ROLE_FORBIDDEN");

  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("user-management", "tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("user-management", "mobile.png"), fullPage: true });

  const duplicate = await request.post(`${API_URL}/api/auth/login`, { data: { email: ADMIN_EMAIL, password: "not-a-real-password" } });
  expect(duplicate.status()).toBe(401);
  expect(JSON.stringify(await duplicate.json())).not.toMatch(/hash|stack|sql|prisma/i);
});
