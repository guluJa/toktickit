import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketQueue from "../../src/StaffTicketQueue.js";
import { getStaffTickets, TicketApiError, StaffQueueResponse } from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../src/api.js")>()), getStaffTickets: vi.fn() }));
const mockedGetStaffTickets = vi.mocked(getStaffTickets);
const ticket = { id: 1, ticketNumber: "TKT-QUEUE-1", summary: "Laptop issue", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Campus Wi-Fi" }, requestedPriority: "HIGH" as const, itPriority: "MEDIUM" as const, currentStatus: "NEW" as const, owner: { id: 10, name: "Staff", role: "IT_STAFF" as const }, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-02T00:00:00Z" };
function result(overrides: Partial<StaffQueueResponse> = {}): StaffQueueResponse { return { items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, ...overrides }; }
beforeEach(() => { vi.resetAllMocks(); mockedGetStaffTickets.mockResolvedValue(result()); });

describe("Staff Ticket Queue", () => {
  it("shows loading then desktop table and responsive mobile cards", async () => {
    render(<StaffTicketQueue role="IT_STAFF" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    await waitFor(() => expect(screen.getAllByText("TKT-QUEUE-1").length).toBeGreaterThan(0));
    expect(screen.getByRole("table")).toBeInTheDocument(); expect(screen.getAllByText("Laptop issue").length).toBeGreaterThan(0); expect(screen.getAllByText(/Staff \(IT_STAFF\)/).length).toBeGreaterThan(0); expect(screen.queryByText(/staff@example.test/)).not.toBeInTheDocument();
  });
  it("sends exact search, filter and sort query", async () => {
    const user = userEvent.setup(); render(<StaffTicketQueue role="IT_STAFF" />); await screen.findAllByText("TKT-QUEUE-1");
    await user.type(screen.getByLabelText("Search Tickets"), "alpha"); await user.selectOptions(screen.getByLabelText("Status"), "OPEN"); await user.selectOptions(screen.getByLabelText("IT Priority"), "HIGH"); await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(mockedGetStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ search: "alpha", status: "OPEN", itPriority: "HIGH", page: 1, sortBy: "updatedAt", sortOrder: "desc", pageSize: 10 })));
  });
  it("passes the selected ticket id to the navigation callback", async () => {
    const user = userEvent.setup(); const onOpenTicket = vi.fn(); render(<StaffTicketQueue role="IT_STAFF" onOpenTicket={onOpenTicket} />); await screen.findAllByText("TKT-QUEUE-1");
    await user.click(screen.getAllByRole("button", { name: "Open Ticket" })[0]); expect(onOpenTicket).toHaveBeenCalledWith(1);
  });
  it("renders empty, no-results, forbidden and safe failure states", async () => {
    mockedGetStaffTickets.mockResolvedValueOnce(result({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } })); render(<StaffTicketQueue role="ADMINISTRATOR" />); await screen.findByText(/No Tickets are currently/); expect(screen.queryByText(/internal/i)).not.toBeInTheDocument();
    mockedGetStaffTickets.mockRejectedValueOnce(new TicketApiError("no", 403, "ROLE_FORBIDDEN")); render(<StaffTicketQueue role="IT_STAFF" />); await screen.findByText(/Access denied/);
    mockedGetStaffTickets.mockRejectedValueOnce(new Error("secret")); render(<StaffTicketQueue role="IT_STAFF" />); await screen.findByText(/Unable to load the Staff Ticket Queue/); expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
});
