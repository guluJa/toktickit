import {
  RequestedPriority,
  TicketStatus,
} from "@prisma/client";

const allowedSortFields = [
  "updatedAt",
  "createdAt",
  "ticketNumber",
] as const;

const allowedSortDirections = [
  "asc",
  "desc",
] as const;

const allowedPageSizes = [10, 20, 50] as const;

export type TicketListSortField =
  (typeof allowedSortFields)[number];

export type TicketListSortDirection =
  (typeof allowedSortDirections)[number];

export type TicketListQuery = {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: RequestedPriority;
  currentStatus?: TicketStatus;
  sortBy: TicketListSortField;
  sortDirection: TicketListSortDirection;
  page: number;
  pageSize: (typeof allowedPageSizes)[number];
};

export class TicketListQueryValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>) {
    super("One or more Ticket list query parameters are invalid.");
    this.name = "TicketListQueryValidationError";
    this.fields = fields;
  }
}

function readSingleQueryValue(
  value: unknown,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return value;
}

function parsePositiveInteger(
  parameter: string,
  value: unknown,
  fields: Record<string, string>,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const text = readSingleQueryValue(value);

  if (!text || !/^\d+$/.test(text)) {
    fields[parameter] =
      `${parameter} must be a positive integer.`;
    return undefined;
  }

  const parsed = Number(text);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    fields[parameter] =
      `${parameter} must be a positive integer.`;
    return undefined;
  }

  return parsed;
}

function parseEnumValue<T extends string>(
  parameter: string,
  value: unknown,
  allowedValues: readonly T[],
  fields: Record<string, string>,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  const text = readSingleQueryValue(value);

  if (
    !text ||
    !allowedValues.includes(text as T)
  ) {
    fields[parameter] =
      `${parameter} must be one of: ${allowedValues.join(", ")}.`;
    return undefined;
  }

  return text as T;
}

export function parseTicketListQuery(
  query: Record<string, unknown>,
): TicketListQuery {
  const fields: Record<string, string> = {};

  const rawSearch = readSingleQueryValue(
    query.search,
  );
  let search: string | undefined;

  if (query.search !== undefined) {
    if (rawSearch === undefined) {
      fields.search =
        "search must be a single text value.";
    } else {
      const trimmedSearch = rawSearch.trim();

      if (trimmedSearch.length > 100) {
        fields.search =
          "search must contain at most 100 characters.";
      } else if (trimmedSearch.length > 0) {
        search = trimmedSearch;
      }
    }
  }

  const categoryId = parsePositiveInteger(
    "categoryId",
    query.categoryId,
    fields,
  );
  const relatedSystemId = parsePositiveInteger(
    "relatedSystemId",
    query.relatedSystemId,
    fields,
  );
  const requestedPriority = parseEnumValue(
    "requestedPriority",
    query.requestedPriority,
    Object.values(RequestedPriority),
    fields,
  );
  const currentStatus = parseEnumValue(
    "currentStatus",
    query.currentStatus,
    Object.values(TicketStatus),
    fields,
  );
  const sortBy =
    parseEnumValue(
      "sortBy",
      query.sortBy,
      allowedSortFields,
      fields,
    ) ?? "updatedAt";
  const sortDirection =
    parseEnumValue(
      "sortDirection",
      query.sortDirection,
      allowedSortDirections,
      fields,
    ) ?? "desc";
  const page =
    parsePositiveInteger(
      "page",
      query.page,
      fields,
    ) ?? 1;
  const parsedPageSize =
    parsePositiveInteger(
      "pageSize",
      query.pageSize,
      fields,
    ) ?? 10;

  if (
    query.pageSize !== undefined &&
    !allowedPageSizes.includes(
      parsedPageSize as (typeof allowedPageSizes)[number],
    )
  ) {
    fields.pageSize =
      "pageSize must be one of: 10, 20, 50.";
  }

  if (Object.keys(fields).length > 0) {
    throw new TicketListQueryValidationError(
      fields,
    );
  }

  return {
    search,
    categoryId,
    relatedSystemId,
    requestedPriority,
    currentStatus,
    sortBy,
    sortDirection,
    page,
    pageSize:
      parsedPageSize as (typeof allowedPageSizes)[number],
  };
}
