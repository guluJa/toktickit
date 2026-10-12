import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import { getActionPage, getStaffTicketDetail, updateStaffStatus, TicketApiError, TicketDetail, TicketStatus } from "../../src/api.js";

vi.mock("../../src/api.js", async (original) => ({
  ...(await original<typeof import("../../src/api.js")>()),
  getStaffTicketDetail: vi.fn(), getActionPage: vi.fn(), updateStaffStatus: vi.fn(),
}));
const get = vi.mocked(getStaffTicketDetail), update = vi.mocked(updateStaffStatus);
const ticket: TicketDetail = {
  id: 501, version: 4, ticketNumber: "WORKFLOW-501", summary: "Workflow fixture", description: "Test workflow",
  requester: { id: 10, name: "Requester", email: "requester@test" }, category: { id: 1, name: "Network" },
  relatedSystem: { id: 1, name: "Wi-Fi" }, requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "RESOLVED",
  owner: { id: 7, name: "Staff", role: "IT_STAFF" }, requesterResolvedAt: null,
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", attachments: [],
};
const detail = (overrides: Partial<TicketDetail> = {}) => ({ ticket: { ...ticket, ...overrides }, comments: [], internalNotes: [] });
const matrix: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS"], CANCELLED: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  get.mockResolvedValue(detail());
  vi.mocked(getActionPage).mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
async function show(role: "IT_STAFF" | "ADMINISTRATOR" = "IT_STAFF") {
  render(<StaffTicketDetail ticketId={501} currentUserId={7} role={role} onBack={vi.fn()} />);
  await screen.findByRole("heading", { name: "WORKFLOW-501" });
  return userEvent.setup();
}

describe("UI-05 Ticket workflow", () => {
  it.each(Object.keys(matrix) as TicketStatus[])("shows only permitted targets for %s", async (currentStatus) => {
    get.mockResolvedValue(detail({ currentStatus }));
    await show();
    expect([...screen.getByLabelText("Status").querySelectorAll("option")].map((o) => o.value)).toEqual([currentStatus, ...matrix[currentStatus]]);
    expect(screen.getByRole("button", { name: "Change Status" })).toBeDisabled();
  });
  it("keeps Administrator status read-only", async () => {
    const user = await show("ADMINISTRATOR");
    expect(screen.getByLabelText("Status")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    expect(update).not.toHaveBeenCalled();
  });
  it("requires a labelled nonblank reopen reason and sends latest Ticket version", async () => {
    update.mockResolvedValue({ ticket: { ...ticket, currentStatus: "REOPENED", version: 5 } });
    const user = await show();
    await user.selectOptions(screen.getByLabelText("Status"), "REOPENED");
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    expect(screen.getByLabelText("Reopen reason")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Reopen reason")).toHaveAttribute("aria-describedby", "reopen-reason-error");
    expect(update).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Reopen reason"), "Same issue returned");
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    expect(await screen.findByText("Ticket updated successfully.")).toBeInTheDocument();
    expect(update).toHaveBeenCalledWith(501, "REOPENED", 4, "Same issue returned");
    expect(screen.getByRole("option", { name: "IN_PROGRESS" })).toBeInTheDocument();
  });
  it("guards repeated save clicks and updates summary after success", async () => {
    let finish!: (value: { ticket: TicketDetail }) => void;
    update.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const user = await show();
    await user.selectOptions(screen.getByLabelText("Status"), "CLOSED");
    await user.dblClick(screen.getByRole("button", { name: "Change Status" }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saving status..." })).toBeDisabled();
    await act(async () => finish({ ticket: { ...ticket, currentStatus: "CLOSED", version: 5 } }));
    expect(screen.getByLabelText("Status")).toHaveValue("CLOSED");
    expect(screen.queryByRole("button", { name: "Create Action" })).not.toBeInTheDocument();
  });
  it.each(["STALE_UPDATE", "RESOLUTION_GATE_FAILED", "STATUS_TRANSITION_NOT_ALLOWED"])("requires explicit refresh after %s and preserves Action draft", async (code) => {
    get.mockResolvedValueOnce(detail()).mockResolvedValueOnce(detail({ version: 6 }));
    update.mockRejectedValueOnce(new TicketApiError("Ticket conflict.", 409, code)).mockResolvedValueOnce({ ticket: { ...ticket, currentStatus: "CLOSED", version: 7 } });
    const user = await show();
    await user.type(screen.getByLabelText("Action description"), "Preserved draft");
    await user.selectOptions(screen.getByLabelText("Status"), "CLOSED");
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    await screen.findByRole("button", { name: "Refresh latest Ticket" });
    expect(screen.getByRole("button", { name: "Change Status" })).toBeDisabled();
    expect(screen.getByLabelText("Action description")).toHaveValue("Preserved draft");
    if (code === "RESOLUTION_GATE_FAILED") expect(screen.getByRole("alert")).toHaveTextContent("all follow-up to be cleared");
    expect(update).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Refresh latest Ticket" }));
    await screen.findByText(/Latest Ticket loaded/);
    expect(screen.getByLabelText("Action description")).toHaveValue("Preserved draft");
    expect(update).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    await screen.findByText("Ticket updated successfully.");
    expect(update).toHaveBeenLastCalledWith(501, "CLOSED", 6, undefined);
  });
  it("preserves reason and feedback after safe failure and failed refresh without automatic mutation", async () => {
    get.mockResolvedValueOnce(detail()).mockRejectedValueOnce(new Error("private details"));
    update.mockRejectedValueOnce(new Error("private details"));
    const user = await show();
    await user.selectOptions(screen.getByLabelText("Status"), "REOPENED");
    await user.type(screen.getByLabelText("Reopen reason"), "Return reason");
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    await screen.findByText(/Unable to confirm the status change/);
    await user.click(screen.getByRole("button", { name: "Refresh latest Ticket" }));
    await screen.findByText(/Unable to refresh the Ticket/);
    expect(screen.getByLabelText("Reopen reason")).toHaveValue("Return reason");
    expect(screen.queryByText("private details")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change Status" })).toBeDisabled();
    expect(update).toHaveBeenCalledTimes(1);
  });
  it("maps server validation to the reason field and keeps its contents", async () => {
    update.mockRejectedValueOnce(new TicketApiError("Invalid data.", 400, "VALIDATION_ERROR", { reopenReason: "Review this reason." }));
    const user = await show();
    await user.selectOptions(screen.getByLabelText("Status"), "REOPENED");
    await user.type(screen.getByLabelText("Reopen reason"), "Return reason");
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    expect(await screen.findByText("Review this reason.")).toBeInTheDocument();
    expect(screen.getByLabelText("Reopen reason")).toHaveValue("Return reason");
  });
  it("serializes the existing API route, credentials, Ticket version and trimmed reason", async () => {
    const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { ticket } }) });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await actual.updateStaffStatus(501, "REOPENED", 4, "  Return  ");
      expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/api/staff/tickets/501/status"), expect.objectContaining({ method: "PATCH", credentials: "include", body: JSON.stringify({ status: "REOPENED", version: 4, reopenReason: "Return" }) }));
      await actual.updateStaffStatus(501, "CLOSED", 4);
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ status: "CLOSED", version: 4 });
    } finally { vi.unstubAllGlobals(); }
  });
});
