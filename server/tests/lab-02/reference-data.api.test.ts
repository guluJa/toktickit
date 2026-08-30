import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

const inactiveCategoryName =
  "__Lab 2 inactive category test__";

const inactiveSystemName =
  "__Lab 2 inactive system test__";

describe("Lab 2 reference data API", () => {
  beforeAll(async () => {
    await prisma.category.upsert({
      where: {
        name: inactiveCategoryName,
      },
      update: {
        isActive: false,
      },
      create: {
        name: inactiveCategoryName,
        isActive: false,
      },
    });

    await prisma.relatedSystem.upsert({
      where: {
        name: inactiveSystemName,
      },
      update: {
        description:
          "Inactive test record",
        isActive: false,
      },
      create: {
        name: inactiveSystemName,
        description:
          "Inactive test record",
        isActive: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.category.deleteMany({
      where: {
        name: inactiveCategoryName,
      },
    });

    await prisma.relatedSystem.deleteMany({
      where: {
        name: inactiveSystemName,
      },
    });
  });

  it(
    "returns only active categories in deterministic name and ID order",
    async () => {
      const res = await request(app).get(
        "/api/categories",
      );

      expect(res.status).toBe(200);

      expect(
        res.body.map(
          (category: {
            name: string;
          }) => category.name,
        ),
      ).toEqual([
        "Account and Access",
        "Hardware",
        "Network",
        "Software",
      ]);

      expect(
        res.body.some(
          (category: {
            name: string;
          }) =>
            category.name ===
            inactiveCategoryName,
        ),
      ).toBe(false);

      for (const category of res.body) {
        expect(category).toEqual({
          id: expect.any(Number),
          name: expect.any(String),
        });
      }
    },
  );

  it(
    "returns only active related systems in deterministic name and ID order",
    async () => {
      const res = await request(app).get(
        "/api/related-systems",
      );

      expect(res.status).toBe(200);

      expect(
        res.body.map(
          (system: {
            name: string;
          }) => system.name,
        ),
      ).toEqual([
        "Campus Wi-Fi",
        "Corporate Laptop",
        "Email",
        "Grade Submission App",
        "LEB2 App",
        "Printer",
        "VPN",
      ]);

      expect(
        res.body.some(
          (system: {
            name: string;
          }) =>
            system.name === inactiveSystemName,
        ),
      ).toBe(false);

      for (const system of res.body) {
        expect(system).toEqual({
          id: expect.any(Number),
          name: expect.any(String),
          description:
            expect.any(String),
        });
      }
    },
  );
});