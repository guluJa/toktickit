import type { Express, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { toSafeUser } from "./auth.js";
import { requireRequesterAccess } from "./requester-access.js";
import { requireStaffQueueAccess } from "./staff-access.js";
import { getPrisma } from "./prisma.js";
import { ActionValidationError, MAX_DATABASE_INTEGER, parseActionFields } from "./action-validation.js";
import { lockTicketMutation } from "./ticket-mutation.js";

const actionInclude = {
  performedBy: true,
  ticket: { include: { owner: true } },
} as const;
type ActionWithUsers = Prisma.ActionTakenGetPayload<{ include: typeof actionInclude }>;

function toActionResponse(action: ActionWithUsers) {
  return {
    id: action.id, ticketId: action.ticketId, actionAt: action.actionAt.toISOString(),
    description: action.description, result: action.result,
    performedBy: toSafeUser(action.performedBy),
    followUpRequired: action.followUpRequired, followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    ticketOwner: action.ticket.owner ? toSafeUser(action.ticket.owner) : null,
    createdAt: action.createdAt.toISOString(), updatedAt: action.updatedAt.toISOString(),
    version: action.version,
  };
}

function errorResponse(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}

function positiveInteger(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const number = Number(value);
  return Number.isInteger(number) && number <= MAX_DATABASE_INTEGER ? number : null;
}

function ticketId(req: Request, res: Response): number | null {
  const id = positiveInteger(req.params.ticketId);
  if (id === null) errorResponse(res, 400, "VALIDATION_ERROR", "ticketId must be a positive integer.");
  return id;
}

function pagination(req: Request, res: Response): { page: number; pageSize: number } | null {
  const page = req.query.page === undefined ? 1 : positiveInteger(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 20 : positiveInteger(req.query.pageSize);
  if (page === null || pageSize === null || pageSize > 100 ||
      (page !== null && pageSize !== null && (page - 1) * pageSize > 2_147_483_647) ||
      Object.keys(req.query).some((key) => key !== "page" && key !== "pageSize")) {
    errorResponse(res, 400, "VALIDATION_ERROR", "page and pageSize must be positive integers; pageSize must be at most 100.");
    return null;
  }
  return { page, pageSize };
}

async function listActions(req: Request, res: Response, requester: boolean): Promise<void> {
  const id = ticketId(req, res);
  if (id === null) return;
  const query = pagination(req, res);
  if (!query) return;
  try {
    const prisma = getPrisma();
    const whereTicket = requester
      ? { id, requesterId: req.developmentRequester?.id ?? -1 }
      : { id };
    const ticket = await prisma.ticket.findFirst({ where: whereTicket, select: { id: true } });
    if (!ticket) {
      errorResponse(res, 404, "TICKET_NOT_FOUND", "Ticket not found.");
      return;
    }
    const [totalItems, items] = await prisma.$transaction([
      prisma.actionTaken.count({ where: { ticketId: id } }),
      prisma.actionTaken.findMany({
        where: { ticketId: id }, include: actionInclude,
        orderBy: [{ actionAt: "asc" }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize, take: query.pageSize,
      }),
    ]);
    res.status(200).json({ data: {
      items: items.map(toActionResponse),
      pagination: { ...query, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) },
    } });
  } catch (error) {
    console.error("Unable to list Actions Taken:", error);
    errorResponse(res, 500, "INTERNAL_ERROR", "Unable to load Actions Taken.");
  }
}

function handleMutationError(error: unknown, res: Response): void {
  if (error instanceof ActionValidationError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Request data is invalid.", fields: error.fields } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2028"].includes(error.code)) {
    errorResponse(res, 409, "ACTION_STATE_CONFLICT", "The Ticket changed while saving. Refresh and retry.");
    return;
  }
  console.error("Unable to save Action Taken:", error);
  errorResponse(res, 500, "INTERNAL_ERROR", "Unable to save Action Taken.");
}

export function registerActionTakenRoutes(app: Express): void {
  app.get("/api/tickets/:ticketId/actions", requireRequesterAccess, async (req, res) => {
    await listActions(req, res, true);
  });
  app.get("/api/staff/tickets/:ticketId/actions", requireStaffQueueAccess, async (req, res) => {
    await listActions(req, res, false);
  });
  app.post("/api/staff/tickets/:ticketId/actions", requireStaffQueueAccess, async (req, res) => {
    const id = ticketId(req, res);
    if (id === null) return;
    try {
      const fields = parseActionFields(req.body);
      const performerId = req.authUser?.id;
      if (!performerId) {
        errorResponse(res, 401, "AUTHENTICATION_REQUIRED", "Authentication is required.");
        return;
      }
      const result = await getPrisma().$transaction(async (tx) => {
        await lockTicketMutation(tx, id);
        const ticket = await tx.ticket.findUnique({ where: { id }, select: { currentStatus: true } });
        if (!ticket) return { kind: "missing" as const };
        if (ticket.currentStatus === "CLOSED" || ticket.currentStatus === "CANCELLED") {
          return { kind: "state" as const };
        }
        const action = await tx.actionTaken.create({
          data: { ticketId: id, performedById: performerId, actionAt: new Date(), ...fields },
          include: actionInclude,
        });
        return { kind: "created" as const, action };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
      if (result.kind === "missing") errorResponse(res, 404, "TICKET_NOT_FOUND", "Ticket not found.");
      else if (result.kind === "state") errorResponse(res, 409, "ACTION_STATE_CONFLICT", "Actions cannot be changed in this Ticket state.");
      else res.status(201).json({ data: { action: toActionResponse(result.action) } });
    } catch (error) { handleMutationError(error, res); }
  });
  app.patch("/api/staff/tickets/:ticketId/actions/:actionId", requireStaffQueueAccess, async (req, res) => {
    const id = ticketId(req, res);
    if (id === null) return;
    const actionId = positiveInteger(req.params.actionId);
    if (actionId === null) {
      errorResponse(res, 400, "VALIDATION_ERROR", "actionId must be a positive integer.");
      return;
    }
    try {
      const result = await getPrisma().$transaction(async (tx) => {
        await lockTicketMutation(tx, id);
        const ticket = await tx.ticket.findUnique({ where: { id }, select: { currentStatus: true } });
        if (!ticket) return { kind: "missingTicket" as const };
        const current = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId: id } });
        if (!current) return { kind: "missingAction" as const };
        const fields = parseActionFields(req.body, current);
        if (ticket.currentStatus === "CLOSED" || ticket.currentStatus === "CANCELLED") {
          return { kind: "state" as const };
        }
        const updated = await tx.actionTaken.updateMany({
          where: { id: actionId, ticketId: id, version: fields.version },
          data: {
            description: fields.description, result: fields.result,
            followUpRequired: fields.followUpRequired, followUpNote: fields.followUpNote,
            attachmentNotes: fields.attachmentNotes, version: { increment: 1 }, updatedAt: new Date(),
          },
        });
        if (!updated.count) return { kind: "stale" as const };
        const action = await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, include: actionInclude });
        return { kind: "updated" as const, action };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
      if (result.kind === "missingTicket") errorResponse(res, 404, "TICKET_NOT_FOUND", "Ticket not found.");
      else if (result.kind === "missingAction") errorResponse(res, 404, "ACTION_NOT_FOUND", "Action not found.");
      else if (result.kind === "state") errorResponse(res, 409, "ACTION_STATE_CONFLICT", "Actions cannot be changed in this Ticket state.");
      else if (result.kind === "stale") errorResponse(res, 409, "STALE_UPDATE", "Action has changed. Refresh before saving.");
      else res.status(200).json({ data: { action: toActionResponse(result.action) } });
    } catch (error) { handleMutationError(error, res); }
  });
  app.delete("/api/staff/tickets/:ticketId/actions/:actionId", requireStaffQueueAccess, (_req, res) => {
    errorResponse(res, 405, "METHOD_NOT_ALLOWED", "Actions Taken cannot be deleted.");
  });
}
