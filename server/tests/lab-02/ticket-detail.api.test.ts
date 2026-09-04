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
  "ticket-detail-owner@toktickit.test";
const otherOwnerEmail =
  "ticket-detail-other-owner@toktickit.test";
const inactiveRequesterEmail =
  "ticket-detail-inactive@toktickit.test";

let ownerId = 0;
let otherOwnerId = 0;
let inactiveRequesterId = 0;
let ownedTicketId = 0;
let otherOwnerTicketId = 0;
let categoryId = 0;
let relatedSystemId = 0;

async function removeTestData() {
  const testRequesters =
    await prisma.requesterUser.findMany({
      where: {
        email: {
          in: [
            ownerEmail,
            otherOwnerEmail,
            inactiveRequesterEmail,
          ],
        },
      },
      select: {
        id: true,
      },
    });

  const requesterIds = testRequesters.map(
    (requester) => requester.id,
  );

  if (requesterIds.length === 0) {
    return;
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      requesterId: {
        in: requesterIds,
      },
    },
    select: {
      id: true,
    },
  });

  const ticketIds = tickets.map(
    (ticket) => ticket.id,
  );

  if (ticketIds.length > 0) {
    await prisma.attachment.deleteMany({
      where: {
        ticketId: {
          in: ticketIds,
        },
      },
    });

    await prisma.ticket.deleteMany({
      where: {
        id: {
          in: ticketIds,
        },
      },
    });
  }

  await prisma.requesterUser.deleteMany({
    where: {
      id: {
        in: requesterIds,
      },
    },
  });
}

describe("GET /api/tickets/:ticketId", () => {
  beforeAll(async () => {
    await removeTestData();

    const category =
      await prisma.category.findUnique({
        where: {
          name: "Hardware",
        },
      });

    const relatedSystem =
      await prisma.relatedSystem.findUnique({
        where: {
          name: "Campus Wi-Fi",
        },
      });

    if (!category || !relatedSystem) {
      throw new Error(
        "Lab 2 seed data is required before running Ticket Detail tests.",
      );
    }

    categoryId = category.id;
    relatedSystemId = relatedSystem.id;

    const owner =
      await prisma.requesterUser.create({
        data: {
          name: "Ticket Detail Test Owner",
          email: ownerEmail,
          isActive: true,
        },
      });

    const otherOwner =
      await prisma.requesterUser.create({
        data: {
          name:
            "Ticket Detail Other Test Owner",
          email: otherOwnerEmail,
          isActive: true,
        },
      });

    const inactiveRequester =
      await prisma.requesterUser.create({
        data: {
          name:
            "Ticket Detail Inactive Requester",
          email: inactiveRequesterEmail,
          isActive: false,
        },
      });

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;
    inactiveRequesterId =
      inactiveRequester.id;

    const ownedTicket =
      await prisma.ticket.create({
        data: {
          ticketNumber:
            "TKT-20990201-D00001",
          requesterId: ownerId,
          submissionKey:
            "97000000-0000-4000-8000-000000000001",
          categoryId,
          relatedSystemId,
          summary:
            "Laptop cannot connect to campus Wi-Fi",
          requestedPriority: "HIGH",
          description:
            "The requester cannot connect to the campus wireless network.",
          currentStatus: "NEW",
          createdAt: new Date(
            "2099-02-01T08:00:00.000Z",
          ),
          updatedAt: new Date(
            "2099-02-01T09:00:00.000Z",
          ),
        },
      });

    const otherOwnerTicket =
      await prisma.ticket.create({
        data: {
          ticketNumber:
            "TKT-20990201-D00002",
          requesterId: otherOwnerId,
          submissionKey:
            "97000000-0000-4000-8000-000000000002",
          categoryId,
          relatedSystemId,
          summary:
            "Private Ticket owned by another requester",
          requestedPriority: "MEDIUM",
          description:
            "This Ticket must not be exposed to another requester.",
          currentStatus: "NEW",
        },
      });

    ownedTicketId = ownedTicket.id;
    otherOwnerTicketId =
      otherOwnerTicket.id;

    await prisma.attachment.createMany({
      data: [
        {
          ticketId: ownedTicketId,
          originalName: "wifi-error.png",
          storageKey:
            "ticket-detail-test-active.png",
          mimeType: "image/png",
          sizeBytes: 245760,
          uploadedAt: new Date(
            "2099-02-01T08:10:00.000Z",
          ),
        },
        {
          ticketId: ownedTicketId,
          originalName: "old-log.pdf",
          storageKey:
            "ticket-detail-test-removed.pdf",
          mimeType: "application/pdf",
          sizeBytes: 102400,
          uploadedAt: new Date(
            "2099-02-01T08:20:00.000Z",
          ),
          removedAt: new Date(
            "2099-02-01T08:30:00.000Z",
          ),
          removalReason:
            "The attachment is no longer relevant.",
          removedByRequesterId: ownerId,
        },
      ],
    });
  });

  afterAll(async () => {
    await removeTestData();
  });

  it(
    "returns complete read-only Ticket Detail and Attachment metadata for the owner",
    async () => {
      const res = await request(app)
        .get(`/api/tickets/${ownedTicketId}`)
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(res.status).toBe(200);

      expect(res.body).toMatchObject({
        id: ownedTicketId,
        ticketNumber:
          "TKT-20990201-D00001",
        requester: {
          id: ownerId,
          name: "Ticket Detail Test Owner",
          email: ownerEmail,
        },
        category: {
          id: categoryId,
          name: "Hardware",
        },
        relatedSystem: {
          id: relatedSystemId,
          name: "Campus Wi-Fi",
        },
        summary:
          "Laptop cannot connect to campus Wi-Fi",
        requestedPriority: "HIGH",
        description:
          "The requester cannot connect to the campus wireless network.",
        currentStatus: "NEW",
        createdAt:
          "2099-02-01T08:00:00.000Z",
        updatedAt:
          "2099-02-01T09:00:00.000Z",
      });

      expect(res.body.attachments).toHaveLength(
        2,
      );

      expect(res.body.attachments[0]).toMatchObject({
        ticketId: ownedTicketId,
        originalName: "wifi-error.png",
        mimeType: "image/png",
        sizeBytes: 245760,
        state: "ACTIVE",
        uploadedAt:
          "2099-02-01T08:10:00.000Z",
        removedAt: null,
        removalReason: null,
      });

      expect(res.body.attachments[1]).toMatchObject({
        ticketId: ownedTicketId,
        originalName: "old-log.pdf",
        mimeType: "application/pdf",
        sizeBytes: 102400,
        state: "REMOVED",
        uploadedAt:
          "2099-02-01T08:20:00.000Z",
        removedAt:
          "2099-02-01T08:30:00.000Z",
        removalReason:
          "The attachment is no longer relevant.",
      });

      expect(
        JSON.stringify(res.body),
      ).not.toMatch(
        /storageKey|removedByRequesterId|password|DATABASE_URL|stack|Prisma|SQL/i,
      );
    },
  );

  it.each([
    "0",
    "-1",
    "invalid",
    "1.5",
    "9007199254740992",
  ])(
    "returns a safe 400 response for invalid ticketId %s",
    async (ticketId) => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      expect(res.status).toBe(400);
      expect(res.body.error).toEqual({
        code: "INVALID_TICKET_ID",
        message: expect.any(String),
      });
    },
  );

  it(
    "returns a safe 400 response when the requester header is missing",
    async () => {
      const res = await request(app).get(
        `/api/tickets/${ownedTicketId}`,
      );

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(
        "INVALID_REQUESTER_CONTEXT",
      );
    },
  );

  it(
    "returns a safe 400 response when the requester header is malformed",
    async () => {
      const res = await request(app)
        .get(`/api/tickets/${ownedTicketId}`)
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
    "returns a safe 403 response for an unknown requester",
    async () => {
      const res = await request(app)
        .get(`/api/tickets/${ownedTicketId}`)
        .set(
          "X-Development-Requester-Id",
          "2147483647",
        );

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(
        "REQUESTER_CONTEXT_FORBIDDEN",
      );
    },
  );

  it(
    "returns a safe 403 response for an inactive requester",
    async () => {
      const res = await request(app)
        .get(`/api/tickets/${ownedTicketId}`)
        .set(
          "X-Development-Requester-Id",
          String(inactiveRequesterId),
        );

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(
        "REQUESTER_CONTEXT_FORBIDDEN",
      );
    },
  );

  it(
    "returns the same safe 404 response for a missing and cross-owner Ticket",
    async () => {
      const missingResponse = await request(app)
        .get("/api/tickets/2147483647")
        .set(
          "X-Development-Requester-Id",
          String(ownerId),
        );

      const crossOwnerResponse =
        await request(app)
          .get(
            `/api/tickets/${otherOwnerTicketId}`,
          )
          .set(
            "X-Development-Requester-Id",
            String(ownerId),
          );

      expect(missingResponse.status).toBe(404);
      expect(crossOwnerResponse.status).toBe(
        404,
      );
      expect(crossOwnerResponse.body).toEqual(
        missingResponse.body,
      );
      expect(missingResponse.body.error).toEqual({
        code: "TICKET_NOT_FOUND",
        message: expect.any(String),
      });

      expect(
        JSON.stringify(crossOwnerResponse.body),
      ).not.toMatch(
        /Private Ticket|other requester|ownerId|requesterId/i,
      );
    },
  );

  it(
    "returns a safe 500 response when the Ticket Detail query fails unexpectedly",
    async () => {
      const findFirstSpy = vi
        .spyOn(prisma.ticket, "findFirst")
        .mockRejectedValueOnce(
          new Error(
            "Private SQL, local path, and database password details",
          ),
        );

      try {
        const res = await request(app)
          .get(`/api/tickets/${ownedTicketId}`)
          .set(
            "X-Development-Requester-Id",
            String(ownerId),
          );

        expect(res.status).toBe(500);
        expect(res.body.error).toEqual({
          code: "INTERNAL_ERROR",
          message: expect.any(String),
        });

        expect(
          JSON.stringify(res.body),
        ).not.toMatch(
          /password|DATABASE_URL|stack|Prisma|SQL|local path/i,
        );
      } finally {
        findFirstSpy.mockRestore();
      }
    },
  );
});