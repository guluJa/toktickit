import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";

const prisma = getPrisma();
const testEmail = "lab3-auth-foundation@toktickit.test";
const initialPassword = "Valid-Password1!";
const changedPassword = "Changed-Password2@";

describe("Lab 3 authentication API", () => {
  beforeAll(async () => {
    const passwordHash = await hashPassword(initialPassword, "lab3-auth-fixture");
    await prisma.requesterUser.upsert({
      where: { email: testEmail },
      update: {
        name: "Lab 3 Authentication Fixture",
        role: "REQUESTER",
        isActive: true,
        passwordHash,
        mustChangePassword: true,
      },
      create: {
        name: "Lab 3 Authentication Fixture",
        email: testEmail,
        role: "REQUESTER",
        isActive: true,
        passwordHash,
        mustChangePassword: true,
      },
    });
  });

  beforeEach(async () => {
    const user = await prisma.requesterUser.findUniqueOrThrow({ where: { email: testEmail } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.requesterUser.update({
      where: { id: user.id },
      data: {
        isActive: true,
        passwordHash: await hashPassword(initialPassword, "lab3-auth-fixture"),
        mustChangePassword: true,
      },
    });
  });

  afterAll(async () => {
    const user = await prisma.requesterUser.findUnique({ where: { email: testEmail } });
    if (user) {
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.requesterUser.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it("rejects missing login fields with a safe validation error", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(response.body.error.fields).toEqual({
      email: "Email is required.",
      password: "Password is required.",
    });
  });

  it("logs in, returns a safe user, and exposes the current user", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: testEmail, password: initialPassword });

    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();
    expect(login.body).toEqual({
      data: {
        user: {
          id: expect.any(Number),
          name: "Lab 3 Authentication Fixture",
          email: testEmail,
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: true,
        },
      },
    });
    expect(JSON.stringify(login.body)).not.toContain("passwordHash");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(testEmail);
  });

  it("rejects invalid credentials and inactive accounts uniformly", async () => {
    const wrongPassword = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password: "Wrong-Password1!",
    });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toEqual({
      error: { code: "AUTHENTICATION_FAILED", message: "Email or password is incorrect." },
    });

    await prisma.requesterUser.update({ where: { email: testEmail }, data: { isActive: false } });
    const inactive = await request(app).post("/api/auth/login").send({ email: testEmail, password: initialPassword });
    expect(inactive.status).toBe(401);
    expect(inactive.body.error.code).toBe("AUTHENTICATION_FAILED");
  });

  it("allows the first-login password change and clears the gate", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: testEmail, password: initialPassword });

    const invalid = await agent.post("/api/auth/change-password").send({ newPassword: "weak", confirmPassword: "weak" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");

    const changed = await agent.post("/api/auth/change-password").send({ newPassword: changedPassword, confirmPassword: changedPassword });
    expect(changed.status).toBe(200);
    expect(changed.body.data.user.mustChangePassword).toBe(false);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.mustChangePassword).toBe(false);
  });

  it("supports safe logout and invalidates the session", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: testEmail, password: initialPassword });

    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ data: { loggedOut: true } });

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
