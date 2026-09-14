import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";
import { getCurrentUser, getStaffTickets } from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/api.js")>()),
  getCurrentUser: vi.fn(),
  getStaffTickets: vi.fn(),
}));

const staff = { id: 21, name: "Accessibility Staff", email: "a11y-staff@example.test", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue(staff);
  vi.mocked(getStaffTickets).mockResolvedValue({
    items: [{ id: 42, ticketNumber: "TKT-A11Y-42", summary: "Keyboard fixture", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", owner: null, category: { id: 1, name: "Access" }, relatedSystem: { id: 1, name: "Portal" }, createdAt: "2026-09-14T00:00:00.000Z", updatedAt: "2026-09-14T00:00:00.000Z" }],
    pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
  });
});

describe("Lab 3 accessibility and style verification", () => {
  it("exposes semantic landmarks, visible labels, keyboard focus and text state cues", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Staff Ticket Queue" })).toBeInTheDocument();
    const table = await screen.findByRole("table", { name: "Staff Ticket Queue" });
    expect(screen.getByRole("form", { name: "Staff Ticket Queue controls" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search Tickets")).toBeInTheDocument();
    expect(table).toHaveTextContent("HIGH");
    expect(table).toHaveTextContent("NEW");
    const searchInput = screen.getByLabelText("Search Tickets");
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText("Status"));
    expect(screen.getByLabelText("Status")).toHaveAttribute("id", "staff-status");
    expect(screen.getAllByRole("button", { name: "Open Ticket" })[0]).toHaveAttribute("type", "button");
  });
});
