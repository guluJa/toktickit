import { TicketStatus } from "@prisma/client";
import { MAX_DATABASE_INTEGER } from "./action-validation.js";

export const allowedStatusTransitions: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  CANCELLED: [],
};

export function isAllowedStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
  return allowedStatusTransitions[from].includes(to);
}

export class WorkflowValidationError extends Error {
  constructor(public fields: Record<string, string>) { super("Request data is invalid."); }
}

export function parseStatusChange(body: unknown): { status: TicketStatus; version: number; reopenReason: string | null } {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const fields: Record<string, string> = {};
  if (typeof input.status !== "string" || !Object.values(TicketStatus).includes(input.status as TicketStatus)) fields.status = "status is invalid.";
  if (typeof input.version !== "number" || !Number.isInteger(input.version) || input.version < 1 || input.version > MAX_DATABASE_INTEGER) fields.version = "version must be an integer between 1 and 2147483647.";
  const reason = typeof input.reopenReason === "string" ? input.reopenReason.trim() : null;
  if (input.status === "REOPENED" && !reason) fields.reopenReason = "Enter a reason for reopening this Ticket.";
  if (input.status !== "REOPENED" && input.reopenReason !== undefined && input.reopenReason !== null) fields.reopenReason = "reopenReason is only permitted for REOPENED.";
  for (const key of Object.keys(input)) if (!["status", "version", "reopenReason"].includes(key)) fields[key] = "This field is not permitted.";
  if (Object.keys(fields).length) throw new WorkflowValidationError(fields);
  return { status: input.status as TicketStatus, version: input.version as number, reopenReason: reason };
}

export function passesResolutionGate(
  status: TicketStatus,
  owner: { isActive: boolean; role: string } | null,
  actions: Array<{ description: string; result: string; followUpRequired: boolean }>,
): boolean {
  if (status === "RESOLVED") return Boolean(owner?.isActive && ["IT_STAFF", "ADMINISTRATOR"].includes(owner.role) && actions.some((a) => a.description.trim() && a.result.trim()));
  if (status === "CLOSED") return !actions.some((a) => a.followUpRequired);
  return true;
}
