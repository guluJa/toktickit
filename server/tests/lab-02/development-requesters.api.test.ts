import express, {
  Request,
  Response,
} from "express";
import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import {
  requireDevelopmentRequester,
} from "../../src/requester-context.js";

const prisma = getPrisma();

describe("Development Requester API", () => {
  beforeAll(async () => {
    const activeRequester =
      await prisma.requesterUser.findUnique({
        where: {
          email: "requester1@toktickit.test",
        },
      });

    const inactiveRequester =
      await prisma.requesterUser.findUnique({
        where: {
          email: "inactive-requester@toktickit.test",
        },
      });

    if (!activeRequester || !inactiveRequester) {
      throw new Error(
        "Lab 2 seed data is required before running these tests.",
      );
    }
  });

  it(
    "returns only active development requesters in deterministic order",
    async () => {
      const res = await request(app).get(
        "/api/development-requesters",
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(4);

      expect(
        res.body.map(
          (requester: { name: string }) =>
            requester.name,
        ),
      ).toEqual([
        "Development Requester 1",
        "Development Requester 2",
        "Development Requester 3",
        "Development Requester 4",
      ]);

      for (const requester of res.body) {
        expect(requester).toEqual({
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String),
        });
      }

      expect(
        res.body.some(
          (requester: { email: string }) =>
            requester.email ===
            "inactive-requester@toktickit.test",
        ),
      ).toBe(false);
    },
  );

  it(
    "returns an active requester by ID",
    async () => {
      const requester =
        await prisma.requesterUser.findUniqueOrThrow({
          where: {
            email: "requester1@toktickit.test",
          },
        });

      const res = await request(app).get(
        `/api/development-requesters/${requester.id}`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: requester.id,
        name: requester.name,
        email: requester.email,
      });
    },
  );

  it.each(["abc", "0", "-1", "1.5"])(
    "returns 400 for invalid requester ID %s",
    async (requesterId) => {
      const res = await request(app).get(
        `/api/development-requesters/${requesterId}`,
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(
        "INVALID_REQUESTER_ID",
      );
    },
  );

  it(
    "returns 404 for a missing requester",
    async () => {
      const res = await request(app).get(
        "/api/development-requesters/2147483647",
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(
        "REQUESTER_NOT_FOUND",
      );
    },
  );

  it(
    "returns 403 for an inactive requester",
    async () => {
      const requester =
        await prisma.requesterUser.findUniqueOrThrow({
          where: {
            email:
              "inactive-requester@toktickit.test",
          },
        });

      const res = await request(app).get(
        `/api/development-requesters/${requester.id}`,
      );

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(
        "REQUESTER_INACTIVE",
      );
    },
  );
});

describe(
  "Development Requester Context middleware",
  () => {
    const protectedApp = express();

    protectedApp.get(
      "/protected",
      requireDevelopmentRequester,
      (req: Request, res: Response) => {
        res.status(200).json({
          requester: req.developmentRequester,
        });
      },
    );

    it(
      "returns 400 when the requester header is missing",
      async () => {
        const res = await request(protectedApp).get(
          "/protected",
        );

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe(
          "INVALID_REQUESTER_CONTEXT",
        );
      },
    );

    it(
      "returns 400 when the requester header is malformed",
      async () => {
        const res = await request(protectedApp)
          .get("/protected")
          .set(
            "X-Development-Requester-Id",
            "invalid",
          );

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe(
          "INVALID_REQUESTER_CONTEXT",
        );
      },
    );

    it(
      "returns 403 for an inactive requester context",
      async () => {
        const requester =
          await prisma.requesterUser.findUniqueOrThrow({
            where: {
              email:
                "inactive-requester@toktickit.test",
            },
          });

        const res = await request(protectedApp)
          .get("/protected")
          .set(
            "X-Development-Requester-Id",
            String(requester.id),
          );

        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe(
          "REQUESTER_CONTEXT_FORBIDDEN",
        );
      },
    );

    it(
      "provides the active requester context to the next handler",
      async () => {
        const requester =
          await prisma.requesterUser.findUniqueOrThrow({
            where: {
              email: "requester1@toktickit.test",
            },
          });

        const res = await request(protectedApp)
          .get("/protected")
          .set(
            "X-Development-Requester-Id",
            String(requester.id),
          );

        expect(res.status).toBe(200);
        expect(res.body.requester).toEqual({
          id: requester.id,
          name: requester.name,
          email: requester.email,
        });
      },
    );
  },
);