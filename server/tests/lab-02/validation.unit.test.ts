import { describe, expect, it } from "vitest";
import {
  TicketInputValidationError,
  validateAndNormalizeTicketInput,
} from "../../src/ticket-validation.js";

const validInput = {
  submissionKey: "550e8400-e29b-41d4-a716-446655440000",
  categoryId: 1,
  relatedSystemId: 2,
  summary: "Unable to access the internal portal",
  requestedPriority: "MEDIUM",
  description:
    "The requester receives an access denied message when opening the portal.",
};

describe("Ticket input validation", () => {
  it("accepts valid input and trims text fields", () => {
    const result = validateAndNormalizeTicketInput({
      ...validInput,
      summary: `  ${validInput.summary}  `,
      description: `  ${validInput.description}  `,
    });

    expect(result).toEqual(validInput);
  });

  it("requires submissionKey to be a valid UUID", () => {
    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        submissionKey: "not-a-uuid",
      }),
    ).toThrow(TicketInputValidationError);
  });

  it("requires positive integer reference IDs", () => {
    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        categoryId: 0,
      }),
    ).toThrow(TicketInputValidationError);

    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        relatedSystemId: 1.5,
      }),
    ).toThrow(TicketInputValidationError);
  });

  it("requires summary length from 5 to 150 characters after trimming", () => {
    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        summary: "1234",
      }),
    ).toThrow(TicketInputValidationError);

    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        summary: "A".repeat(151),
      }),
    ).toThrow(TicketInputValidationError);
  });

  it("requires description length from 10 to 5000 characters after trimming", () => {
    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        description: "123456789",
      }),
    ).toThrow(TicketInputValidationError);

    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        description: "A".repeat(5001),
      }),
    ).toThrow(TicketInputValidationError);
  });

  it("accepts only LOW, MEDIUM, or HIGH priority", () => {
    for (const requestedPriority of [
      "LOW",
      "MEDIUM",
      "HIGH",
    ]) {
      const result = validateAndNormalizeTicketInput({
        ...validInput,
        requestedPriority,
      });

      expect(result.requestedPriority).toBe(
        requestedPriority,
      );
    }

    expect(() =>
      validateAndNormalizeTicketInput({
        ...validInput,
        requestedPriority: "URGENT",
      }),
    ).toThrow(TicketInputValidationError);
  });

  it("rejects server-owned fields supplied by the client", () => {
    for (const field of [
      "requesterId",
      "ticketNumber",
      "currentStatus",
      "createdAt",
      "updatedAt",
    ]) {
      expect(() =>
        validateAndNormalizeTicketInput({
          ...validInput,
          [field]: "client-controlled-value",
        }),
      ).toThrow(TicketInputValidationError);
    }
  });

  it("rejects a missing or non-object request body", () => {
    expect(() =>
      validateAndNormalizeTicketInput(undefined),
    ).toThrow(TicketInputValidationError);

    expect(() =>
      validateAndNormalizeTicketInput("invalid body"),
    ).toThrow(TicketInputValidationError);
  });
});