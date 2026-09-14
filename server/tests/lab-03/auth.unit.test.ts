import { describe, expect, it } from "vitest";
import {
  PASSWORD_POLICY_MESSAGE,
  requireNormalApplicationAccess,
  validatePassword,
} from "../../src/auth.js";
import { isAllowedStatusTransition } from "../../src/staff-ticket-detail.js";
import type { TicketStatus } from "@prisma/client";

describe("Lab 3 authentication password policy", () => {
  it.each(["short", "NoDigitOrSymbol", "nouppercase1!", "NOLOWERCASE1!"])(
    "rejects password %s",
    (password) => {
      expect(validatePassword(password)).toBe(PASSWORD_POLICY_MESSAGE);
    },
  );

  it("accepts a password at the exact minimum boundary", () => {
    expect(validatePassword("Aa1!aaaaaaaa")).toBeNull();
  });

  it("accepts a password at the exact maximum boundary", () => {
    expect(validatePassword(`Aa1!${"a".repeat(124)}`)).toBeNull();
  });

  it("rejects a password over the maximum boundary", () => {
    expect(validatePassword(`A1-${"a".repeat(126)}!`)).toBe(PASSWORD_POLICY_MESSAGE);
  });
});

describe("mandatory first-login gate", () => {
  it("returns PASSWORD_CHANGE_REQUIRED until the password is changed", () => {
    const req = { authUser: { mustChangePassword: true } } as never;
    const status = { statusCode: 200, body: undefined as unknown };
    const res = {
      status(code: number) {
        status.statusCode = code;
        return this;
      },
      json(body: unknown) {
        status.body = body;
        return this;
      },
    } as never;

    let nextCalled = false;
    requireNormalApplicationAccess(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(status.statusCode).toBe(403);
    expect(status.body).toEqual({
      error: {
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before continuing.",
      },
    });
  });

  it("allows normal access after the first-login flag is cleared", () => {
    const req = { authUser: { mustChangePassword: false } } as never;
    const res = {} as never;
    let nextCalled = false;

    requireNormalApplicationAccess(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });
});

describe("Ticket status transition contract", () => {
  const statuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
  const allowed: Record<TicketStatus, readonly TicketStatus[]> = {
    NEW: ["OPEN"],
    OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
    IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
    WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
    RESOLVED: ["CLOSED", "REOPENED"],
    CLOSED: ["REOPENED"],
    REOPENED: [],
    CANCELLED: [],
  };

  it("accepts exactly the allowed transitions and rejects all others", () => {
    for (const from of statuses) {
      for (const to of statuses) {
        expect(isAllowedStatusTransition(from, to)).toBe(allowed[from].includes(to));
      }
    }
  });
});
