import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActionsTaken from "../../src/ActionsTaken.js";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import RequesterTicketDetail from "../../src/RequesterTicketDetail.js";
import {
  ActionTaken as ActionRecord, createAction, getActionPage, getStaffTicketDetail,
  getTicketComments, getTicketDetail, TicketApiError, updateAction, updateStaffAssignment,
} from "../../src/api.js";

vi.mock("../../src/api.js", async (original) => ({
  ...(await original<typeof import("../../src/api.js")>()),
  createAction: vi.fn(), getActionPage: vi.fn(), updateAction: vi.fn(),
  getStaffTicketDetail: vi.fn(), getTicketDetail: vi.fn(), getTicketComments: vi.fn(),
  updateStaffAssignment: vi.fn(),
}));

const list = vi.mocked(getActionPage);
const create = vi.mocked(createAction);
const update = vi.mocked(updateAction);
const staffDetail = vi.mocked(getStaffTicketDetail);
const requesterDetail = vi.mocked(getTicketDetail);
const comments = vi.mocked(getTicketComments);
const actor = { id: 7, name: "Staff Seven", email: "staff@test", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false };
const owner = { ...actor, id: 8, name: "Owner Eight" };
const oldAction: ActionRecord = {
  id: 11, ticketId: 501, actionAt: "2026-09-01T00:00:00Z",
  description: "Checked cable", result: "Connected", performedBy: actor,
  followUpRequired: false, followUpNote: null, attachmentNotes: null,
  ticketOwner: owner, createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z", version: 1,
};
const page = (items: ActionRecord[], number = 1, totalPages = 1) => ({
  items, pagination: { page: number, pageSize: 100, totalItems: items.length, totalPages },
});
const ticket = {
  version: 1,
  id: 501, ticketNumber: "TKT-501", summary: "Connection fails",
  requester: { id: 10, name: "Requester", email: "requester@test" },
  category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "Wi-Fi" },
  description: "Cannot connect", requestedPriority: "HIGH" as const,
  itPriority: "HIGH" as const, currentStatus: "OPEN" as const,
  owner: { id: 8, name: "Owner Eight", role: "IT_STAFF" as const },
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
  attachments: [], comments: [], internalNotes: [], requesterResolvedAt: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  list.mockResolvedValue(page([]));
  staffDetail.mockResolvedValue({ ticket, comments: [], internalNotes: [] });
  requesterDetail.mockResolvedValue(ticket);
  comments.mockResolvedValue([]);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("UI-01 Actions Taken Staff UI", () => {
  it.each([false, true])("preserves a confirmed create when an older GET arrives later (snapshot includes new Action: %s)", async (includesNew) => {
    const user = userEvent.setup();
    const newAction = { ...oldAction, id: 12, actionAt: "2026-09-02T00:00:00Z", description: "New diagnosis" };
    let finishList!: (value: ReturnType<typeof page>) => void;
    list.mockImplementationOnce(() => new Promise((resolve) => { finishList = resolve; }));
    create.mockResolvedValueOnce({ action: newAction });
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    expect(screen.getByText("Loading Actions Taken...")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Action description"), "New diagnosis");
    await user.type(screen.getByLabelText("Result"), "Connected");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    await screen.findByText("Action created successfully.");
    await act(async () => finishList(page(includesNew ? [newAction, oldAction] : [oldAction])));
    expect(await screen.findByText("Action #12")).toBeInTheDocument();
    expect(screen.getByText("Action #11")).toBeInTheDocument();
    expect(screen.getAllByText("Action #12")).toHaveLength(1);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("Action #11"), expect.stringContaining("Action #12"),
    ]);
    expect(screen.getByText("Action created successfully.")).toBeInTheDocument();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("keeps a newer GET version instead of overwriting it with a confirmed create", async () => {
    const user = userEvent.setup();
    const created = { ...oldAction, id: 12, actionAt: "2026-09-02T00:00:00Z", description: "New diagnosis" };
    const latest = { ...created, result: "Updated by another Staff member", version: 2, updatedAt: "2026-09-02T01:00:00Z" };
    let finishList!: (value: ReturnType<typeof page>) => void;
    list.mockImplementationOnce(() => new Promise((resolve) => { finishList = resolve; }));
    create.mockResolvedValueOnce({ action: created });
    update.mockResolvedValueOnce({ action: { ...latest, version: 3 } });
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await user.type(screen.getByLabelText("Action description"), "New diagnosis");
    await user.type(screen.getByLabelText("Result"), "Connected");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    await screen.findByText("Action created successfully.");
    await act(async () => finishList(page([latest, oldAction])));
    expect(await screen.findByText("Updated by another Staff member")).toBeInTheDocument();
    expect(screen.getAllByText("Action #12")).toHaveLength(1);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("Action #11"), expect.stringContaining("Action #12"),
    ]);
    await user.click(screen.getByRole("button", { name: "Edit Action #12" }));
    expect(screen.getByLabelText("Result")).toHaveValue(latest.result);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Action updated successfully.");
    expect(update).toHaveBeenCalledWith(501, 12, expect.objectContaining({ result: latest.result }), 2);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("updates Action Ticket Owner after Claim, Reassign and Unassign without changing performer or edit draft", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue(page([oldAction]));
    const assigned = { id: 42, name: "Staff Forty Two", role: "IT_STAFF" as const };
    vi.mocked(updateStaffAssignment)
      .mockResolvedValueOnce({ ticket: { ...ticket, owner: actor } })
      .mockResolvedValueOnce({ ticket: { ...ticket, owner: assigned } })
      .mockResolvedValueOnce({ ticket: { ...ticket, owner: null } });
    render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />);
    await user.click(await screen.findByRole("button", { name: "Edit Action #11" }));
    await user.clear(screen.getByLabelText("Result"));
    await user.type(screen.getByLabelText("Result"), "Preserved correction");
    const action = within(screen.getByRole("region", { name: "Actions Taken" })).getByRole("listitem");
    const ownerCell = () => within(action).getByText("Ticket owner").nextElementSibling;
    const performerCell = () => within(action).getByText("Performed by").nextElementSibling;
    for (const [button, ownerName, inputValue] of [
      ["Claim", "Staff Seven", "Staff Seven (7)"],
      ["Assign/Reassign", "Staff Forty Two", "Staff Forty Two (42)"],
      ["Unassign", "Unassigned", "Unassigned"],
    ]) {
      if (button === "Assign/Reassign") {
        await user.clear(screen.getByLabelText("Owner ID for assignment"));
        await user.type(screen.getByLabelText("Owner ID for assignment"), "42");
      }
      await user.click(screen.getByRole("button", { name: button }));
      await waitFor(() => expect(screen.getByLabelText("Owner", { exact: true })).toHaveValue(inputValue));
      expect(ownerCell()).toHaveTextContent(ownerName);
      expect(performerCell()).toHaveTextContent("Staff Seven");
      expect(screen.getByLabelText("Result")).toHaveValue("Preserved correction");
      expect(screen.getByText("Edit Action #11", { selector: "h4" })).toBeInTheDocument();
    }
    expect(list).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it("shows multiple Actions in actionAt/id order with read-only owner, performer and date", async () => {
    const later = { ...oldAction, id: 12, actionAt: "2026-09-02T00:00:00Z", description: "Rechecked" };
    list.mockResolvedValueOnce(page([later, oldAction]));
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    expect((await screen.findAllByRole("listitem"))[0]).toHaveTextContent("Action #11");
    expect(screen.getAllByText("Staff Seven")).toHaveLength(2);
    expect(screen.getAllByText("Owner Eight")).toHaveLength(2);
    expect(screen.getAllByText("Action date/time")).toHaveLength(2);
    expect(screen.queryByLabelText("Performed by")).not.toBeInTheDocument();
  });

  it("validates follow-up, guards saving, and sends only approved create fields", async () => {
    const user = userEvent.setup();
    let finish!: (value: { action: ActionRecord }) => void;
    create.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await screen.findByText("No Actions Taken yet.");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    expect(screen.getByText("Enter an Action description.")).toBeInTheDocument();
    expect(screen.getByLabelText("Action description")).toHaveAttribute("aria-describedby");
    await user.type(screen.getByLabelText("Action description"), "Checked cable");
    await user.type(screen.getByLabelText("Result"), "Connected");
    await user.click(screen.getByLabelText("Follow-up required"));
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    expect(screen.getByText("Enter a follow-up note when follow-up is required.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Follow-up note"), "Call requester");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    expect(create).toHaveBeenCalledWith(501, {
      description: "Checked cable", result: "Connected", followUpRequired: true,
      followUpNote: "Call requester", attachmentNotes: null,
    });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    finish({ action: { ...oldAction, followUpRequired: true, followUpNote: "Call requester" } });
    expect(await screen.findByText("Action created successfully.")).toBeInTheDocument();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("keeps edits on stale conflict and requires explicit latest-version review before retry", async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce(page([oldAction])).mockResolvedValueOnce(page([{ ...oldAction, version: 2, result: "Changed elsewhere" }]));
    update.mockRejectedValueOnce(new TicketApiError("Stale", 409, "STALE_UPDATE"));
    update.mockResolvedValueOnce({ action: { ...oldAction, version: 3, result: "My correction" } });
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await user.click(await screen.findByRole("button", { name: "Edit Action #11" }));
    await user.clear(screen.getByLabelText("Result"));
    await user.type(screen.getByLabelText("Result"), "My correction");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Your form is preserved/)).toBeInTheDocument();
    expect(screen.getByLabelText("Result")).toHaveValue("My correction");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Use latest version" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(update).toHaveBeenLastCalledWith(501, 11, expect.objectContaining({ result: "My correction" }), 2));
  });

  it("keeps POST uncertain through all pages, identical old text, late save and refresh", async () => {
    const user = userEvent.setup();
    const late = { ...oldAction, id: 99, actionAt: "2026-09-03T00:00:00Z" };
    list.mockReset();
    let read = 0;
    list.mockImplementation(async (_id, _audience, number) => {
      read += 1;
      if (read === 1) return page([oldAction]);
      if (read === 2 || read === 4) return page([oldAction], 1, 2);
      if (read === 3) return page([], 2, 2);
      return page([late], number, 2);
    });
    create.mockRejectedValueOnce(new TicketApiError("Unknown", 0, "NETWORK_RESULT_UNKNOWN"));
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await screen.findByRole("button", { name: "Edit Action #11" });
    await user.type(screen.getByLabelText("Action description"), "Checked cable");
    await user.type(screen.getByLabelText("Result"), "Connected");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    expect(await screen.findByText(/Submission uncertain/)).toBeInTheDocument();
    expect(screen.getByLabelText("Action description")).toHaveValue("Checked cable");
    expect(screen.getByRole("button", { name: /Send a new Action/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Refresh all Actions" }));
    await screen.findByText(/Submission still uncertain/);
    expect(screen.getByText("Action #99")).toBeInTheDocument();
    expect(screen.queryByText("Action created successfully.")).not.toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(501, "staff", 2);
    expect(create).toHaveBeenCalledTimes(1);
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: /Send a new Action/ }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("duplicate"));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("preserves the draft when reconciliation GET fails and never retries POST automatically", async () => {
    const user = userEvent.setup();
    list.mockResolvedValueOnce(page([])).mockRejectedValueOnce(new Error("offline"));
    create.mockRejectedValueOnce(new TicketApiError("Unknown", 0, "NETWORK_RESULT_UNKNOWN"));
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await screen.findByText("No Actions Taken yet.");
    await user.type(screen.getByLabelText("Action description"), "Investigated");
    await user.type(screen.getByLabelText("Result"), "Pending");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    expect(await screen.findByText(/Unable to reload Actions; your form is preserved/)).toBeInTheDocument();
    expect(screen.getByLabelText("Result")).toHaveValue("Pending");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("requires a fresh review and explicit duplicate-risk confirmation before a new POST", async () => {
    const user = userEvent.setup();
    create.mockRejectedValueOnce(new TicketApiError("Unknown", 0, "NETWORK_RESULT_UNKNOWN"));
    create.mockResolvedValueOnce({ action: oldAction });
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await screen.findByText("No Actions Taken yet.");
    await user.type(screen.getByLabelText("Action description"), "Checked cable");
    await user.type(screen.getByLabelText("Result"), "Connected");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    expect(await screen.findByRole("button", { name: /Send a new Action/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Refresh all Actions" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Send a new Action/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /Send a new Action/ }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("duplicate"));
    expect(create).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Action created successfully.")).toBeInTheDocument();
  });

  it("maps server validation to labelled fields and keeps the draft", async () => {
    const user = userEvent.setup();
    create.mockRejectedValueOnce(new TicketApiError("Invalid", 400, "VALIDATION_ERROR", { result: "A result is required." }));
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await screen.findByText("No Actions Taken yet.");
    await user.type(screen.getByLabelText("Action description"), "Checked cable");
    await user.type(screen.getByLabelText("Result"), "Connected");
    await user.click(screen.getByRole("button", { name: "Create Action" }));
    expect(await screen.findByText("A result is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Result")).toHaveValue("Connected");
    expect(screen.getByLabelText("Result")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a safe list failure without losing the create form", async () => {
    const user = userEvent.setup();
    list.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(page([]));
    render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    expect(await screen.findByText(/Unable to load Actions Taken/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Action description"), "Keep this text");
    await user.click(screen.getByRole("button", { name: "Retry loading Actions" }));
    await screen.findByText("No Actions Taken yet.");
    expect(screen.getByLabelText("Action description")).toHaveValue("Keep this text");
  });

  it("mounts on Staff Ticket Detail and stays read-only on closed Tickets", async () => {
    list.mockResolvedValue(page([oldAction]));
    render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Edit Action #11" })).toBeInTheDocument();
    render(<ActionsTaken ticketId={502} audience="staff" ticketStatus="CLOSED" />);
    expect(await screen.findByText(/cannot be changed on a closed or cancelled Ticket/)).toBeInTheDocument();
  });

  it("lets Administrator edit Actions without enabling Lab 3 status controls", async () => {
    list.mockResolvedValue(page([oldAction]));
    render(<StaffTicketDetail ticketId={501} currentUserId={8} role="ADMINISTRATOR" onBack={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Edit Action #11" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Change Status" })).toBeDisabled();
  });

  it("has keyboard-reachable labelled fields and responsive Action rows", async () => {
    list.mockResolvedValue(page([oldAction]));
    const user = userEvent.setup();
    const { container } = render(<ActionsTaken ticketId={501} audience="staff" ticketStatus="OPEN" />);
    await screen.findByRole("button", { name: "Edit Action #11" });
    expect(container.querySelector(".flex-column.flex-sm-row")).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", { name: "Edit Action #11" })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Action description")).toHaveFocus();
  });
});

describe("UI-02 Requester read-only Actions", () => {
  it("shows owned Ticket Actions without create, edit or delete controls", async () => {
    list.mockResolvedValue(page([oldAction]));
    render(<RequesterTicketDetail requesterId={10} ticketId={501} onBack={vi.fn()} />);
    expect(await screen.findByText("Action #11")).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(501, "requester", 1);
    expect(screen.getByText("Actions Taken are read-only for Requesters.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create Action|Edit Action|Delete Action/ })).not.toBeInTheDocument();
  });

  it("shows safe failure for requester Action list without exposing a write form", async () => {
    list.mockRejectedValueOnce(new TicketApiError("hidden", 404, "TICKET_NOT_FOUND"));
    render(<ActionsTaken ticketId={501} audience="requester" />);
    expect(await screen.findByText(/Unable to load Actions Taken/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Action description")).not.toBeInTheDocument();
  });
});
