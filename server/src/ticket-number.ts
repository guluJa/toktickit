import { randomBytes } from "node:crypto";

const HEX_SUFFIX_PATTERN = /^[A-F0-9]{6}$/;

function formatUtcDate(createdAt: Date): string {
  if (
    !(createdAt instanceof Date) ||
    Number.isNaN(createdAt.getTime())
  ) {
    throw new Error(
      "A valid Ticket creation date is required.",
    );
  }

  const year = String(
    createdAt.getUTCFullYear(),
  ).padStart(4, "0");

  const month = String(
    createdAt.getUTCMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    createdAt.getUTCDate(),
  ).padStart(2, "0");

  return `${year}${month}${day}`;
}

export function formatTicketNumber(
  createdAt: Date,
  suffix: string,
): string {
  const normalizedSuffix = suffix.toUpperCase();

  if (
    !HEX_SUFFIX_PATTERN.test(
      normalizedSuffix,
    )
  ) {
    throw new Error(
      "Ticket Number suffix must contain exactly six hexadecimal characters.",
    );
  }

  const datePart = formatUtcDate(createdAt);

  return `TKT-${datePart}-${normalizedSuffix}`;
}

export function generateTicketNumber(
  createdAt: Date = new Date(),
): string {
  const suffix = randomBytes(3)
    .toString("hex")
    .toUpperCase();

  return formatTicketNumber(
    createdAt,
    suffix,
  );
}