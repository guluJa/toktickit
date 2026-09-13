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
} from "./requester-context.js";
import { requireRequesterAccess } from "./requester-access.js";
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
import {
  clearSessionCookie,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  parseCookieHeader,
  requireAuthenticated,
  requireNormalApplicationAccess,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  toSafeUser,
  validatePassword,
  verifyPassword,
} from "./auth.js";
import {
  isDatabaseSupportedStatus,
  parseStaffQueueQuery,
  StaffQueueQueryValidationError,
} from "./staff-queue-query.js";
import { requireStaffQueueAccess } from "./staff-access.js";
import { requireAdministratorAccess } from "./admin-access.js";
import {
  isAllowedStatusTransition,
  staffTicketDetailSelect,
  toStaffTicketDetail,
} from "./staff-ticket-detail.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = new Set(
        (process.env.CLIENT_ORIGINS ?? "http://localhost:5173")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      );

      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed."));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  }),
); // lets the Vite client read the original Attachment filename safely
app.use(express.json());

function validationResponse(
  res: Response,
  fields: Record<string, string>,
): void {
  res.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Request data is invalid.",
      fields,
    },
  });
}

function getStringField(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const email = getStringField(req.body?.email)?.toLowerCase();
  const password = req.body?.password;
  const fields: Record<string, string> = {};

  if (!email) fields.email = "Email is required.";
  if (typeof password !== "string" || password.length === 0) {
    fields.password = "Password is required.";
  }
  if (email && email.length > 254) fields.email = "Email is too long.";

  if (Object.keys(fields).length > 0) {
    validationResponse(res, fields);
    return;
  }

  try {
    const user = await getPrisma().requesterUser.findUnique({
      where: { email },
    });

    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_FAILED",
          message: "Email or password is incorrect.",
        },
      });
      return;
    }

    const token = createSessionToken();
    await getPrisma().session.create({
      data: {
        tokenHash: hashSessionToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    res.status(200).json({ data: { user: toSafeUser(user) } });
  } catch (error) {
    console.error("Unable to authenticate user:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to complete login." },
    });
  }
});

app.get("/api/auth/me", requireAuthenticated, (req: Request, res: Response) => {
  res.status(200).json({ data: { user: req.authUser } });
});

app.post("/api/auth/logout", async (req: Request, res: Response) => {
  try {
    let token: string | undefined;
    try {
      token = parseCookieHeader(req.header("Cookie")).get(SESSION_COOKIE);
    } catch {
      // Logout is intentionally idempotent, even when a stale cookie is malformed.
      token = undefined;
    }
    if (token) {
      await getPrisma().session.deleteMany({
        where: { tokenHash: hashSessionToken(token) },
      });
    }
    clearSessionCookie(res);
    res.status(200).json({ data: { loggedOut: true } });
  } catch (error) {
    console.error("Unable to logout user:", error);
    res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to complete logout." },
    });
  }
});

app.post(
  "/api/auth/change-password",
  requireAuthenticated,
  async (req: Request, res: Response) => {
    const newPassword = req.body?.newPassword;
    const confirmPassword = req.body?.confirmPassword;
    const fields: Record<string, string> = {};
    const passwordError = validatePassword(newPassword);

    if (passwordError) fields.newPassword = passwordError;
    if (typeof confirmPassword !== "string") {
      fields.confirmPassword = "Confirmation password is required.";
    } else if (newPassword !== confirmPassword) {
      fields.confirmPassword = "Passwords must match.";
    }

    if (Object.keys(fields).length > 0) {
      validationResponse(res, fields);
      return;
    }

    try {
      const user = await getPrisma().requesterUser.update({
        where: { id: req.authUser!.id },
        data: {
          passwordHash: await hashPassword(newPassword),
          mustChangePassword: false,
        },
      });

      res.status(200).json({ data: { user: toSafeUser(user) } });
    } catch (error) {
      console.error("Unable to change password:", error);
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Unable to change password." },
      });
    }
  },
);

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

const staffTicketSummarySelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  currentStatus: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  owner: {
    select: {
      id: true,
      name: true,
      role: true,
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

/** Allow attachment downloads for authenticated staff viewers while keeping
 * the Lab 2 header fixture available only to isolated regression tests. */
async function requireAttachmentViewerAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.ALLOW_LEGACY_REQUESTER_CONTEXT_TESTS === "true" &&
    !req.header("Cookie")
  ) {
    await requireRequesterAccess(req, res, next);
    return;
  }

  await requireAuthenticated(req, res, () => {
    requireNormalApplicationAccess(req, res, next);
  });
}

async function staffCanViewTicket(ticketId: number): Promise<boolean> {
  const ticket = await getPrisma().ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });
  return Boolean(ticket);
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
                itPriority: input.requestedPriority,
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
  "/api/staff/tickets",
  requireStaffQueueAccess,
  async (req: Request, res: Response) => {
    try {
      const query = parseStaffQueueQuery(req.query as Record<string, unknown>);
      const prisma = getPrisma();

      // The Lab 3 contract accepts the complete lifecycle vocabulary. Until a
      // later status migration expands Prisma's enum, unsupported values are
      // valid filters that simply produce no rows rather than a database error.
      if (!isDatabaseSupportedStatus(query.status)) {
        const totalPages = 0;
        if (query.page > 1) {
          res.status(400).json({ error: { code: "PAGE_OUT_OF_RANGE", message: "The requested page is outside the available result pages." } });
          return;
        }
        res.status(200).json({ data: { items: [], pagination: { page: query.page, pageSize: query.pageSize, totalItems: 0, totalPages } } });
        return;
      }

      const where: Prisma.TicketWhereInput = {
        ...(query.search ? { OR: [
          { ticketNumber: { contains: query.search, mode: "insensitive" } },
          { summary: { contains: query.search, mode: "insensitive" } },
        ] } : {}),
        ...(query.status ? { currentStatus: query.status } : {}),
        ...(query.requestedPriority ? { requestedPriority: query.requestedPriority } : {}),
        ...(query.itPriority ? { itPriority: query.itPriority } : {}),
        ...(query.ownerId !== undefined ? { ownerId: query.ownerId === "unassigned" ? null : query.ownerId } : {}),
      };
      const primaryOrder = { [query.sortBy]: query.sortOrder } as Prisma.TicketOrderByWithRelationInput;
      const [items, totalItems] = await prisma.$transaction([
        prisma.ticket.findMany({
          where,
          select: staffTicketSummarySelect,
          orderBy: [primaryOrder, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        prisma.ticket.count({ where }),
      ]);
      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
      if (totalItems > 0 && query.page > totalPages) {
        res.status(400).json({ error: { code: "PAGE_OUT_OF_RANGE", message: "The requested page is outside the available result pages." } });
        return;
      }
      res.status(200).json({ data: { items, pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages } } });
    } catch (error) {
      if (error instanceof StaffQueueQueryValidationError) {
        res.status(400).json({ error: { code: "INVALID_QUERY", message: error.message, fields: error.fields } });
        return;
      }
      console.error("Unable to load Staff Ticket Queue:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load the Staff Ticket Queue." } });
    }
  },
);

async function loadStaffTicketDetail(ticketId: number) {
  return getPrisma().ticket.findUnique({
    where: { id: ticketId },
    select: staffTicketDetailSelect,
  });
}

function requireItStaffRole(req: Request, res: Response): boolean {
  if (req.authUser?.role === "IT_STAFF") return true;
  res.status(403).json({ error: { code: "ROLE_FORBIDDEN", message: "This operation is not available for the current role." } });
  return false;
}

function parseStaffTicketId(req: Request, res: Response): number | null {
  const ticketId = parsePositiveInteger(req.params.ticketId);
  if (ticketId !== null) return ticketId;
  res.status(400).json({ error: { code: "INVALID_ID", message: "ticketId must be a positive integer." } });
  return null;
}

function staffTicketResponse(ticket: Awaited<ReturnType<typeof loadStaffTicketDetail>>) {
  if (!ticket) return null;
  const detail = toStaffTicketDetail(ticket);
  return { ticket: detail, comments: detail.comments, internalNotes: detail.internalNotes };
}

app.get("/api/staff/tickets/:ticketId", requireStaffQueueAccess, async (req: Request, res: Response) => {
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  try {
    const response = staffTicketResponse(await loadStaffTicketDetail(ticketId));
    if (!response) { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    res.status(200).json({ data: response });
  } catch (error) {
    console.error("Unable to load Staff Ticket Detail:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load the Staff Ticket Detail." } });
  }
});

app.post("/api/staff/tickets/:ticketId/assignment", requireStaffQueueAccess, async (req: Request, res: Response) => {
  if (!requireItStaffRole(req, res)) return;
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  const ownerId = req.body?.ownerId;
  if (!(ownerId === null || (typeof ownerId === "number" && Number.isSafeInteger(ownerId) && ownerId > 0))) {
    validationResponse(res, { ownerId: "ownerId must be a positive integer or null." });
    return;
  }
  try {
    const ticket = await loadStaffTicketDetail(ticketId);
    if (!ticket) { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    if (ownerId !== null) {
      const owner = await getPrisma().requesterUser.findFirst({ where: { id: ownerId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
      if (!owner) { res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found." } }); return; }
    }
    const updated = await getPrisma().ticket.update({ where: { id: ticketId }, data: { ownerId }, select: staffTicketDetailSelect });
    res.status(200).json({ data: { ticket: toStaffTicketDetail(updated) } });
  } catch (error) {
    console.error("Unable to update Ticket ownership:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update Ticket ownership." } });
  }
});

app.patch("/api/staff/tickets/:ticketId/priority", requireStaffQueueAccess, async (req: Request, res: Response) => {
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  const itPriority = req.body?.itPriority;
  if (!["LOW", "MEDIUM", "HIGH"].includes(itPriority)) { validationResponse(res, { itPriority: "itPriority must be LOW, MEDIUM, or HIGH." }); return; }
  try {
    const updated = await getPrisma().ticket.update({ where: { id: ticketId }, data: { itPriority }, select: staffTicketDetailSelect });
    res.status(200).json({ data: { ticket: toStaffTicketDetail(updated) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    console.error("Unable to update IT Priority:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update IT Priority." } });
  }
});

app.patch("/api/staff/tickets/:ticketId/status", requireStaffQueueAccess, async (req: Request, res: Response) => {
  if (!requireItStaffRole(req, res)) return;
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  const nextStatus = req.body?.status;
  const validStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
  if (!validStatuses.includes(nextStatus)) { validationResponse(res, { status: "status is invalid." }); return; }
  try {
    const current = await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { currentStatus: true } });
    if (!current) { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    if (!isAllowedStatusTransition(current.currentStatus, nextStatus)) { res.status(409).json({ error: { code: "STATUS_TRANSITION_NOT_ALLOWED", message: "The requested status transition is not allowed." } }); return; }
    const updated = await getPrisma().ticket.update({ where: { id: ticketId }, data: { currentStatus: nextStatus }, select: staffTicketDetailSelect });
    res.status(200).json({ data: { ticket: toStaffTicketDetail(updated) } });
  } catch (error) {
    console.error("Unable to update Ticket status:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update Ticket status." } });
  }
});

async function staffTicketExists(ticketId: number): Promise<boolean> {
  return Boolean(await getPrisma().ticket.findUnique({ where: { id: ticketId }, select: { id: true } }));
}

app.get("/api/staff/tickets/:ticketId/comments", requireStaffQueueAccess, async (req: Request, res: Response) => {
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  try {
    if (!(await staffTicketExists(ticketId))) { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    const items = await getPrisma().comment.findMany({ where: { ticketId }, select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    res.status(200).json({ data: { items } });
  } catch (error) { console.error("Unable to load Staff Public Comments:", error); res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load Public Comments." } }); }
});

app.post("/api/staff/tickets/:ticketId/comments", requireStaffQueueAccess, async (req: Request, res: Response) => {
  if (!requireItStaffRole(req, res)) return;
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  const content = getStringField(req.body?.content) ?? "";
  if (!content || content.length > 5000) { validationResponse(res, { content: "Content must be 1-5000 characters." }); return; }
  try {
    if (!(await staffTicketExists(ticketId))) { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    const comment = await getPrisma().comment.create({ data: { ticketId, authorId: req.authUser!.id, content }, select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } } });
    res.status(201).json({ data: { comment } });
  } catch (error) { console.error("Unable to create Staff Public Comment:", error); res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to create Public Comment." } }); }
});

app.get("/api/staff/tickets/:ticketId/notes", requireStaffQueueAccess, async (req: Request, res: Response) => {
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  try {
    if (!(await staffTicketExists(ticketId))) { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    const items = await getPrisma().internalNote.findMany({ where: { ticketId }, select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    res.status(200).json({ data: { items } });
  } catch (error) { console.error("Unable to load Internal Notes:", error); res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load Internal Notes." } }); }
});

app.post("/api/staff/tickets/:ticketId/notes", requireStaffQueueAccess, async (req: Request, res: Response) => {
  if (!requireItStaffRole(req, res)) return;
  const ticketId = parseStaffTicketId(req, res);
  if (ticketId === null) return;
  const content = getStringField(req.body?.content) ?? "";
  if (!content || content.length > 5000) { validationResponse(res, { content: "Content must be 1-5000 characters." }); return; }
  try {
    if (!(await staffTicketExists(ticketId))) { res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }); return; }
    const note = await getPrisma().internalNote.create({ data: { ticketId, authorId: req.authUser!.id, content }, select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } } });
    res.status(201).json({ data: { note } });
  } catch (error) { console.error("Unable to create Internal Note:", error); res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to create Internal Note." } }); }
});

// ---------------------------------------------------------------------------
// Administrator User Management
// ---------------------------------------------------------------------------
const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
} satisfies Prisma.RequesterUserSelect;

const adminRoles = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
type AdminRole = (typeof adminRoles)[number];

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (adminRoles as readonly string[]).includes(value);
}

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getSingleQueryValue(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  return value;
}

class AdminUsersQueryValidationError extends Error {}

function parseAdminUsersQuery(raw: Record<string, unknown>): {
  search?: string;
  role?: AdminRole;
  isActive?: boolean;
  page: number;
  pageSize: number;
} {
  const allowed = new Set(["search", "role", "isActive", "page", "pageSize"]);
  const unknown = Object.keys(raw).find((key) => !allowed.has(key));
  if (unknown) throw new AdminUsersQueryValidationError(`Unknown query parameter: ${unknown}`);

  const search = getSingleQueryValue(raw.search);
  const role = getSingleQueryValue(raw.role);
  const isActive = getSingleQueryValue(raw.isActive);
  const pageValue = getSingleQueryValue(raw.page);
  const pageSizeValue = getSingleQueryValue(raw.pageSize);
  if (search === null || role === null || isActive === null || pageValue === null || pageSizeValue === null) {
    throw new AdminUsersQueryValidationError("Query parameters must be provided once as strings.");
  }
  if (search !== undefined && (search.trim().length === 0 || search.trim().length > 254)) {
    throw new AdminUsersQueryValidationError("search must contain 1-254 characters when provided.");
  }
  if (role !== undefined && !isAdminRole(role)) throw new AdminUsersQueryValidationError("role is invalid.");
  if (isActive !== undefined && isActive !== "true" && isActive !== "false") throw new AdminUsersQueryValidationError("isActive must be true or false.");

  const page = pageValue === undefined ? 1 : Number(pageValue);
  const pageSize = pageSizeValue === undefined ? 20 : Number(pageSizeValue);
  if (!Number.isInteger(page) || page < 1) throw new AdminUsersQueryValidationError("page must be a positive integer.");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new AdminUsersQueryValidationError("pageSize must be an integer from 1 to 100.");

  return {
    ...(search !== undefined ? { search: search.trim() } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
    page,
    pageSize,
  };
}

function requestBodyKeysAreAllowed(body: unknown, allowed: readonly string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return Object.keys(body).every((key) => allowed.includes(key));
}

function duplicateEmailError(res: Response): void {
  res.status(409).json({
    error: { code: "DUPLICATE_EMAIL", message: "A user with that email already exists." },
  });
}

function userNotFoundError(res: Response): void {
  res.status(404).json({
    error: { code: "USER_NOT_FOUND", message: "User not found." },
  });
}

function userUpdateConflict(res: Response, message: string): void {
  res.status(409).json({ error: { code: "USER_UPDATE_CONFLICT", message } });
}

class AdminUserNotFoundError extends Error {}
class AdminUserConflictError extends Error {}
class AdminDuplicateEmailError extends Error {}

// Serialize Administrator role/activation changes so the last-active-admin
// invariant is checked and committed atomically across concurrent requests.
const ADMINISTRATOR_GUARD_LOCK = 735391;

app.get("/api/admin/users", requireAdministratorAccess, async (req: Request, res: Response) => {
  try {
    const query = parseAdminUsersQuery(req.query as Record<string, unknown>);
    const where: Prisma.RequesterUserWhereInput = {
      ...(query.search ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };
    const prisma = getPrisma();
    const [items, totalItems] = await prisma.$transaction([
      prisma.requesterUser.findMany({
        where,
        select: adminUserSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.requesterUser.count({ where }),
    ]);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
    if (totalItems > 0 && query.page > totalPages) {
      res.status(400).json({ error: { code: "PAGE_OUT_OF_RANGE", message: "The requested page is outside the available result pages." } });
      return;
    }
    res.status(200).json({ data: { items, pagination: { page: query.page, pageSize: query.pageSize, totalItems, totalPages } } });
  } catch (error) {
    if (error instanceof AdminUsersQueryValidationError) {
      res.status(400).json({ error: { code: "INVALID_QUERY", message: error.message } });
      return;
    }
    console.error("Unable to load Administrator users:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load users." } });
  }
});

app.post("/api/admin/users", requireAdministratorAccess, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  if (!requestBodyKeysAreAllowed(body, ["name", "email", "role", "isActive", "initialPassword"])) fields.form = "Only supported user fields may be provided.";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.role;
  const isActive = body?.isActive;
  const initialPassword = body?.initialPassword;
  if (name.length < 1 || name.length > 150) fields.name = "Name must contain 1-150 characters.";
  if (!isEmail(email)) fields.email = "Email must be a valid address of at most 254 characters.";
  if (!isAdminRole(role)) fields.role = "Role is invalid.";
  if (typeof isActive !== "boolean") fields.isActive = "isActive must be a Boolean.";
  const passwordError = validatePassword(initialPassword);
  if (passwordError) fields.initialPassword = passwordError;
  if (Object.keys(fields).length > 0) { validationResponse(res, fields); return; }

  try {
    const prisma = getPrisma();
    const existing = await prisma.requesterUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (existing) { duplicateEmailError(res); return; }
    const user = await prisma.requesterUser.create({
      data: { name, email, role: role as AdminRole, isActive: isActive as boolean, passwordHash: await hashPassword(initialPassword as string), mustChangePassword: true },
      select: adminUserSelect,
    });
    res.status(201).json({ data: { user } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { duplicateEmailError(res); return; }
    console.error("Unable to create Administrator user:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to create user." } });
  }
});

app.patch("/api/admin/users/:userId", requireAdministratorAccess, async (req: Request, res: Response) => {
  const userId = parsePositiveInteger(req.params.userId);
  if (userId === null) { res.status(400).json({ error: { code: "INVALID_ID", message: "userId must be a positive integer." } }); return; }
  const body = req.body as Record<string, unknown>;
  const allowed = ["name", "email", "role", "isActive"] as const;
  const fields: Record<string, string> = {};
  if (!requestBodyKeysAreAllowed(body, allowed)) fields.form = "Only name, email, role, and isActive may be updated.";
  if (Object.keys(body ?? {}).length === 0) fields.form = "At least one field is required.";
  const data: { name?: string; email?: string; role?: AdminRole; isActive?: boolean } = {};
  if (body?.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 1 || body.name.trim().length > 150) fields.name = "Name must contain 1-150 characters.";
    else data.name = body.name.trim();
  }
  if (body?.email !== undefined) {
    if (typeof body.email !== "string" || !isEmail(body.email.trim().toLowerCase())) fields.email = "Email must be a valid address of at most 254 characters.";
    else data.email = body.email.trim().toLowerCase();
  }
  if (body?.role !== undefined) {
    if (!isAdminRole(body.role)) fields.role = "Role is invalid.";
    else data.role = body.role;
  }
  if (body?.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") fields.isActive = "isActive must be a Boolean.";
    else data.isActive = body.isActive;
  }
  if (Object.keys(fields).length > 0) { validationResponse(res, fields); return; }

  try {
    const prisma = getPrisma();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMINISTRATOR_GUARD_LOCK})`;
      const current = await tx.requesterUser.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
      if (!current) throw new AdminUserNotFoundError();
      if (data.email) {
        const duplicate = await tx.requesterUser.findFirst({ where: { email: { equals: data.email, mode: "insensitive" }, NOT: { id: userId } }, select: { id: true } });
        if (duplicate) throw new AdminDuplicateEmailError();
      }
      const nextRole = data.role ?? current.role;
      const nextActive = data.isActive ?? current.isActive;
      const removesActiveAdministrator = current.role === "ADMINISTRATOR" && current.isActive && !(nextRole === "ADMINISTRATOR" && nextActive);
      if (req.authUser?.id === userId && !nextActive) throw new AdminUserConflictError("An Administrator cannot deactivate their own account.");
      if (removesActiveAdministrator) {
        const activeAdministrators = await tx.requesterUser.count({ where: { role: "ADMINISTRATOR", isActive: true } });
        if (activeAdministrators <= 1) throw new AdminUserConflictError("At least one active Administrator must remain.");
      }
      const user = await tx.requesterUser.update({ where: { id: userId }, data, select: adminUserSelect });
      if (current.isActive && !nextActive) await tx.session.deleteMany({ where: { userId } });
      return user;
    });
    res.status(200).json({ data: { user: updated } });
  } catch (error) {
    if (error instanceof AdminUserNotFoundError) { userNotFoundError(res); return; }
    if (error instanceof AdminDuplicateEmailError) { duplicateEmailError(res); return; }
    if (error instanceof AdminUserConflictError) { userUpdateConflict(res, error.message); return; }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") { duplicateEmailError(res); return; }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") { userNotFoundError(res); return; }
    console.error("Unable to update Administrator user:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update user." } });
  }
});

app.post("/api/admin/users/:userId/initial-password", requireAdministratorAccess, async (req: Request, res: Response) => {
  const userId = parsePositiveInteger(req.params.userId);
  if (userId === null) { res.status(400).json({ error: { code: "INVALID_ID", message: "userId must be a positive integer." } }); return; }
  const body = req.body as Record<string, unknown>;
  const fields: Record<string, string> = {};
  if (!requestBodyKeysAreAllowed(body, ["initialPassword"])) fields.form = "Only initialPassword may be provided.";
  const passwordError = validatePassword(body?.initialPassword);
  if (passwordError) fields.initialPassword = passwordError;
  if (Object.keys(fields).length > 0) { validationResponse(res, fields); return; }
  try {
    const prisma = getPrisma();
    const existing = await prisma.requesterUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!existing) { userNotFoundError(res); return; }
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.requesterUser.update({ where: { id: userId }, data: { passwordHash: await hashPassword(body.initialPassword as string), mustChangePassword: true }, select: adminUserSelect });
      await tx.session.deleteMany({ where: { userId } });
      return updated;
    });
    res.status(200).json({ data: { user } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") { userNotFoundError(res); return; }
    console.error("Unable to reset initial password:", error);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to reset the initial password." } });
  }
});

app.get(
  "/api/tickets",
  requireRequesterAccess,
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
  requireRequesterAccess,
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
            itPriority: true,
            description: true,
            currentStatus: true,
            requesterResolvedAt: true,
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
            comments: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                author: { select: { id: true, name: true } },
              },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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
  requireRequesterAccess,
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
  requireRequesterAccess,
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
  requireRequesterAccess,
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
  requireAttachmentViewerAccess,
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

      const isStaffViewer = req.authUser?.role === "IT_STAFF" || req.authUser?.role === "ADMINISTRATOR";
      const attachment = isStaffViewer
        ? await getPrisma().attachment.findUnique({
            where: { id: attachmentId },
            select: {
              ...attachmentStorageSelect,
            },
          })
        : await getPrisma().attachment.findFirst({
            where: {
              id: attachmentId,
              ticket: {
                requesterId: req.authUser?.role === "REQUESTER"
                  ? req.authUser.id
                  : req.developmentRequester?.id ?? -1,
              },
            },
            select: attachmentStorageSelect,
          });

      if (!attachment) throw new AttachmentResourceNotFoundError();

      if (isStaffViewer && !(await staffCanViewTicket(attachment.ticketId))) {
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
  requireRequesterAccess,
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
  requireRequesterAccess,
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
            itPriority: ticket.itPriority,
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

app.get(
  "/api/tickets/:ticketId/comments",
  requireRequesterAccess,
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInteger(req.params.ticketId);
    if (ticketId === null) {
      res.status(400).json({ error: { code: "INVALID_TICKET_ID", message: "ticketId must be a positive integer." } });
      return;
    }
    const requesterId = req.authUser?.id;
    if (!requesterId) return;
    try {
      const ticket = await getPrisma().ticket.findFirst({
        where: { id: ticketId, requesterId },
        select: { id: true },
      });
      if (!ticket) {
        res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } });
        return;
      }
      const comments = await getPrisma().comment.findMany({
        where: { ticketId },
        select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      res.status(200).json({ data: { items: comments.map((comment) => ({ id: comment.id, author: comment.author, content: comment.content, createdAt: comment.createdAt })) } });
    } catch (error) {
      console.error("Unable to load Public Comments:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load Public Comments." } });
    }
  },
);

app.post(
  "/api/tickets/:ticketId/comments",
  requireRequesterAccess,
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInteger(req.params.ticketId);
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (ticketId === null) {
      res.status(400).json({ error: { code: "INVALID_TICKET_ID", message: "ticketId must be a positive integer." } });
      return;
    }
    if (!content || content.length > 5000) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request data is invalid.", fields: { content: "Content must be 1-5000 characters." } } });
      return;
    }
    const requesterId = req.authUser?.id;
    if (!requesterId) return;
    try {
      const ticket = await getPrisma().ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } });
      if (!ticket) {
        res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } });
        return;
      }
      const comment = await getPrisma().comment.create({
        data: { ticketId, authorId: requesterId, content },
        select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } },
      });
      res.status(201).json({ data: { comment: { id: comment.id, author: comment.author, content: comment.content, createdAt: comment.createdAt } } });
    } catch (error) {
      console.error("Unable to create Public Comment:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to create Public Comment." } });
    }
  },
);

app.post(
  "/api/tickets/:ticketId/resolved",
  requireRequesterAccess,
  async (req: Request, res: Response) => {
    const ticketId = parsePositiveInteger(req.params.ticketId);
    if (ticketId === null) {
      res.status(400).json({ error: { code: "INVALID_TICKET_ID", message: "ticketId must be a positive integer." } });
      return;
    }
    const requesterId = req.authUser?.id;
    if (!requesterId) return;
    try {
      const updated = await getPrisma().ticket.updateMany({
        where: { id: ticketId, requesterId },
        data: { requesterResolvedAt: new Date() },
      });
      if (updated.count !== 1) {
        res.status(404).json({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } });
        return;
      }
      const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { id: true, requesterResolvedAt: true, currentStatus: true } });
      res.status(200).json({ data: { resolved: true, requesterResolvedAt: ticket.requesterResolvedAt, currentStatus: ticket.currentStatus } });
    } catch (error) {
      console.error("Unable to mark Ticket resolved:", error);
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to update the Ticket." } });
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
