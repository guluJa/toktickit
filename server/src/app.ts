import express, { Request, Response } from "express";
import cors from "cors";
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
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
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

      const result =
        await getPrisma().$transaction(
          async (tx) => {
            const existingTicket =
              await tx.ticket.findUnique({
                where: {
                  requesterId_submissionKey: {
                    requesterId:
                      requester.id,
                    submissionKey:
                      input.submissionKey,
                  },
                },
                include:
                  ticketDetailInclude,
              });

            if (existingTicket) {
              return {
                ticket: existingTicket,
                replayed: true,
              };
            }

            const [
              category,
              relatedSystem,
            ] = await Promise.all([
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
                  id:
                    input.relatedSystemId,
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
              Object.keys(referenceErrors)
                .length > 0
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
                  requesterId:
                    requester.id,
                  submissionKey:
                    input.submissionKey,
                  categoryId:
                    input.categoryId,
                  relatedSystemId:
                    input.relatedSystemId,
                  summary: input.summary,
                  requestedPriority:
                    input.requestedPriority,
                  description:
                    input.description,
                  currentStatus: "NEW",
                },
                include:
                  ticketDetailInclude,
              });

            return {
              ticket: createdTicket,
              replayed: false,
            };
          },
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

export default app;
