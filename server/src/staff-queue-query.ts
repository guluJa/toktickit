import { RequestedPriority, TicketStatus } from "@prisma/client";

const allowedStatuses = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

const allowedSortFields = [
  "ticketNumber",
  "summary",
  "createdAt",
  "updatedAt",
  "itPriority",
  "currentStatus",
] as const;

const allowedSortOrders = ["asc", "desc"] as const;
const allowedPageSizes = [10, 20, 50] as const;

export type StaffQueueStatus = (typeof allowedStatuses)[number];
export type StaffQueueSortField = (typeof allowedSortFields)[number];
export type StaffQueueSortOrder = (typeof allowedSortOrders)[number];
export type StaffQueueQuery = {
  search?: string;
  status?: StaffQueueStatus;
  requestedPriority?: RequestedPriority;
  itPriority?: RequestedPriority;
  ownerId?: number | "unassigned";
  sortBy: StaffQueueSortField;
  sortOrder: StaffQueueSortOrder;
  page: number;
  pageSize: (typeof allowedPageSizes)[number];
};

export class StaffQueueQueryValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super("One or more Staff Queue query parameters are invalid.");
    this.name = "StaffQueueQueryValidationError";
    this.fields = fields;
  }
}

function single(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function positiveInteger(name: string, value: unknown, fields: Record<string, string>): number | undefined {
  if (value === undefined) return undefined;
  const text = single(value);
  if (!text || !/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) <= 0) {
    fields[name] = `${name} must be a positive integer.`;
    return undefined;
  }
  return Number(text);
}

function enumValue<T extends string>(name: string, value: unknown, allowed: readonly T[], fields: Record<string, string>): T | undefined {
  if (value === undefined) return undefined;
  const text = single(value);
  if (!text || !allowed.includes(text as T)) {
    fields[name] = `${name} must be one of: ${allowed.join(", ")}.`;
    return undefined;
  }
  return text as T;
}

export function parseStaffQueueQuery(query: Record<string, unknown>): StaffQueueQuery {
  const fields: Record<string, string> = {};
  const allowedKeys = new Set(["search", "status", "requestedPriority", "itPriority", "ownerId", "sortBy", "sortOrder", "page", "pageSize"]);
  for (const key of Object.keys(query)) {
    if (!allowedKeys.has(key)) fields[key] = "Unknown query parameter.";
  }

  const rawSearch = query.search === undefined ? undefined : single(query.search);
  let search: string | undefined;
  if (query.search !== undefined) {
    if (rawSearch === undefined) fields.search = "search must be a single text value.";
    else if (rawSearch.trim().length > 100) fields.search = "search must contain at most 100 characters.";
    else if (rawSearch.trim()) search = rawSearch.trim();
  }

  const status = enumValue("status", query.status, allowedStatuses, fields);
  const requestedPriority = enumValue("requestedPriority", query.requestedPriority, Object.values(RequestedPriority), fields);
  const itPriority = enumValue("itPriority", query.itPriority, Object.values(RequestedPriority), fields);
  let ownerId: number | "unassigned" | undefined;
  if (query.ownerId !== undefined) {
    const ownerText = single(query.ownerId);
    if (ownerText === "unassigned") ownerId = ownerText;
    else ownerId = positiveInteger("ownerId", query.ownerId, fields);
  }
  const sortBy = enumValue("sortBy", query.sortBy, allowedSortFields, fields) ?? "updatedAt";
  const sortOrder = enumValue("sortOrder", query.sortOrder, allowedSortOrders, fields) ?? "desc";
  const page = positiveInteger("page", query.page, fields) ?? 1;
  const pageSize = positiveInteger("pageSize", query.pageSize, fields) ?? 10;
  if (query.pageSize !== undefined && !allowedPageSizes.includes(pageSize as (typeof allowedPageSizes)[number])) {
    fields.pageSize = "pageSize must be one of: 10, 20, 50.";
  }
  if (Object.keys(fields).length) throw new StaffQueueQueryValidationError(fields);
  return { search, status, requestedPriority, itPriority, ownerId, sortBy, sortOrder, page, pageSize: pageSize as (typeof allowedPageSizes)[number] };
}

export function isDatabaseSupportedStatus(status: StaffQueueStatus | undefined): status is TicketStatus {
  return status === undefined || Object.values(TicketStatus).includes(status as TicketStatus);
}
