import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequesterDashboard, dashboardDate } from "../../src/Dashboard.js";
import { getRequesterDashboard } from "../../src/api.js";
import { requesterData } from "./dashboard-fixtures.js";

function respond(data = requesterData()) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data }), { status: 200 }));
}
afterEach(() => vi.restoreAllMocks());
describe("UI-03 Requester Dashboard", () => {
  it("shows loading, authoritative totals, Bangkok time and owned Ticket detail links", async () => {
    let finish!: (r: Response) => void;
    const fetch = vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(r => { finish = r; }));
    const navigate = vi.fn(); render(<RequesterDashboard userId={3} limit={5} onNavigate={navigate} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");
    expect(screen.getByRole("button", { name: "Refresh Dashboard" })).toBeDisabled();
    await act(async () => finish(new Response(JSON.stringify({ data: requesterData() }), { status: 200 })));
    expect(within(screen.getByRole("region", { name: "Open Tickets" })).getByText("120")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/requester/dashboard?limit=5"), { credentials: "include" });
    expect(dashboardDate("2026-10-03T17:00:00Z")).toMatch(/4 Oct 2026.*00:00/);
    await userEvent.click(screen.getByRole("button", { name: "Open T-42" }));
    expect(navigate).toHaveBeenCalledWith({ rel: "ticketDetail", target: "requester-ticket-detail", ticketId: 42 });
  });
  it("uses currentStatus, existing pagination and separate status links for metric drill-down", async () => {
    respond(); const navigate = vi.fn(); render(<RequesterDashboard userId={3} onNavigate={navigate} />);
    await screen.findByText("120");
    await userEvent.click(screen.getByRole("button", { name: "View Recently Resolved: CLOSED" }));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ target: "requester-tickets", query: { currentStatus: "CLOSED", sortBy: "updatedAt", sortDirection: "desc", page: 1, pageSize: 10 } }));
    expect(screen.getByText(/may include older Tickets/)).toBeInTheDocument();
  });
  it("renders zero metrics and empty lists without fabricating Tickets", async () => {
    const d = requesterData(); Object.keys(d.metrics).forEach(k => { d.metrics[k as keyof typeof d.metrics] = 0; }); d.recentTickets = [];
    respond(d); render(<RequesterDashboard userId={3} />);
    expect(await screen.findByText("No Tickets match these dashboard metrics.")).toBeInTheDocument();
    expect(screen.getAllByText("No Tickets in this seven-day period.")).toHaveLength(2);
  });
  it("renders recently resolved rows with their original detail destination", async () => {
    const d = requesterData(); d.recentlyResolvedTickets = [{ ...d.recentTickets[0], id: 43, ticketNumber: "T-43", currentStatus: "CLOSED", detailLink: { rel: "ticketDetail", target: "requester-ticket-detail", ticketId: 43 } }];
    respond(d); const navigate = vi.fn(); render(<RequesterDashboard userId={3} onNavigate={navigate} />);
    await userEvent.click(await screen.findByRole("button", { name: "Open T-43" }));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ ticketId: 43, target: "requester-ticket-detail" }));
    expect(screen.getByText(/does not represent the exact resolution time/)).toBeInTheDocument();
  });
  it("shows forbidden without displaying data from an unauthorized response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "ROLE_FORBIDDEN", message: "private backend detail" } }), { status: 403 }));
    render(<RequesterDashboard userId={3} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
    expect(screen.queryByText(/private backend/)).not.toBeInTheDocument(); expect(screen.queryByText("120")).not.toBeInTheDocument();
  });
  it("retries safe failures with keyboard controls, without showing raw errors", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(Error("secret database detail")).mockResolvedValue(new Response(JSON.stringify({ data: requesterData() }), { status: 200 }));
    render(<RequesterDashboard userId={3} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load");
    const retry = screen.getByRole("button", { name: "Retry" }); retry.focus(); await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("120")).toBeInTheDocument(); expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/secret database/)).not.toBeInTheDocument();
  });
  it("rejects malformed responses safely and keeps responsive semantic metric cards", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 200 })).mockResolvedValue(new Response(JSON.stringify({ data: requesterData() }), { status: 200 }));
    render(<RequesterDashboard userId={3} />); await screen.findByRole("alert");
    await userEvent.click(screen.getByRole("button", { name: "Retry" })); await screen.findByText("120");
    expect(screen.getByRole("region", { name: "Open Tickets" }).parentElement).toHaveClass("col-12", "col-md-6", "col-lg-4");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("ignores a stale response after changing the current user", async () => {
    let finish!: (r: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise(r => { finish = r; })).mockResolvedValue(new Response(JSON.stringify({ data: { ...requesterData(), metrics: { ...requesterData().metrics, openCount: 9 } } }), { status: 200 }));
    const view = render(<RequesterDashboard userId={3} />); view.rerender(<RequesterDashboard userId={4} />);
    await screen.findByText("9"); await act(async () => finish(new Response(JSON.stringify({ data: requesterData() }), { status: 200 })));
    expect(screen.queryByText("120")).not.toBeInTheDocument(); expect(screen.getByText("9")).toBeInTheDocument();
  });
  it("preserves authentication errors and uses a safe fallback for invalid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "SESSION_INVALID" } }), { status: 401 })).mockResolvedValueOnce(new Response("not json", { status: 500 }));
    await expect(getRequesterDashboard()).rejects.toMatchObject({ status: 401, code: "SESSION_INVALID" });
    await expect(getRequesterDashboard()).rejects.toMatchObject({ status: 500, code: "DASHBOARD_REQUEST_FAILED" });
  });
});
