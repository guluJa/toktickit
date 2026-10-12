import { describe, expect, it } from "vitest";
import { TicketStatus } from "@prisma/client";
import { isAllowedStatusTransition, parseStatusChange, passesResolutionGate, WorkflowValidationError } from "../../src/ticket-workflow.js";

const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS"], CANCELLED: [],
};
const statuses = Object.values(TicketStatus);
const activeOwner = { isActive: true, role: "IT_STAFF" };
const validAction = { description: "Diagnosis", result: "Restored", followUpRequired: false };

describe("UNIT-02 Status Matrix and resolution rules", () => {
  it.each(statuses.flatMap((from) => statuses.map((to) => [from, to] as const)))("checks %s -> %s", (from, to) => {
    expect(isAllowedStatusTransition(from, to)).toBe(matrix[from].includes(to));
  });
  it.each([undefined, null, 0, -1, 1.5, "1", 2147483648, NaN])("rejects invalid Ticket version %s", (version) => {
    expect(() => parseStatusChange({ status: "OPEN", version })).toThrow(WorkflowValidationError);
  });
  it("validates status, managed fields and trimmed reopenReason", () => {
    expect(parseStatusChange({ status: "REOPENED", version: 3, reopenReason: "  Returned  " })).toEqual({ status: "REOPENED", version: 3, reopenReason: "Returned" });
    for (const body of [null, { status: "BAD", version: 1 }, { status: "REOPENED", version: 1, reopenReason: " " }, { status: "OPEN", version: 1, reopenReason: "No" }, { status: "OPEN", version: 1, ownerId: 7 }]) expect(() => parseStatusChange(body)).toThrow(WorkflowValidationError);
    expect(parseStatusChange({ status: "OPEN", version: 2147483647, reopenReason: null }).version).toBe(2147483647);
  });
  it("requires an active eligible owner and at least one valid Action to resolve", () => {
    for (const owner of [null, { ...activeOwner, isActive: false }, { isActive: true, role: "REQUESTER" }]) expect(passesResolutionGate("RESOLVED", owner, [validAction])).toBe(false);
    expect(passesResolutionGate("RESOLVED", activeOwner, [])).toBe(false);
    expect(passesResolutionGate("RESOLVED", activeOwner, [{ ...validAction, result: " " }])).toBe(false);
    expect(passesResolutionGate("RESOLVED", { isActive: true, role: "ADMINISTRATOR" }, [validAction])).toBe(true);
  });
  it("allows unresolved follow-up on RESOLVED but blocks CLOSED if any Action needs follow-up", () => {
    const actions = [validAction, { ...validAction, followUpRequired: true }];
    expect(passesResolutionGate("RESOLVED", activeOwner, actions)).toBe(true);
    expect(passesResolutionGate("CLOSED", activeOwner, actions)).toBe(false);
    expect(passesResolutionGate("CLOSED", null, [validAction])).toBe(true);
  });
});
