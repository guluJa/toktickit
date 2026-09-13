import { expect, request as playwrightRequest, test } from "@playwright/test";
import {
  ADMIN_EMAIL,
  API_URL,
  E2E_PASSWORD,
  assertNoHorizontalOverflow,
  lab3ScreenshotPath,
  loginApi,
  loginPage,
  removeE2EUserByEmail,
} from "./support.js";

let createdE2EUserEmail: string | undefined;
let createdSafetyAdminEmail: string | undefined;
let createdNonAdminEmail: string | undefined;

test.afterEach(async () => {
  if (createdE2EUserEmail) {
    await removeE2EUserByEmail(createdE2EUserEmail);
    createdE2EUserEmail = undefined;
  }
  if (createdSafetyAdminEmail) {
    await removeE2EUserByEmail(createdSafetyAdminEmail);
    createdSafetyAdminEmail = undefined;
  }
  if (createdNonAdminEmail) {
    await removeE2EUserByEmail(createdNonAdminEmail);
    createdNonAdminEmail = undefined;
  }
});

test("Administrator manages users with search, role filtering, safe editing and responsive evidence", async ({ page, request }) => {
  await loginApi(request, ADMIN_EMAIL);
  await loginPage(page, ADMIN_EMAIL, E2E_PASSWORD);
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
  createdE2EUserEmail = uniqueEmail;
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
  const changed = await request.post(`${API_URL}/api/auth/change-password`, { data: { newPassword: E2E_PASSWORD, confirmPassword: E2E_PASSWORD } });
  expect(changed.status()).toBe(200);
  expect((await request.get(`${API_URL}/api/auth/me`)).status()).toBe(200);
  await loginApi(request, ADMIN_EMAIL);
  const userSession = await playwrightRequest.newContext({ baseURL: API_URL });
  try {
    const userLogin = await userSession.post("/api/auth/login", { data: { email: uniqueEmail, password: E2E_PASSWORD } });
    expect(userLogin.status()).toBe(200);
    const currentUser = (await userLogin.json()).data.user as { id: number };
    const adminMe = await request.get(`${API_URL}/api/auth/me`);
    expect(adminMe.status()).toBe(200);
    const adminId = ((await adminMe.json()).data.user as { id: number }).id;
    const deactivate = await request.patch(`${API_URL}/api/admin/users/${currentUser.id}`, { data: { isActive: false } });
    expect(deactivate.status()).toBe(200);
    const revoked = await userSession.get("/api/auth/me");
    expect(revoked.status()).toBe(401);
    expect((await revoked.json()).error.code).toBe("SESSION_INVALID");
    const selfDeactivate = await request.patch(`${API_URL}/api/admin/users/${adminId}`, { data: { isActive: false } });
    expect(selfDeactivate.status()).toBe(409);
    expect((await selfDeactivate.json()).error.code).toMatch(/ADMIN|LAST|SELF|USER_UPDATE_CONFLICT/i);
  } finally {
    await userSession.dispose();
  }
  const nonAdminSession = await playwrightRequest.newContext({ baseURL: API_URL });
  try {
    await loginApi(request, ADMIN_EMAIL);
    const nonAdminEmail = `e2e-non-admin-${Date.now()}@toktickit.test`;
    createdNonAdminEmail = nonAdminEmail;
    const createdNonAdmin = await request.post(`${API_URL}/api/admin/users`, { data: { name: "E2E Non Administrator", email: nonAdminEmail, role: "REQUESTER", isActive: true, initialPassword: "NonAdmin-E2E-Password1!" } });
    expect(createdNonAdmin.status()).toBe(201);
    const staffLogin = await nonAdminSession.post("/api/auth/login", { data: { email: nonAdminEmail, password: "NonAdmin-E2E-Password1!" } });
    expect(staffLogin.status()).toBe(200);
    if (((await staffLogin.json()).data.user as { mustChangePassword: boolean }).mustChangePassword) {
      const change = await nonAdminSession.post("/api/auth/change-password", { data: { newPassword: E2E_PASSWORD, confirmPassword: E2E_PASSWORD } });
      expect(change.status()).toBe(200);
    }
    const nonAdminUsers = await nonAdminSession.get("/api/admin/users");
    expect(nonAdminUsers.status()).toBe(403);
    expect((await nonAdminUsers.json()).error.code).toBe("ROLE_FORBIDDEN");
  } finally {
    await nonAdminSession.dispose();
  }

  await page.setViewportSize({ width: 820, height: 1180 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("user-management", "tablet.png"), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: lab3ScreenshotPath("user-management", "mobile.png"), fullPage: true });
  const userTableScroller = page.getByRole("table", { name: "Administrator User List" }).locator("xpath=..");
  const scrollPosition = await userTableScroller.evaluate((element) => {
    const scroller = element as HTMLElement;
    scroller.scrollLeft = scroller.scrollWidth;
    return { left: scroller.scrollLeft, max: scroller.scrollWidth - scroller.clientWidth };
  });
  expect(scrollPosition.left).toBeGreaterThanOrEqual(scrollPosition.max);
  await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
  await page.screenshot({ path: lab3ScreenshotPath("user-management", "mobile-right.png"), fullPage: true });

  await loginApi(request, ADMIN_EMAIL);
  const duplicate = await request.post(`${API_URL}/api/admin/users`, {
    data: {
      name: "Duplicate E2E Email",
      email: ADMIN_EMAIL,
      role: "REQUESTER",
      isActive: true,
      initialPassword: "Duplicate-E2E-Password1!",
    },
  });
  expect(duplicate.status()).toBe(409);
  const duplicateBody = await duplicate.json();
  expect(duplicateBody.error.code).toBe("DUPLICATE_EMAIL");
  expect(JSON.stringify(duplicateBody)).not.toMatch(/password|hash|stack|sql|prisma/i);

  await loginApi(request, ADMIN_EMAIL);
  const safetyAdminEmail = `e2e-last-admin-${Date.now()}@toktickit.test`;
  createdSafetyAdminEmail = safetyAdminEmail;
  const createdSafetyAdmin = await request.post(`${API_URL}/api/admin/users`, { data: { name: "E2E Safety Administrator", email: safetyAdminEmail, role: "ADMINISTRATOR", isActive: true, initialPassword: "Safety-E2E-Password1!" } });
  expect(createdSafetyAdmin.status()).toBe(201);
  const safetyAdmin = (await createdSafetyAdmin.json()).data.user as { id: number };
  const safetySession = await playwrightRequest.newContext({ baseURL: API_URL });
  try {
    const safetyLogin = await safetySession.post("/api/auth/login", { data: { email: safetyAdminEmail, password: "Safety-E2E-Password1!" } });
    expect(safetyLogin.status()).toBe(200);
    if (((await safetyLogin.json()).data.user as { mustChangePassword: boolean }).mustChangePassword) {
      const changedSafetyPassword = await safetySession.post("/api/auth/change-password", { data: { newPassword: E2E_PASSWORD, confirmPassword: E2E_PASSWORD } });
      expect(changedSafetyPassword.status()).toBe(200);
    }
    const currentAdmin = (await (await request.get(`${API_URL}/api/auth/me`)).json()).data.user as { id: number };
    const [demoteSafety, demoteCurrent] = await Promise.all([
      request.patch(`${API_URL}/api/admin/users/${safetyAdmin.id}`, { data: { isActive: false } }),
      safetySession.patch(`/api/admin/users/${currentAdmin.id}`, { data: { isActive: false } }),
    ]);
    expect([demoteSafety.status(), demoteCurrent.status()].sort((a, b) => a - b)).toEqual([200, 409]);
  } finally {
    await safetySession.dispose();
  }
});
