import { describe, expect, it } from "vitest";
import { ActionValidationError, parseActionFields } from "../../src/action-validation.js";

const base = {
  description: "  Diagnosed Wi-Fi  ", result: "  Connection restored  ",
  followUpRequired: false, followUpNote: null, attachmentNotes: null,
};

describe("UNIT-01 Actions Taken validation", () => {
  it("trims required fields and accepts zero follow-up", () => {
    expect(parseActionFields(base)).toEqual({ ...base, description: "Diagnosed Wi-Fi", result: "Connection restored" });
  });
  it("requires a note when follow-up is required", () => {
    expect(() => parseActionFields({ ...base, followUpRequired: true })).toThrow(ActionValidationError);
    expect(parseActionFields({ ...base, followUpRequired: true, followUpNote: "  Call requester " }).followUpNote)
      .toBe("Call requester");
  });
  it("rejects a note when follow-up is false", () => {
    expect(() => parseActionFields({ ...base, followUpNote: "old note" })).toThrow(ActionValidationError);
  });
  it("rejects empty text, invalid types and client-managed fields", () => {
    expect(() => parseActionFields({ ...base, description: " " })).toThrow(ActionValidationError);
    expect(() => parseActionFields({ ...base, result: 42 })).toThrow(ActionValidationError);
    expect(() => parseActionFields({ ...base, performedById: 2 })).toThrow(ActionValidationError);
    expect(() => parseActionFields({ ...base, actionAt: "2026-01-01" })).toThrow(ActionValidationError);
  });
  it("requires current version and preserves omitted fields on PATCH", () => {
    const current = { ...base, description: "Original", result: "Result" };
    expect(parseActionFields({ result: "Updated", version: 1 }, current)).toEqual({ ...current, result: "Updated", version: 1 });
    expect(() => parseActionFields({ result: "Updated", version: 0 }, current)).toThrow(ActionValidationError);
    expect(() => parseActionFields({ result: "Updated", version: 2_147_483_648 }, current)).toThrow(ActionValidationError);
    expect(() => parseActionFields({ version: 1 }, current)).toThrow(ActionValidationError);
  });
});
