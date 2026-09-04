import fs from "node:fs/promises";
import path from "node:path";
import express, {
  NextFunction,
  Request,
  Response,
} from "express";
import cors from "cors";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import {
  parsePositiveInteger,
  requireDevelopmentRequester,
} from "./requester-context.js";
import {
  generateTicketNumber,
} from "./ticket-number.js";
import {
  TicketInputValidationError,
  validateAndNormalizeTicketInput,
} from "./ticket-validation.js";
import {
  parseTicketListQuery,
  TicketListQueryValidationError,
} from "./ticket-list-query.js";
import {
  AttachmentValidationError,
  generateAttachmentStorageKey,
  MAX_ATTACHMENT_SIZE_BYTES,
  validateAttachment,
  validateRemovalReason,
} from "./attachment-validation.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(
  cors({
    exposedHeaders: ["Content-Disposition"],
  }),
); // lets the Vite client read the original Attachment filename safely
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // TODO(Issue 2): replace this stub with the required 200 response.
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
// TODO(Issue 4): implement the route here.
// ---------------------------------------------------------------------------

app.get(
  "/api/categories",
  async (_req: Request, res: Response) => {
    try {
      const categories =
        await getPrisma().category.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: [
            {
              name: "asc",
            },
            {
              id: "asc",
            },
          ],
        });

      res.status(200).json(categories);
    } catch (error) {
      console.error(
        "Unable to load request categories:",
        error,
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to load request categories.",
        },
      });
    }
  },
);

app.get(
  "/api/related-systems",
  async (_req: Request, res: Response) => {
    try {
      const relatedSystems =
        await getPrisma().relatedSystem.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy: [
            {
              name: "asc",
            },
            {
              id: "asc",
            },
          ],
        });

      res.status(200).json(relatedSystems);
    } catch (error) {
      console.error(
        "Unable to load related systems:",
        error,
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to load related systems.",
        },
      });
    }
  },
);

app.get(
  "/api/development-requesters",
  async (_req: Request, res: Response) => {
    try {
      const requesters =
        await getPrisma().requesterUser.findMany({
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
          orderBy: [
            {
              name: "asc",
            },
            {
              id: "asc",
            },
          ],
        });

      res.status(200).json(requesters);
    } catch (error) {
      console.error(
        "Unable to load development requesters:",
        error,
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to load development requesters.",
        },
      });
    }
  },
);

app.get(
  "/api/development-requesters/:requesterId",
  async (req: Request, res: Response) => {
    const requesterId = parsePositiveInteger(
      req.params.requesterId,
    );

    if (requesterId === null) {
      res.status(400).json({
        error: {
          code: "INVALID_REQUESTER_ID",
          message:
            "Requester ID must be a positive integer.",
        },
      });
      return;
    }

    try {
      const requester =
        await getPrisma().requesterUser.findUnique({
          where: {
            id: requesterId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        });

      if (!requester) {
        res.status(404).json({
          error: {
            code: "REQUESTER_NOT_FOUND",
            message:
              "Development requester was not found.",
          },
        });
        return;
      }

      if (!requester.isActive) {
        res.status(403).json({
          error: {
            code: "REQUESTER_INACTIVE",
            message:
              "The development requester is inactive.",
          },
        });
        return;
      }

      res.status(200).json({
        id: requester.id,
        name: requester.name,
        email: requester.email,
      });
    } catch (error) {
      console.error(
        "Unable to validate development requester:",
        error,
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to validate the development requester.",
        },
      });
    }
  },
);

const ticketDetailInclude = {
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  relatedSystem: {
    select: {
      id: true,
      name: true,
    },
  },
  attachments: {
    select: {
      id: true,
      ticketId: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
      removedAt: true,
      removalReason: true,
    },
    orderBy: [
      {
        uploadedAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  },
} satisfies Prisma.TicketInclude;

const ticketSummarySelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  requestedPriority: true,
  currentStatus: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  relatedSystem: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TicketSelect;

const attachmentMetadataSelect = {
  id: true,
  ticketId: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  uploadedAt: true,
  removedAt: true,
  removalReason: true,
} satisfies Prisma.AttachmentSelect;

const attachmentStorageSelect = {
  ...attachmentMetadataSelect,
  storageKey: true,
} satisfies Prisma.AttachmentSelect;

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
  },
});

class AttachmentResourceNotFoundError extends Error {
  constructor(
    public readonly code:
      | "TICKET_NOT_FOUND"
      | "ATTACHMENT_NOT_FOUND" =
      "ATTACHMENT_NOT_FOUND",
  ) {
    super(
      code === "TICKET_NOT_FOUND"
        ? "Ticket not found."
        : "Attachment not found.",
    );
    this.name = "AttachmentResourceNotFoundError";
  }
}

class AttachmentAlreadyRemovedError extends Error {
  constructor() {
    super("Attachment is already removed.");
    this.name = "AttachmentAlreadyRemovedError";
  }
}

function getUploadDirectory(): string {
  return path.resolve(
    process.env.UPLOAD_DIR ??
      path.join(process.cwd(), "uploads"),
  );
}

function resolveStoragePath(
  storageKey: string,
): string {
  const uploadDirectory = getUploadDirectory();
  const storagePath = path.resolve(
    uploadDirectory,
    storageKey,
  );

  if (path.dirname(storagePath) !== uploadDirectory) {
    throw new Error("Invalid Attachment storage key.");
  }

  return storagePath;
}

function toAttachmentMetadata<
  T extends {
    removedAt: Date | null;
  },
>(attachment: T) {
  return {
    ...attachment,
    state: attachment.removedAt
      ? ("REMOVED" as const)
      : ("ACTIVE" as const),
  };
}

function sendAttachmentError(
  res: Response,
  error: unknown,
): boolean {
  if (error instanceof AttachmentValidationError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        fields: error.fields,
      },
    });
    return true;
  }

  if (
    error instanceof
    AttachmentResourceNotFoundError
  ) {
    res.status(404).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return true;
  }

  if (
    error instanceof AttachmentAlreadyRemovedError
  ) {
    res.status(409).json({
      error: {
        code: "ATTACHMENT_ALREADY_REMOVED",
        message:
          "The Attachment has already been removed.",
      },
    });
    return true;
  }

  return false;
}

const MAX_TICKET_NUMBER_ATTEMPTS = 3;

class TicketNumberAllocationError extends Error {
  constructor() {
    super(
      "Unable to allocate a unique Ticket Number.",
    );
    this.name = "TicketNumberAllocationError";
  }
}

function isUniqueConstraintError(
  error: unknown,
  expectedFields: string[],
): boolean {
  if (
    !(
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.map(String)
    : target
      ? [String(target)]
      : [];

  return expectedFields.every((expected) =>
    fields.some((field) =>
      field.includes(expected),
    ),
  );
}

async function createOrReplayTicket(
  requesterId: number,
  input: ReturnType<
    typeof validateAndNormalizeTicketInput
  >,
) {
  const prisma = getPrisma();

  for (
    let attempt = 1;
    attempt <= MAX_TICKET_NUMBER_ATTEMPTS;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existingTicket =
            await tx.ticket.findUnique({
              where: {
                requesterId_submissionKey: {
                  requesterId,
                  submissionKey:
                    input.submissionKey,
                },
              },
              include: ticketDetailInclude,
            });

          if (existingTicket) {
            return {
              ticket: existingTicket,
              replayed: true,
            };
          }

          const [category, relatedSystem] =
            await Promise.all([
              tx.category.findFirst({
                where: {
                  id: input.categoryId,
                  isActive: true,
                },
                select: {
                  id: true,
                  name: true,
                },
              }),
              tx.relatedSystem.findFirst({
                where: {
                  id: input.relatedSystemId,
                  isActive: true,
                },
                select: {
                  id: true,
                  name: true,
                },
              }),
            ]);

          const referenceErrors: Record<
            string,
            string
          > = {};

          if (!category) {
            referenceErrors.categoryId =
              "The selected Category is unavailable.";
          }

          if (!relatedSystem) {
            referenceErrors.relatedSystemId =
              "The selected Related System is unavailable.";
          }

          if (
            Object.keys(referenceErrors).length >
            0
          ) {
            throw new TicketInputValidationError(
              referenceErrors,
            );
          }

          const createdTicket =
            await tx.ticket.create({
              data: {
                ticketNumber:
                  generateTicketNumber(),
                requesterId,
                submissionKey:
                  input.submissionKey,
                categoryId: input.categoryId,
                relatedSystemId:
                  input.relatedSystemId,
                summary: input.summary,
                requestedPriority:
                  input.requestedPriority,
                description: input.description,
                currentStatus: "NEW",
              },
              include: ticketDetailInclude,
            });

          return {
            ticket: createdTicket,
            replayed: false,
          };
        },
      );
    } catch (error) {
      if (
        isUniqueConstraintError(error, [
          "requesterId",
          "submissionKey",
        ])
      ) {
        const replayedTicket =
          await prisma.ticket.findUnique({
            where: {
              requesterId_submissionKey: {
                requesterId,
                submissionKey:
                  input.submissionKey,
              },
            },
            include: ticketDetailInclude,
          });

        if (replayedTicket) {
          return {
            ticket: replayedTicket,
            replayed: true,
          };
        }
      }

      if (
        isUniqueConstraintError(error, [
          "ticketNumber",
        ])
      ) {
        if (
          attempt < MAX_TICKET_NUMBER_ATTEMPTS
        ) {
          continue;
        }

        throw new TicketNumberAllocationError();
      }

      throw error;
    }
  }

  throw new TicketNumberAllocationError();
}

app.get(
  "/api/tickets",
  requireDevelopmentRequester,
  async (req: Request, res: Response) => {
    try {
      const requester =
        req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const query = parseTicketListQuery(
        req.query as Record<string, unknown>,
      );

      const ownerWhere: Prisma.TicketWhereInput = {
        requesterId: requester.id,
      };

      const filteredWhere: Prisma.TicketWhereInput = {
        requesterId: requester.id,
        ...(query.search
          ? {
              OR: [
                {
                  ticketNumber: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
                {
                  summary: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        ...(query.categoryId
          ? { categoryId: query.categoryId }
          : {}),
        ...(query.relatedSystemId
          ? {
              relatedSystemId:
                query.relatedSystemId,
            }
          : {}),
        ...(query.requestedPriority
          ? {
              requestedPriority:
                query.requestedPriority,
            }
          : {}),
        ...(query.currentStatus
          ? {
              currentStatus:
                query.currentStatus,
            }
          : {}),
      };

      const primaryOrder = {
        [query.sortBy]: query.sortDirection,
      } as Prisma.TicketOrderByWithRelationInput;

      const prisma = getPrisma();
      const [
        items,
        totalOwnedItems,
        totalItems,
      ] = await prisma.$transaction([
        prisma.ticket.findMany({
          where: filteredWhere,
          select: ticketSummarySelect,
          orderBy: [
            primaryOrder,
            { id: "desc" },
          ],
          skip:
            (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        prisma.ticket.count({
          where: ownerWhere,
        }),
        prisma.ticket.count({
          where: filteredWhere,
        }),
      ]);

      res.status(200).json({
        items,
        page: query.page,
        pageSize: query.pageSize,
        totalOwnedItems,
        totalItems,
        totalPages:
          totalItems === 0
            ? 0
            : Math.ceil(
                totalItems / query.pageSize,
              ),
      });
    } catch (error) {
      if (
        error instanceof
        TicketListQueryValidationError
      ) {
        res.status(400).json({
          error: {
            code:
              "INVALID_TICKET_LIST_QUERY",
            message:
              "One or more Ticket list query parameters are invalid.",
            fields: error.fields,
          },
        });
        return;
      }

      console.error(
        "Unable to load Tickets:",
        error,
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to load Tickets.",
        },
      });
    }
  },
);

app.get(
  "/api/tickets/:ticketId",
  requireDevelopmentRequester,
  async (req: Request, res: Response) => {
    try {
      const ticketId = parsePositiveInteger(
        req.params.ticketId,
      );

      if (ticketId === null) {
        res.status(400).json({
          error: {
            code: "INVALID_TICKET_ID",
            message:
              "ticketId must be a positive integer.",
          },
        });
        return;
      }

      const requester =
        req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const ticket =
        await getPrisma().ticket.findFirst({
          where: {
            id: ticketId,
            requesterId: requester.id,
          },
          select: {
            id: true,
            ticketNumber: true,
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            relatedSystem: {
              select: {
                id: true,
                name: true,
              },
            },
            summary: true,
            requestedPriority: true,
            description: true,
            currentStatus: true,
            createdAt: true,
            updatedAt: true,
            attachments: {
              select: {
                id: true,
                ticketId: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                uploadedAt: true,
                removedAt: true,
                removalReason: true,
              },
              orderBy: [
                { uploadedAt: "asc" },
                { id: "asc" },
              ],
            },
          },
        });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      res.status(200).json({
        ...ticket,
        attachments: ticket.attachments.map(
          (attachment) => ({
            ...attachment,
            state: attachment.removedAt
              ? "REMOVED"
              : "ACTIVE",
          }),
        ),
      });
    } catch (error) {
      console.error(
        "Unable to load Ticket Detail:",
        error,
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to load the Ticket.",
        },
      });
    }
  },
);

app.post(
  "/api/tickets/:ticketId/attachments",
  requireDevelopmentRequester,
  attachmentUpload.single("file"),
  async (req: Request, res: Response) => {
    let writtenStoragePath: string | null = null;

    try {
      const ticketId = parsePositiveInteger(
        req.params.ticketId,
      );

      if (ticketId === null) {
        res.status(400).json({
          error: {
            code: "INVALID_TICKET_ID",
            message:
              "ticketId must be a positive integer.",
          },
        });
        return;
      }

      const requester = req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const file = req.file;
      const attachment =
        await getPrisma().$transaction(
          async (tx) => {
            await tx.$queryRaw`
              SELECT pg_advisory_xact_lock(${ticketId})::text AS lock
            `;

            const ticket =
              await tx.ticket.findFirst({
                where: {
                  id: ticketId,
                  requesterId: requester.id,
                },
                select: { id: true },
              });

            if (!ticket) {
              throw new AttachmentResourceNotFoundError(
                "TICKET_NOT_FOUND",
              );
            }

            const activeAttachmentCount =
              await tx.attachment.count({
                where: {
                  ticketId,
                  removedAt: null,
                },
              });

            const validated =
              validateAttachment(
                file,
                activeAttachmentCount,
              );
            const storageKey =
              generateAttachmentStorageKey(
                validated.extension,
              );
            const storagePath =
              resolveStoragePath(storageKey);

            await fs.mkdir(getUploadDirectory(), {
              recursive: true,
            });
            await fs.writeFile(
              storagePath,
              file!.buffer,
              { flag: "wx" },
            );
            writtenStoragePath = storagePath;

            return tx.attachment.create({
              data: {
                ticketId,
                originalName:
                  validated.originalName,
                storageKey,
                mimeType: validated.mimeType,
                sizeBytes: validated.sizeBytes,
              },
              select: attachmentMetadataSelect,
            });
          },
        );

      res
        .status(201)
        .json(toAttachmentMetadata(attachment));
    } catch (error) {
      if (writtenStoragePath) {
        await fs.unlink(writtenStoragePath).catch(
          () => undefined,
        );
      }

      if (sendAttachmentError(res, error)) {
        return;
      }

      console.error(
        "Unable to upload Attachment:",
        error,
      );
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to upload the Attachment.",
        },
      });
    }
  },
);

app.get(
  "/api/tickets/:ticketId/attachments",
  requireDevelopmentRequester,
  async (req: Request, res: Response) => {
    try {
      const ticketId = parsePositiveInteger(
        req.params.ticketId,
      );

      if (ticketId === null) {
        res.status(400).json({
          error: {
            code: "INVALID_TICKET_ID",
            message:
              "ticketId must be a positive integer.",
          },
        });
        return;
      }

      const requester = req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const ticket =
        await getPrisma().ticket.findFirst({
          where: {
            id: ticketId,
            requesterId: requester.id,
          },
          select: { id: true },
        });

      if (!ticket) {
        throw new AttachmentResourceNotFoundError(
          "TICKET_NOT_FOUND",
        );
      }

      const attachments =
        await getPrisma().attachment.findMany({
          where: { ticketId },
          select: attachmentMetadataSelect,
          orderBy: [
            { uploadedAt: "asc" },
            { id: "asc" },
          ],
        });

      res.status(200).json({
        items: attachments.map(
          toAttachmentMetadata,
        ),
      });
    } catch (error) {
      if (sendAttachmentError(res, error)) {
        return;
      }

      console.error(
        "Unable to load Attachments:",
        error,
      );
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to load Attachments.",
        },
      });
    }
  },
);

app.get(
  "/api/attachments/:attachmentId",
  requireDevelopmentRequester,
  async (req: Request, res: Response) => {
    try {
      const attachmentId = parsePositiveInteger(
        req.params.attachmentId,
      );

      if (attachmentId === null) {
        res.status(400).json({
          error: {
            code: "INVALID_ATTACHMENT_ID",
            message:
              "attachmentId must be a positive integer.",
          },
        });
        return;
      }

      const requester = req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const attachment =
        await getPrisma().attachment.findFirst({
          where: {
            id: attachmentId,
            ticket: {
              requesterId: requester.id,
            },
          },
          select: attachmentMetadataSelect,
        });

      if (!attachment) {
        throw new AttachmentResourceNotFoundError();
      }

      res
        .status(200)
        .json(toAttachmentMetadata(attachment));
    } catch (error) {
      if (sendAttachmentError(res, error)) {
        return;
      }

      console.error(
        "Unable to load Attachment metadata:",
        error,
      );
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to load the Attachment.",
        },
      });
    }
  },
);

app.get(
  "/api/attachments/:attachmentId/download",
  requireDevelopmentRequester,
  async (req: Request, res: Response) => {
    try {
      const attachmentId = parsePositiveInteger(
        req.params.attachmentId,
      );

      if (attachmentId === null) {
        res.status(400).json({
          error: {
            code: "INVALID_ATTACHMENT_ID",
            message:
              "attachmentId must be a positive integer.",
          },
        });
        return;
      }

      const requester = req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const attachment =
        await getPrisma().attachment.findFirst({
          where: {
            id: attachmentId,
            ticket: {
              requesterId: requester.id,
            },
          },
          select: attachmentStorageSelect,
        });

      if (!attachment) {
        throw new AttachmentResourceNotFoundError();
      }

      if (attachment.removedAt) {
        res.status(410).json({
          error: {
            code: "ATTACHMENT_REMOVED",
            message:
              "The Attachment is no longer available for download.",
          },
        });
        return;
      }

      const content = await fs.readFile(
        resolveStoragePath(
          attachment.storageKey,
        ),
      );

      res.attachment(attachment.originalName);
      res.setHeader(
        "Content-Type",
        attachment.mimeType,
      );
      res.status(200).send(content);
    } catch (error) {
      if (sendAttachmentError(res, error)) {
        return;
      }

      console.error(
        "Unable to download Attachment:",
        error,
      );
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to download the Attachment.",
        },
      });
    }
  },
);

app.delete(
  "/api/attachments/:attachmentId",
  requireDevelopmentRequester,
  async (req: Request, res: Response) => {
    try {
      const attachmentId = parsePositiveInteger(
        req.params.attachmentId,
      );

      if (attachmentId === null) {
        res.status(400).json({
          error: {
            code: "INVALID_ATTACHMENT_ID",
            message:
              "attachmentId must be a positive integer.",
          },
        });
        return;
      }

      const requester = req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const removalReason = validateRemovalReason(
        req.body?.removalReason,
      );

      const attachment =
        await getPrisma().$transaction(
          async (tx) => {
            const ownedAttachment =
              await tx.attachment.findFirst({
                where: {
                  id: attachmentId,
                  ticket: {
                    requesterId:
                      requester.id,
                  },
                },
                select: {
                  id: true,
                  removedAt: true,
                },
              });

            if (!ownedAttachment) {
              throw new AttachmentResourceNotFoundError();
            }

            if (ownedAttachment.removedAt) {
              throw new AttachmentAlreadyRemovedError();
            }

            const update =
              await tx.attachment.updateMany({
                where: {
                  id: attachmentId,
                  removedAt: null,
                },
                data: {
                  removedAt: new Date(),
                  removalReason,
                  removedByRequesterId:
                    requester.id,
                },
              });

            if (update.count !== 1) {
              throw new AttachmentAlreadyRemovedError();
            }

            return tx.attachment.findUniqueOrThrow({
              where: { id: attachmentId },
              select: attachmentMetadataSelect,
            });
          },
        );

      res
        .status(200)
        .json(toAttachmentMetadata(attachment));
    } catch (error) {
      if (sendAttachmentError(res, error)) {
        return;
      }

      console.error(
        "Unable to remove Attachment:",
        error,
      );
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to remove the Attachment.",
        },
      });
    }
  },
);

app.post(
  "/api/tickets",
  requireDevelopmentRequester,
  async (req: Request, res: Response) => {
    try {
      const input =
        validateAndNormalizeTicketInput(
          req.body,
        );

      const requester =
        req.developmentRequester;

      if (!requester) {
        res.status(403).json({
          error: {
            code:
              "REQUESTER_CONTEXT_FORBIDDEN",
            message:
              "The development requester is unavailable.",
          },
        });
        return;
      }

      const result = await createOrReplayTicket(
        requester.id,
        input,
      );

      const ticket = result.ticket;

      res
        .status(result.replayed ? 200 : 201)
        .json({
          ticket: {
            id: ticket.id,
            ticketNumber:
              ticket.ticketNumber,
            requester: ticket.requester,
            category: ticket.category,
            relatedSystem:
              ticket.relatedSystem,
            summary: ticket.summary,
            requestedPriority:
              ticket.requestedPriority,
            description:
              ticket.description,
            currentStatus:
              ticket.currentStatus,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            attachments:
              ticket.attachments,
          },
          replayed: result.replayed,
        });
    } catch (error) {
      if (
        error instanceof
        TicketInputValidationError
      ) {
        res.status(400).json({
          error: {
            code: error.code,
            message:
              "Request data is invalid.",
            fields:
              error.fieldErrors,
          },
        });
        return;
      }

      if (
        error instanceof
        TicketNumberAllocationError
      ) {
        res.status(409).json({
          error: {
            code:
              "TICKET_NUMBER_CONFLICT",
            message:
              "Unable to allocate a unique Ticket Number. Please retry.",
          },
        });
        return;
      }

      console.error(
        "Unable to create Ticket:",
        error,
      );

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            "Unable to create the Ticket.",
        },
      });
    }
  },
);

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: {
            code: "ATTACHMENT_TOO_LARGE",
            message:
              "The Attachment exceeds the 5 MB limit.",
            fields: {
              file:
                "The file must not exceed 5 MB.",
            },
          },
        });
        return;
      }

      res.status(400).json({
        error: {
          code: "INVALID_ATTACHMENT_UPLOAD",
          message:
            "The Attachment upload is invalid.",
        },
      });
      return;
    }

    next(error);
  },
);

export default app;
