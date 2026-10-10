import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaffDashboard } from "../../src/Dashboard.js";
import { staffData } from "./dashboard-fixtures.js";
import App from "../../src/App.js";

afterEach(() => vi.restoreAllMocks());
describe("UI-04 Staff and Administrator Dashboard", () => {
  it("shows authoritative metrics, every breakdown including zero and current-user Actions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: staffData() }), { status: 200 }));
    const navigate = vi.fn(); render(<StaffDashboard userId={7} limit={5} onNavigate={navigate} />);
    await screen.findByText("200");
    expect(within(screen.getByRole("region", { name: "Tickets by Status" })).getByText("NEW: 0")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Tickets by IT Priority" })).getByText("LOW: 0")).toBeInTheDocument();
    expect(screen.getByText("Performed by Current Staff", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Owner: Current Staff/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open Ticket for Action 51" }));
    expect(navigate).toHaveBeenCalledWith({ rel: "ticketDetail", target: "staff-ticket-detail", ticketId: 42 });
    await userEvent.click(screen.getByRole("button", { name: "View My Assigned Tickets: OPEN" }));
    expect(navigate).toHaveBeenLastCalledWith(expect.objectContaining({ query: expect.objectContaining({ status: "OPEN", ownerId: 7, pageSize: 10 }) }));
    await userEvent.click(screen.getByRole("button", { name: "View HIGH Tickets" }));
    expect(navigate).toHaveBeenLastCalledWith(expect.objectContaining({ query: { itPriority: "HIGH", sortBy: "updatedAt", sortOrder: "desc", page: 1, pageSize: 10 } }));
    await userEvent.click(screen.getByRole("button", { name: "View Unassigned Tickets: NEW" }));
    expect(navigate).toHaveBeenLastCalledWith(expect.objectContaining({ query: expect.objectContaining({ status: "NEW", ownerId: "unassigned" }) }));
    await userEvent.click(screen.getByRole("button", { name: "View Recently Resolved: CLOSED" }));
    expect(navigate).toHaveBeenLastCalledWith(expect.objectContaining({ rel: "recentlyResolved", query: expect.objectContaining({ status: "CLOSED" }) }));
  });
  it("shows zero/empty Staff data, semantic controls and responsive breakdown columns", async () => {
    const d = staffData(); Object.keys(d.metrics).forEach(k => { d.metrics[k as keyof typeof d.metrics] = 0; });
    d.recentTickets = []; d.recentActions = [];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: d }), { status: 200 }));
    render(<StaffDashboard userId={7} />);
    expect(await screen.findByText("No Tickets match these dashboard metrics.")).toBeInTheDocument();
    expect(screen.getByText("No Actions in this seven-day period.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tickets by Status" })).toHaveClass("col-12", "col-md-6");
  });
  it.each([403, 500])("renders a safe %i state and allows refresh", async (status) => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "ROLE_FORBIDDEN", message: "private SQL" } }), { status })).mockResolvedValue(new Response(JSON.stringify({ data: staffData() }), { status: 200 }));
    render(<StaffDashboard userId={7} />); await screen.findByRole("alert");
    expect(screen.queryByText(/private SQL/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Refresh Dashboard" })); await screen.findByText("200");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("handles a malformed successful Staff response without crashing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { ...staffData(), recentActions: null } }), { status: 200 }));
    render(<StaffDashboard userId={7} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load");
    expect(screen.queryByText("200")).not.toBeInTheDocument();
  });
  it.each(["IT_STAFF", "ADMINISTRATOR", "REQUESTER"] as const)("connects %s role navigation to the existing list with the API query", async role => {
    const calls: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input); calls.push(url);
      if (url.includes("/api/auth/me")) return new Response(JSON.stringify({ data: { user: { id: 7, name: "User", email: "user@test", role, isActive: true, mustChangePassword: false } } }), { status: 200 });
      if (url.includes("/dashboard")) return new Response(JSON.stringify({ data: role === "REQUESTER" ? { ...staffData(), metrics: { openCount: 3, waitingForRequesterCount: 1, resolvedCount: 1, recentlyUpdatedCount: 2, recentlyResolvedCount: 1 }, links: [{ rel: "recentTickets", target: "requester-tickets", query: { currentStatus: "WAITING_FOR_REQUESTER", sortBy: "updatedAt", sortDirection: "desc", page: 1, pageSize: 10 } }] } : staffData() }), { status: 200 });
      if (url.includes("/api/admin/users") || url.includes("/api/staff/tickets")) return new Response(JSON.stringify({ data: { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } } }), { status: 200 });
      if (url.includes("/api/tickets?")) return new Response(JSON.stringify({ items: [], page: 1, pageSize: 10, totalOwnedItems: 0, totalItems: 0, totalPages: 0 }), { status: 200 });
      if (url.endsWith("/api/categories") || url.endsWith("/api/related-systems")) return new Response("[]", { status: 200 });
      return new Response("{}", { status: 200 });
    });
    render(<App />); const name = role === "REQUESTER" ? "Requester Dashboard" : "Staff Dashboard";
    await userEvent.click(await screen.findByRole("button", { name })); await screen.findByRole("heading", { name });
    const label = role === "REQUESTER" ? "View Waiting for Requester" : "View My Assigned Tickets: OPEN";
    await userEvent.click(await screen.findByRole("button", { name: label }));
    await screen.findByRole("heading", { name: role === "REQUESTER" ? "My Tickets" : "Staff Ticket Queue" });
    expect(calls.some(url => url.includes(role === "REQUESTER" ? "currentStatus=WAITING_FOR_REQUESTER" : "status=OPEN") && url.includes("pageSize=10") && (role === "REQUESTER" || url.includes("ownerId=7")))).toBe(true);
  });
});
