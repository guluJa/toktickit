import {
  RequestedPriority,
} from "@prisma/client";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

const ownerEmail =
  "my-tickets-owner@toktickit.test";
const otherOwnerEmail =
  "my-tickets-other-owner@toktickit.test";
const ticketNumberPrefix = "TKT-20990101-B";

let ownerId = 0;
let otherOwnerId = 0;
let hardwareCategoryId = 0;
let accountCategoryId = 0;
let wifiSystemId = 0;
let emailSystemId = 0;
let ownedTicketIds: number[] = [];

describe("GET /api/tickets", () => {
  beforeAll(async () => {
    const [hardware, account, wifi, email] =
      await Promise.all([
        prisma.category.findUnique({
          where: { name: "Hardware" },
        }),
        prisma.category.findUnique({
          where: {
            name: "Account and Access",
          },
        }),
        prisma.relatedSystem.findUnique({
          where: { name: "Campus Wi-Fi" },
        }),
        prisma.relatedSystem.findUnique({
          where: { name: "Email" },
        }),
      ]);

    if (!hardware || !account || !wifi || !email) {
      throw new Error(
        "Lab 2 seed data is required before running My Tickets tests.",
      );
    }

    hardwareCategoryId = hardware.id;
    accountCategoryId = account.id;
    wifiSystemId = wifi.id;
    emailSystemId = email.id;

    const owner =
      await prisma.requesterUser.upsert({
        where: { email: ownerEmail },
        update: {
          name: "My Tickets Test Owner",
          isActive: true,
        },
        create: {
          name: "My Tickets Test Owner",
          email: ownerEmail,
          isActive: true,
        },
      });

    const otherOwner =
      await prisma.requesterUser.upsert({
        where: { email: otherOwnerEmail },
        update: {
          name: "My Tickets Other Owner",
          isActive: true,
        },
        create: {
          name: "My Tickets Other Owner",
          email: otherOwnerEmail,
          isActive: true,
        },
      });

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    await prisma.ticket.deleteMany({
      where: {
        requesterId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    for (let index = 0; index < 12; index += 1) {
      const sequence = index + 1;
      const isAlphaTicket =
        index === 0 || index === 2;
      const usesHardware = index % 2 === 0;
      const timestamp = new Date(
        Date.UTC(2099, 0, sequence, 8, 0, 0),
      );

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `${ticketNumberPrefix}${sequence
            .toString(16)
            .toUpperCase()
            .padStart(5, "0")}`,
          requesterId: ownerId,
          submissionKey:
            `95000000-0000-4000-8000-${sequence
              .toString()
              .padStart(12, "0")}`,
          categoryId: usesHardware
            ? hardwareCategoryId
            : accountCategoryId,
          relatedSystemId: usesHardware
            ? wifiSystemId
            : emailSystemId,
          summary: isAlphaTicket
            ? `Alpha requester issue ${sequence}`
            : `Requester list test ${sequence}`,
          requestedPriority:
            index === 0
              ? RequestedPriority.HIGH
              : index === 1
                ? RequestedPriority.LOW
                : RequestedPriority.MEDIUM,
          description:
            `My Tickets API test description ${sequence}.`,
          currentStatus: "NEW",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      ownedTicketIds.push(ticket.id);
    }

    await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-20990101-C00001",
        requesterId: otherOwnerId,
        submissionKey:
          "96000000-0000-4000-8000-000000000001",
        categoryId: hardwareCategoryId,
        relatedSystemId: wifiSystemId,
        summary: "Other requester private ticket",
        requestedPriority:
          RequestedPriority.HIGH,
        description:
          "This Ticket must not be returned to the test owner.",
        currentStatus: "NEW",
        createdAt: new Date(
          "2099-01-20T08:00:00.000Z",
        ),
        updatedAt: new Date(
          "2099-01-20T08:00:00.000Z",
        ),
      },
    });
  });

  it(
    "returns a safe 400 response when the requester context header is missing",
    async () => {
      const res = await request(app).get(
        "/api/tickets",
      );

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_REQUESTER_CONTEXT",
          message: expect.any(String),
        },
      });
    },
  );

  it(
    "returns a safe 400 response when the requester context header is malformed",
    async () => {
      const res = await request(app)
        .get("/api/tickets")
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
    "returns a safe 403 response for an unknown positive requester context",
    async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set(
          "X-Development-Requester-Id",
          "2147483647",
        );

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: {
          code: "REQUESTER_CONTEXT_FORBIDDEN",
          message:
            "The development requester is unavailable.",
        },
      });
      expect(JSON.stringify(res.body)).not.toMatch(
        /password|DATABASE_URL|stack|Prisma|SQL/i,
      );
    },
  );

  afterAll(async () => {
    if (ownerId && otherOwnerId) {
      await prisma.ticket.deleteMany({
        where: {
          requesterId: {
            in: [ownerId, otherOwnerId],
          },
        },
      });

      await prisma.requesterUser.deleteMany({
        where: {
          id: {
            in: [ownerId, otherOwnerId],
          },
        },
      });
    }
  });

  it(
    "returns only Tickets owned by the current requester using the default stable order",
    async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        page: 1,
        pageSize: 10,
        totalOwnedItems: 12,
        totalItems: 12,
        totalPages: 2,
      });
      expect(res.body.items).toHaveLength(10);

      const returnedIds = res.body.items.map(
        (ticket: { id: number }) => ticket.id,
      );

      expect(returnedIds).toEqual(
        [...ownedTicketIds].reverse().slice(0, 10),
      );
      expect(
        returnedIds.every((id: number) =>
          ownedTicketIds.includes(id),
        ),
      ).toBe(true);

      for (const ticket of res.body.items) {
        expect(ticket).toMatchObject({
          id: expect.any(Number),
          ticketNumber: expect.any(String),
          summary: expect.any(String),
          category: {
            id: expect.any(Number),
            name: expect.any(String),
          },
          relatedSystem: {
            id: expect.any(Number),
            name: expect.any(String),
          },
          requestedPriority:
            expect.any(String),
          currentStatus: "NEW",
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      }
    },
  );

  it(
    "applies trimmed case-insensitive search, filters, and requested stable sorting",
    async () => {
      const res = await request(app)
        .get("/api/tickets")
        .query({
          search: "  ALPHA  ",
          categoryId: hardwareCategoryId,
          relatedSystemId: wifiSystemId,
          currentStatus: "NEW",
          sortBy: "ticketNumber",
          sortDirection: "asc",
          page: 1,
          pageSize: 10,
        })
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        page: 1,
        pageSize: 10,
        totalOwnedItems: 12,
        totalItems: 2,
        totalPages: 1,
      });
      expect(
        res.body.items.map(
          (ticket: { ticketNumber: string }) =>
            ticket.ticketNumber,
        ),
      ).toEqual([
        "TKT-20990101-B00001",
        "TKT-20990101-B00003",
      ]);

      const priorityRes = await request(app)
        .get("/api/tickets")
        .query({ requestedPriority: "HIGH" })
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(priorityRes.status).toBe(200);
      expect(priorityRes.body.totalItems).toBe(1);
      expect(
        priorityRes.body.items[0]
          .requestedPriority,
      ).toBe("HIGH");
    },
  );

  it(
    "returns correct pagination metadata and an empty items array for a page past the result range",
    async () => {
      const secondPage = await request(app)
        .get("/api/tickets")
        .query({ page: 2, pageSize: 10 })
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(secondPage.status).toBe(200);
      expect(secondPage.body).toMatchObject({
        page: 2,
        pageSize: 10,
        totalOwnedItems: 12,
        totalItems: 12,
        totalPages: 2,
      });
      expect(secondPage.body.items).toHaveLength(2);

      const pastRange = await request(app)
        .get("/api/tickets")
        .query({ page: 3, pageSize: 10 })
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(pastRange.status).toBe(200);
      expect(pastRange.body).toMatchObject({
        items: [],
        page: 3,
        pageSize: 10,
        totalOwnedItems: 12,
        totalItems: 12,
        totalPages: 2,
      });
    },
  );

  it(
    "returns a safe 500 response when the Ticket query fails unexpectedly",
    async () => {
      const findManySpy = vi
        .spyOn(prisma.ticket, "findMany")
        .mockRejectedValueOnce(
          new Error(
            "Private SQL and database password details",
          ),
        );

      try {
        const res = await request(app)
          .get("/api/tickets")
          .set(
            "X-Development-Requester-Id",
            String(ownerId),
          );

        expect(res.status).toBe(500);
        expect(res.body.error).toEqual({
          code: "INTERNAL_ERROR",
          message: expect.any(String),
        });
        expect(JSON.stringify(res.body)).not.toMatch(
          /password|DATABASE_URL|stack|Prisma|SQL/i,
        );
      } finally {
        findManySpy.mockRestore();
      }
    },
  );

  it.each([
    ["search", "x".repeat(101)],
    ["categoryId", "0"],
    ["relatedSystemId", "invalid"],
    ["requestedPriority", "URGENT"],
    ["currentStatus", "CLOSED"],
    ["sortBy", "summary"],
    ["sortDirection", "sideways"],
    ["page", "0"],
    ["pageSize", "25"],
  ])(
    "returns a safe 400 response for invalid %s query",
    async (parameter, value) => {
      const res = await request(app)
        .get("/api/tickets")
        .query({ [parameter]: value })
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(res.status).toBe(400);
      expect(res.body.error).toEqual({
        code: "INVALID_TICKET_LIST_QUERY",
        message: expect.any(String),
        fields: expect.objectContaining({
          [parameter]: expect.any(String),
        }),
      });
      expect(JSON.stringify(res.body)).not.toMatch(
        /password|DATABASE_URL|stack|Prisma|SQL/i,
      );
    },
  );
});
