import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import ActionsTaken from "../../src/ActionsTaken.js";
import { StaffDashboard } from "../../src/Dashboard.js";
import { staffData } from "./dashboard-fixtures.js";
afterEach(() => vi.restoreAllMocks());
it("STYLE-01: Action fields have visible labels, linked errors and natural keyboard order", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } } })));
  render(<ActionsTaken ticketId={42} audience="staff" ticketStatus="IN_PROGRESS" />); await screen.findByText("No Actions Taken yet.");
  await userEvent.click(screen.getByRole("button", { name: "Create Action" }));
  const description = screen.getByLabelText("Action description"); expect(description).toHaveAttribute("aria-invalid", "true"); expect(document.getElementById(description.getAttribute("aria-describedby")!)).toHaveTextContent("Enter an Action description.");
  description.focus(); await userEvent.tab(); expect(screen.getByLabelText("Result", { exact: true })).toHaveFocus();
  await userEvent.tab(); expect(screen.getByLabelText("Follow-up required")).toHaveFocus();
  expect(screen.getByRole("button", { name: "Create Action" })).toHaveClass("btn-success");
});
it("STYLE-01: Dashboard cards and status breakdowns are semantic, responsive and use textual cues", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: staffData() })));
  render(<StaffDashboard userId={7} onNavigate={vi.fn()} />); await screen.findByText("200");
  expect(screen.getByRole("region", { name: "High Priority Tickets" }).parentElement).toHaveClass("col-12", "col-md-6", "col-lg-4");
  expect(screen.getByText("NEW: 0")).toBeInTheDocument(); expect(screen.getByText("LOW: 0")).toBeInTheDocument();
  screen.getByRole("button", { name: "Refresh Dashboard" }).focus(); await userEvent.tab(); expect(screen.getByRole("button", { name: "View Unassigned Tickets: NEW" })).toHaveFocus();
});
