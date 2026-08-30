import { describe, expect, it } from "vitest";
import { formatTicketNumber } from "../../src/ticket-number.js";

describe("Official Ticket Number generation", () => {
  it("formats the UTC date and an uppercase six-character hexadecimal suffix", () => {
    const ticketNumber = formatTicketNumber(
      new Date("2026-08-25T03:20:00.000Z"),
      "a1b2c3",
    );

    expect(ticketNumber).toBe("TKT-20260825-A1B2C3");
    expect(ticketNumber).toMatch(
      /^TKT-\d{8}-[A-F0-9]{6}$/,
    );
  });

  it("uses the UTC calendar date", () => {
    const ticketNumber = formatTicketNumber(
      new Date("2026-08-25T23:30:00-07:00"),
      "ABC123",
    );

    expect(ticketNumber).toBe("TKT-20260826-ABC123");
  });

  it("produces different Ticket Numbers for different suffixes", () => {
    const createdAt = new Date(
      "2026-08-25T03:20:00.000Z",
    );

    const first = formatTicketNumber(
      createdAt,
      "000001",
    );
    const second = formatTicketNumber(
      createdAt,
      "000002",
    );

    expect(first).not.toBe(second);
  });

  it("rejects a suffix that is not exactly six hexadecimal characters", () => {
    const createdAt = new Date(
      "2026-08-25T03:20:00.000Z",
    );

    expect(() =>
      formatTicketNumber(createdAt, "12345"),
    ).toThrow();

    expect(() =>
      formatTicketNumber(createdAt, "ZZZZZZ"),
    ).toThrow();
  });
});