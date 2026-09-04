export const REQUESTED_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;

export type RequestedPriority =
  (typeof REQUESTED_PRIORITIES)[number];

export interface NormalizedTicketInput {
  submissionKey: string;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export type TicketFieldErrors = Record<
  string,
  string
>;

export class TicketInputValidationError extends Error {
  readonly code = "VALIDATION_ERROR";
  readonly fieldErrors: TicketFieldErrors;

  constructor(fieldErrors: TicketFieldErrors) {
    super("The Ticket request contains invalid fields.");

    this.name = "TicketInputValidationError";
    this.fieldErrors = fieldErrors;

    Object.setPrototypeOf(
      this,
      TicketInputValidationError.prototype,
    );
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SERVER_OWNED_FIELDS = [
  "requesterId",
  "ticketNumber",
  "currentStatus",
  "createdAt",
  "updatedAt",
] as const;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPositiveInteger(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function normalizeText(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim();
}

function isRequestedPriority(
  value: unknown,
): value is RequestedPriority {
  return (
    typeof value === "string" &&
    REQUESTED_PRIORITIES.some(
      (priority) => priority === value,
    )
  );
}

export function validateAndNormalizeTicketInput(
  input: unknown,
): NormalizedTicketInput {
  if (!isRecord(input)) {
    throw new TicketInputValidationError({
      body: "Request body must be a JSON object.",
    });
  }

  const fieldErrors: TicketFieldErrors = {};

  for (const field of SERVER_OWNED_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(
        input,
        field,
      )
    ) {
      fieldErrors[field] =
        `${field} is controlled by the server and must not be supplied.`;
    }
  }

  const submissionKey = normalizeText(
    input.submissionKey,
  );

  if (
    submissionKey === undefined ||
    !UUID_PATTERN.test(submissionKey)
  ) {
    fieldErrors.submissionKey =
      "submissionKey must be a valid UUID.";
  }

  if (!isPositiveInteger(input.categoryId)) {
    fieldErrors.categoryId =
      "categoryId must be a positive integer.";
  }

  if (
    !isPositiveInteger(input.relatedSystemId)
  ) {
    fieldErrors.relatedSystemId =
      "relatedSystemId must be a positive integer.";
  }

  const summary = normalizeText(input.summary);

  if (
    summary === undefined ||
    summary.length < 5 ||
    summary.length > 150
  ) {
    fieldErrors.summary =
      "summary must contain between 5 and 150 characters.";
  }

  const description = normalizeText(
    input.description,
  );

  if (
    description === undefined ||
    description.length < 10 ||
    description.length > 5000
  ) {
    fieldErrors.description =
      "description must contain between 10 and 5000 characters.";
  }

  if (
    !isRequestedPriority(
      input.requestedPriority,
    )
  ) {
    fieldErrors.requestedPriority =
      "requestedPriority must be LOW, MEDIUM, or HIGH.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new TicketInputValidationError(
      fieldErrors,
    );
  }

  return {
    submissionKey: submissionKey!,
    categoryId: input.categoryId as number,
    relatedSystemId:
      input.relatedSystemId as number,
    summary: summary!,
    requestedPriority:
      input.requestedPriority as RequestedPriority,
    description: description!,
  };
}