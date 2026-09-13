import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const password = "Valid-Password1!";
const adminEmail = "lab3-admin-users-admin@toktickit.test";
const requesterEmail = "lab3-admin-users-requester@toktickit.test";
const staffEmail = "lab3-admin-users-staff@toktickit.test";
const secondAdminEmail = "lab3-admin-users-second-admin@toktickit.test";
const createdEmails: string[] = [];
let adminId: number;

describe("Lab 3 Administrator user management API", () => {
  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const make = async (email: string, name: string, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") => prisma.requesterUser.upsert({
      where: { email },
      update: { name, role, isActive: true, passwordHash, mustChangePassword: false },
      create: { name, email, role, isActive: true, passwordHash, mustChangePassword: false },
    });
    adminId = (await make(adminEmail, "Admin User Management", "ADMINISTRATOR")).id;
    await make(requesterEmail, "Admin Test Requester", "REQUESTER");
    await make(staffEmail, "Admin Test Staff", "IT_STAFF");
    await make(secondAdminEmail, "Second Admin", "ADMINISTRATOR");
  });

  afterAll(async () => {
    const emails = [adminEmail, requesterEmail, staffEmail, secondAdminEmail, ...createdEmails];
    const users = await prisma.requesterUser.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const ids = users.map((user) => user.id);
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.requesterUser.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  async function signedIn(email = adminEmail) {
    const agent = request.agent(app);
    const response = await agent.post("/api/auth/login").send({ email, password });
    expect(response.status).toBe(200);
    return agent;
  }

  async function createFixture(overrides: Partial<{ name: string; role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"; isActive: boolean }> = {}) {
    const email = `lab3-admin-target-${Date.now()}-${createdEmails.length}@toktickit.test`;
    createdEmails.push(email);
    return prisma.requesterUser.create({
      data: {
        name: overrides.name ?? "Administrator Target",
        email,
        role: overrides.role ?? "REQUESTER",
        isActive: overrides.isActive ?? true,
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
      },
    });
  }

  it("lists safe users and supports case-insensitive search and role filter", async () => {
    const agent = await signedIn();
    const list = await agent.get("/api/admin/users?search=ADMIN%20TEST&role=REQUESTER");
    expect(list.status).toBe(200);
    expect(list.body.data.items).toEqual(expect.arrayContaining([expect.objectContaining({ email: requesterEmail, role: "REQUESTER" })]));
    expect(JSON.stringify(list.body)).not.toContain("passwordHash");
    expect(JSON.stringify(list.body)).not.toContain(password);
    expect(list.body.data.pagination).toMatchObject({ page: 1, pageSize: 20 });
  });

  it("rejects invalid administrator list queries safely", async () => {
    const agent = await signedIn();
    const invalidRole = await agent.get("/api/admin/users?role=ROOT");
    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe("INVALID_QUERY");
    const invalidActive = await agent.get("/api/admin/users?isActive=yes");
    expect(invalidActive.status).toBe(400);
    expect(invalidActive.body.error.code).toBe("INVALID_QUERY");
  });

  it("creates active and inactive users with one role and a forced password change", async () => {
    const agent = await signedIn();
    const activeEmail = `lab3-admin-create-active-${Date.now()}@toktickit.test`;
    const inactiveEmail = `lab3-admin-create-inactive-${Date.now()}@toktickit.test`;
    createdEmails.push(activeEmail, inactiveEmail);
    const active = await agent.post("/api/admin/users").send({ name: "Created Staff", email: activeEmail, role: "IT_STAFF", isActive: true, initialPassword: password });
    const inactive = await agent.post("/api/admin/users").send({ name: "Created Inactive", email: inactiveEmail, role: "REQUESTER", isActive: false, initialPassword: password });
    expect(active.status).toBe(201);
    expect(active.body.data.user).toMatchObject({ email: activeEmail, role: "IT_STAFF", isActive: true, mustChangePassword: true });
    expect(inactive.status).toBe(201);
    expect(inactive.body.data.user).toMatchObject({ email: inactiveEmail, isActive: false, mustChangePassword: true });
    expect(JSON.stringify(active.body)).not.toContain("passwordHash");
    const stored = await prisma.requesterUser.findUniqueOrThrow({ where: { email: activeEmail } });
    expect(stored.passwordHash).not.toBe(password);
    expect(stored.mustChangePassword).toBe(true);
  });

  it("rejects invalid role, non-Boolean activation and duplicate email", async () => {
    const agent = await signedIn();
    const invalidRole = await agent.post("/api/admin/users").send({ name: "Invalid", email: "invalid-role@toktickit.test", role: "ROOT", isActive: true, initialPassword: password });
    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe("VALIDATION_ERROR");
    const invalidActive = await agent.post("/api/admin/users").send({ name: "Invalid", email: "invalid-active@toktickit.test", role: "REQUESTER", isActive: "true", initialPassword: password });
    expect(invalidActive.status).toBe(400);
    expect(invalidActive.body.error.code).toBe("VALIDATION_ERROR");
    const duplicate = await agent.post("/api/admin/users").send({ name: "Duplicate", email: requesterEmail.toUpperCase(), role: "REQUESTER", isActive: true, initialPassword: password });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("edits name, email, role and activation state", async () => {
    const target = await createFixture();
    const agent = await signedIn();
    const nextEmail = `${target.email}.updated`;
    createdEmails.push(nextEmail);
    const response = await agent.patch(`/api/admin/users/${target.id}`).send({ name: "Updated Target", email: nextEmail, role: "IT_STAFF", isActive: false });
    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ name: "Updated Target", email: nextEmail, role: "IT_STAFF", isActive: false });
    expect(await prisma.requesterUser.findUniqueOrThrow({ where: { id: target.id } })).toMatchObject({ name: "Updated Target", role: "IT_STAFF", isActive: false });
  });

  it("rejects unknown and empty update fields and safely handles missing users", async () => {
    const agent = await signedIn();
    const unknown = await agent.patch(`/api/admin/users/${adminId}`).send({ passwordHash: "bad" });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe("VALIDATION_ERROR");
    const empty = await agent.patch(`/api/admin/users/${adminId}`).send({});
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("VALIDATION_ERROR");
    const missing = await agent.patch("/api/admin/users/999999999").send({ name: "Missing" });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("USER_NOT_FOUND");
    const invalidId = await agent.patch("/api/admin/users/not-an-id").send({ name: "Invalid" });
    expect(invalidId.status).toBe(400);
    expect(invalidId.body.error.code).toBe("INVALID_ID");
  });

  it("resets an initial password, hashes it and requires a first-login change", async () => {
    const target = await createFixture();
    const agent = await signedIn();
    const newPassword = "New-Initial-Password2@";
    const response = await agent.post(`/api/admin/users/${target.id}/initial-password`).send({ initialPassword: newPassword });
    expect(response.status).toBe(200);
    expect(response.body.data.user.mustChangePassword).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain(newPassword);
    const stored = await prisma.requesterUser.findUniqueOrThrow({ where: { id: target.id } });
    expect(stored.passwordHash).not.toBe(newPassword);
    expect(stored.mustChangePassword).toBe(true);
  });

  it("forbids Requester and IT Staff from every Administrator endpoint without changing data", async () => {
    const target = await createFixture();
    const before = await prisma.requesterUser.findUniqueOrThrow({ where: { id: target.id } });
    for (const email of [requesterEmail, staffEmail]) {
      const agent = await signedIn(email);
      const responses = await Promise.all([
        agent.get("/api/admin/users"),
        agent.post("/api/admin/users").send({ name: "Forbidden User", email: `forbidden-${email}`, role: "REQUESTER", isActive: true, initialPassword: password }),
        agent.patch(`/api/admin/users/${target.id}`).send({ name: "Should Not Change" }),
        agent.post(`/api/admin/users/${target.id}/initial-password`).send({ initialPassword: "New-Initial-Password2@" }),
      ]);
      for (const response of responses) {
        expect(response.status).toBe(403);
        expect(response.body.error.code).toBe("ROLE_FORBIDDEN");
        expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|initialPassword|password/i);
      }
    }
    expect(await prisma.requesterUser.findUniqueOrThrow({ where: { id: target.id } })).toEqual(before);
  });

  it("rejects missing or invalid sessions on Administrator endpoints", async () => {
    const missing = await request(app).get("/api/admin/users");
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe("AUTHENTICATION_REQUIRED");
    const invalid = await request(app).get("/api/admin/users").set("Cookie", "toktickit_session=not-a-real-session");
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe("SESSION_INVALID");
  });

  it("validates role, activation and duplicate email on update", async () => {
    const target = await createFixture();
    const agent = await signedIn();
    const invalidRole = await agent.patch(`/api/admin/users/${target.id}`).send({ role: "ROOT" });
    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidRole.body.error.fields.role).toBeDefined();
    const invalidActive = await agent.patch(`/api/admin/users/${target.id}`).send({ isActive: "true" });
    expect(invalidActive.status).toBe(400);
    expect(invalidActive.body.error.code).toBe("VALIDATION_ERROR");
    expect(invalidActive.body.error.fields.isActive).toBeDefined();
    const duplicate = await agent.patch(`/api/admin/users/${target.id}`).send({ email: requesterEmail.toUpperCase() });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_EMAIL");
    expect(await prisma.requesterUser.findUniqueOrThrow({ where: { id: target.id } })).toMatchObject({ email: target.email, role: "REQUESTER", isActive: true });
  });

  it("serializes concurrent Administrator demotions and preserves one active Administrator", async () => {
    const first = await createFixture({ name: "Concurrent Administrator One", role: "ADMINISTRATOR" });
    const second = await createFixture({ name: "Concurrent Administrator Two", role: "ADMINISTRATOR" });
    const otherAdministrators = await prisma.requesterUser.findMany({
      where: { role: "ADMINISTRATOR", isActive: true, id: { notIn: [first.id, second.id] } },
      select: { id: true },
    });
    try {
      await prisma.requesterUser.updateMany({ where: { id: { in: otherAdministrators.map(({ id }) => id) } }, data: { isActive: false } });
      const firstAgent = await signedIn(first.email);
      const secondAgent = await signedIn(second.email);
      const [firstResponse, secondResponse] = await Promise.all([
        firstAgent.patch(`/api/admin/users/${second.id}`).send({ role: "REQUESTER" }),
        secondAgent.patch(`/api/admin/users/${first.id}`).send({ role: "REQUESTER" }),
      ]);
      expect([firstResponse.status, secondResponse.status].sort()).toEqual([200, 409]);
      const activeAdministrators = await prisma.requesterUser.count({ where: { role: "ADMINISTRATOR", isActive: true } });
      expect(activeAdministrators).toBe(1);
    } finally {
      await prisma.requesterUser.updateMany({ where: { id: { in: [first.id, second.id] } }, data: { role: "ADMINISTRATOR", isActive: true } });
      if (otherAdministrators.length > 0) {
        await prisma.requesterUser.updateMany({ where: { id: { in: otherAdministrators.map(({ id }) => id) } }, data: { isActive: true } });
      }
    }
  });

  it("prevents self-deactivation and removal of the last active Administrator", async () => {
    const agent = await signedIn();
    const self = await agent.patch(`/api/admin/users/${adminId}`).send({ isActive: false });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe("USER_UPDATE_CONFLICT");
    const otherActiveAdministrators = await prisma.requesterUser.findMany({
      where: { role: "ADMINISTRATOR", isActive: true, NOT: { id: adminId } },
      select: { id: true },
    });
    try {
      await prisma.requesterUser.updateMany({ where: { id: { in: otherActiveAdministrators.map(({ id }) => id) } }, data: { isActive: false } });
      const lastAdmin = await agent.patch(`/api/admin/users/${adminId}`).send({ role: "REQUESTER" });
      expect(lastAdmin.status).toBe(409);
      expect(lastAdmin.body.error.code).toBe("USER_UPDATE_CONFLICT");
    } finally {
      await prisma.requesterUser.update({ where: { id: adminId }, data: { role: "ADMINISTRATOR", isActive: true } });
      if (otherActiveAdministrators.length > 0) {
        await prisma.requesterUser.updateMany({ where: { id: { in: otherActiveAdministrators.map(({ id }) => id) } }, data: { isActive: true } });
      }
    }
    expect(await prisma.requesterUser.findUniqueOrThrow({ where: { id: adminId } })).toMatchObject({ role: "ADMINISTRATOR", isActive: true });
  });

  it("revokes a deactivated user's session", async () => {
    const target = await createFixture({ name: "Session Target" });
    const targetAgent = await signedIn(target.email);
    const admin = await signedIn();
    const response = await admin.patch(`/api/admin/users/${target.id}`).send({ isActive: false });
    expect(response.status).toBe(200);
    const current = await targetAgent.get("/api/auth/me");
    expect(current.status).toBe(401);
    expect(current.body.error.code).toBe("SESSION_INVALID");
  });
});
