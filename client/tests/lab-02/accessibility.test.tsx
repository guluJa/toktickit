import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateTicket from "../../src/CreateTicket.js";
import {
  getCategories,
  getRelatedSystems,
} from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api.js")>()),
  getCategories: vi.fn(),
  getRelatedSystems: vi.fn(),
}));

const mockedGetCategories = vi.mocked(getCategories);
const mockedGetRelatedSystems = vi.mocked(getRelatedSystems);

beforeEach(() => {
  vi.resetAllMocks();
  mockedGetCategories.mockResolvedValue([
    { id: 1, name: "Hardware" },
  ]);
  mockedGetRelatedSystems.mockResolvedValue([
    {
      id: 1,
      name: "Campus Wi-Fi",
      description: "Campus wireless network",
    },
  ]);
});

describe("Lab 2 accessibility contract", () => {
  it("exposes semantic headings, labels, and required state", async () => {
    render(
      <CreateTicket
        requesterId={1}
        requesterName="Development Requester 1"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Create Ticket" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "System Information" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Attachments" }),
    ).toBeInTheDocument();

    for (const name of [
      "Category",
      "Related System",
      "Summary",
      "Requested Priority",
      "Description",
    ]) {
      expect(await screen.findByLabelText(name)).toHaveAttribute(
        "aria-required",
        "true",
      );
    }

    expect(
      screen.getByLabelText("Select supporting files"),
    ).toHaveAttribute("type", "file");
    expect(
      screen.getByRole("button", { name: "Create Ticket" }),
    ).toHaveAttribute("type", "submit");
  });
});
