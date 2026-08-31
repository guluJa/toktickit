import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import * as attachmentValidation from "../../src/attachment-validation.js";

const prisma = getPrisma();
const ownerEmail =
  "attachment-owner@toktickit.test";
const otherOwnerEmail =
  "attachment-other-owner@toktickit.test";

let uploadDirectory = "";
let originalUploadDirectory:
  | string
  | undefined;
let ownerId = 0;
let otherOwnerId = 0;
let ownedTicketId = 0;
let otherTicketId = 0;

async function removeDatabaseTestData() {
  const requesters =
    await prisma.requesterUser.findMany({
      where: {
        email: {
          in: [ownerEmail, otherOwnerEmail],
        },
      },
      select: { id: true },
    });
  const requesterIds = requesters.map(
    ({ id }) => id,
  );

  if (requesterIds.length === 0) {
    return;
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      requesterId: { in: requesterIds },
    },
    select: { id: true },
  });
  const ticketIds = tickets.map(({ id }) => id);

  if (ticketIds.length > 0) {
    await prisma.attachment.deleteMany({
      where: { ticketId: { in: ticketIds } },
    });
    await prisma.ticket.deleteMany({
      where: { id: { in: ticketIds } },
    });
  }

  await prisma.requesterUser.deleteMany({
    where: { id: { in: requesterIds } },
  });
}

async function clearAttachments() {
  if (ownedTicketId && otherTicketId) {
    await prisma.attachment.deleteMany({
      where: {
        ticketId: {
          in: [ownedTicketId, otherTicketId],
        },
      },
    });
  }

  if (uploadDirectory) {
    await fs.rm(uploadDirectory, {
      recursive: true,
      force: true,
    });
    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });
  }
}

async function uploadPdf(
  ticketId = ownedTicketId,
  requesterId = ownerId,
) {
  return request(app)
    .post(`/api/tickets/${ticketId}/attachments`)
    .set(
      "X-Development-Requester-Id",
      String(requesterId),
    )
    .attach(
      "file",
      Buffer.from("valid-pdf-content"),
      {
        filename: "evidence.pdf",
        contentType: "application/pdf",
      },
    );
}

describe("Requester-owned Attachment lifecycle", () => {
  beforeAll(async () => {
    originalUploadDirectory =
      process.env.UPLOAD_DIR;
    uploadDirectory = await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "toktickit-attachments-",
      ),
    );
    process.env.UPLOAD_DIR = uploadDirectory;

    await removeDatabaseTestData();

    const category =
      await prisma.category.findUnique({
        where: { name: "Hardware" },
      });
    const relatedSystem =
      await prisma.relatedSystem.findUnique({
        where: { name: "Campus Wi-Fi" },
      });

    if (!category || !relatedSystem) {
      throw new Error(
        "Lab 2 seed data is required before running Attachment tests.",
      );
    }

    const owner =
      await prisma.requesterUser.create({
        data: {
          name: "Attachment Test Owner",
          email: ownerEmail,
          isActive: true,
        },
      });
    const otherOwner =
      await prisma.requesterUser.create({
        data: {
          name: "Attachment Other Owner",
          email: otherOwnerEmail,
          isActive: true,
        },
      });

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;

    const ownedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-20990301-A00001",
        requesterId: ownerId,
        submissionKey:
          "98000000-0000-4000-8000-000000000001",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Attachment lifecycle test Ticket",
        requestedPriority: "MEDIUM",
        description:
          "Ticket used to verify the full Attachment lifecycle.",
      },
    });
    const otherTicket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-20990301-A00002",
        requesterId: otherOwnerId,
        submissionKey:
          "98000000-0000-4000-8000-000000000002",
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Other owner Attachment Ticket",
        requestedPriority: "LOW",
        description:
          "Ticket owned by a different Development Requester.",
      },
    });

    ownedTicketId = ownedTicket.id;
    otherTicketId = otherTicket.id;
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearAttachments();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await removeDatabaseTestData();
    await fs.rm(uploadDirectory, {
      recursive: true,
      force: true,
    });

    if (originalUploadDirectory === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR =
        originalUploadDirectory;
    }
  });

  it("uploads a permitted file and stores safe active metadata", async () => {
    const res = await request(app)
      .post(
        `/api/tickets/${ownedTicketId}/attachments`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .attach(
        "file",
        Buffer.from("png-content"),
        {
          filename: "unsafe<evidence>.png",
          contentType: "image/png",
        },
      );

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        ticketId: ownedTicketId,
        originalName: "unsafe_evidence_.png",
        mimeType: "image/png",
        sizeBytes: 11,
        state: "ACTIVE",
        removedAt: null,
        removalReason: null,
      }),
    );
    expect(res.body).not.toHaveProperty(
      "storageKey",
    );

    const stored =
      await prisma.attachment.findUniqueOrThrow({
        where: { id: res.body.id },
      });
    await expect(
      fs.readFile(
        path.join(
          uploadDirectory,
          stored.storageKey,
        ),
      ),
    ).resolves.toEqual(
      Buffer.from("png-content"),
    );
  });

  it("retrieves owned Attachment metadata without exposing storage information", async () => {
    const uploaded = await uploadPdf();

    const listResponse = await request(app)
      .get(
        `/api/tickets/${ownedTicketId}/attachments`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );
    const metadataResponse = await request(app)
      .get(
        `/api/attachments/${uploaded.body.id}`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items).toHaveLength(1);
    expect(metadataResponse.status).toBe(200);
    expect(metadataResponse.body.state).toBe(
      "ACTIVE",
    );
    expect(
      JSON.stringify({
        list: listResponse.body,
        item: metadataResponse.body,
      }),
    ).not.toMatch(/storageKey|local path|UPLOAD_DIR/i);
  });

  it("downloads an active owned Attachment with safe headers and content", async () => {
    const uploaded = await uploadPdf();

    const res = await request(app)
      .get(
        `/api/attachments/${uploaded.body.id}/download`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(
      /application\/pdf/,
    );
    expect(
      res.headers["content-disposition"],
    ).toContain("attachment");
    expect(
      Buffer.from(res.body).toString(),
    ).toBe("valid-pdf-content");
  });

  it("rejects missing, mismatched, and oversized files without metadata", async () => {
    const missingResponse = await request(app)
      .post(
        `/api/tickets/${ownedTicketId}/attachments`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );
    const mismatchResponse = await request(app)
      .post(
        `/api/tickets/${ownedTicketId}/attachments`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .attach("file", Buffer.from("bad"), {
        filename: "renamed.png",
        contentType: "application/pdf",
      });
    const oversizedResponse = await request(app)
      .post(
        `/api/tickets/${ownedTicketId}/attachments`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .attach(
        "file",
        Buffer.alloc(
          attachmentValidation.MAX_ATTACHMENT_SIZE_BYTES +
            1,
        ),
        {
          filename: "large.pdf",
          contentType: "application/pdf",
        },
      );

    expect(missingResponse.status).toBe(400);
    expect(mismatchResponse.status).toBe(415);
    expect(oversizedResponse.status).toBe(413);
    expect(
      await prisma.attachment.count({
        where: { ticketId: ownedTicketId },
      }),
    ).toBe(0);
  });

  it("rejects a sixth active Attachment", async () => {
    await prisma.attachment.createMany({
      data: Array.from(
        { length: 5 },
        (_, index) => ({
          ticketId: ownedTicketId,
          originalName: `existing-${index}.pdf`,
          storageKey: `existing-${index}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 10,
        }),
      ),
    });

    const res = await uploadPdf();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe(
      "ATTACHMENT_LIMIT_REACHED",
    );
    expect(
      await prisma.attachment.count({
        where: {
          ticketId: ownedTicketId,
          removedAt: null,
        },
      }),
    ).toBe(5);
  });

  it("soft-removes an owned Attachment, retains metadata, and blocks download", async () => {
    const uploaded = await uploadPdf();

    const invalidRemoval = await request(app)
      .delete(
        `/api/attachments/${uploaded.body.id}`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .send({ removalReason: "bad" });

    expect(invalidRemoval.status).toBe(400);
    expect(
      await prisma.attachment.findUniqueOrThrow({
        where: { id: uploaded.body.id },
        select: { removedAt: true },
      }),
    ).toEqual({ removedAt: null });

    const removeResponse = await request(app)
      .delete(
        `/api/attachments/${uploaded.body.id}`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .send({
        removalReason:
          "  Wrong screenshot attached.  ",
      });

    expect(removeResponse.status).toBe(200);
    expect(removeResponse.body).toEqual(
      expect.objectContaining({
        id: uploaded.body.id,
        state: "REMOVED",
        removedAt: expect.any(String),
        removalReason:
          "Wrong screenshot attached.",
      }),
    );

    const stored =
      await prisma.attachment.findUniqueOrThrow({
        where: { id: uploaded.body.id },
      });
    expect(stored.removedByRequesterId).toBe(
      ownerId,
    );

    const secondRemoval = await request(app)
      .delete(
        `/api/attachments/${uploaded.body.id}`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .send({
        removalReason: "Remove it again.",
      });
    const downloadResponse = await request(app)
      .get(
        `/api/attachments/${uploaded.body.id}/download`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );

    expect(secondRemoval.status).toBe(409);
    expect(downloadResponse.status).toBe(410);
  });

  it("returns the same safe 404 for missing and cross-owner resources", async () => {
    const otherUpload = await uploadPdf(
      otherTicketId,
      otherOwnerId,
    );

    const crossOwnerMetadata = await request(app)
      .get(
        `/api/attachments/${otherUpload.body.id}`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );
    const missingMetadata = await request(app)
      .get("/api/attachments/2147483647")
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );
    const crossOwnerUpload = await uploadPdf(
      otherTicketId,
      ownerId,
    );
    const missingTicketUpload = await uploadPdf(
      2147483647,
      ownerId,
    );
    const crossOwnerDownload = await request(app)
      .get(
        `/api/attachments/${otherUpload.body.id}/download`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );
    const missingDownload = await request(app)
      .get(
        "/api/attachments/2147483647/download",
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      );
    const crossOwnerRemoval = await request(app)
      .delete(
        `/api/attachments/${otherUpload.body.id}`,
      )
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .send({
        removalReason:
          "Attempted cross-owner removal.",
      });
    const missingRemoval = await request(app)
      .delete("/api/attachments/2147483647")
      .set(
        "X-Development-Requester-Id",
        String(ownerId),
      )
      .send({
        removalReason:
          "Attempted missing removal.",
      });

    expect(crossOwnerMetadata.status).toBe(404);
    expect(crossOwnerMetadata.body).toEqual(
      missingMetadata.body,
    );
    expect(crossOwnerUpload.status).toBe(404);
    expect(crossOwnerUpload.body).toEqual(
      missingTicketUpload.body,
    );
    expect(crossOwnerDownload.status).toBe(404);
    expect(crossOwnerDownload.body).toEqual(
      missingDownload.body,
    );
    expect(crossOwnerRemoval.status).toBe(404);
    expect(crossOwnerRemoval.body).toEqual(
      missingRemoval.body,
    );
  });

  it("removes a written file when metadata creation fails", async () => {
    await prisma.attachment.create({
      data: {
        ticketId: ownedTicketId,
        originalName: "existing.pdf",
        storageKey: "collision.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
      },
    });
    vi.spyOn(
      attachmentValidation,
      "generateAttachmentStorageKey",
    ).mockReturnValueOnce("collision.pdf");

    const res = await uploadPdf();

    expect(res.status).toBe(500);
    await expect(
      fs.stat(
        path.join(
          uploadDirectory,
          "collision.pdf",
        ),
      ),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(
      await prisma.attachment.count({
        where: {
          ticketId: ownedTicketId,
          storageKey: "collision.pdf",
        },
      }),
    ).toBe(1);
  });
});
