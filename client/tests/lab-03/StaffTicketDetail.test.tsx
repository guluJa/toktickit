import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketDetail from "../../src/StaffTicketDetail.js";
import { getStaffTicketDetail, updateStaffAssignment, updateStaffPriority, updateStaffStatus, createStaffComment, createInternalNote, downloadAttachment, StaffTicketDetailResponse, TicketApiError } from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../src/api.js")>()), getStaffTicketDetail: vi.fn(), updateStaffAssignment: vi.fn(), updateStaffPriority: vi.fn(), updateStaffStatus: vi.fn(), createStaffComment: vi.fn(), createInternalNote: vi.fn(), downloadAttachment: vi.fn() }));
const mockedGet = vi.mocked(getStaffTicketDetail); const mockedAssign = vi.mocked(updateStaffAssignment); const mockedPriority = vi.mocked(updateStaffPriority); const mockedStatus = vi.mocked(updateStaffStatus); const mockedComment = vi.mocked(createStaffComment); const mockedNote = vi.mocked(createInternalNote); const mockedDownload = vi.mocked(downloadAttachment);
const ticket = { id: 501, ticketNumber: "TKT-STAFF-501", summary: "Cannot connect", requester: { id: 10, name: "Requester", email: "requester@test" }, category: { id: 1, name: "Hardware" }, relatedSystem: { id: 2, name: "Campus Wi-Fi" }, requestedPriority: "HIGH" as const, itPriority: "HIGH" as const, description: "Connection fails.", currentStatus: "NEW" as const, owner: null, requesterResolvedAt: null, createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z", attachments: [{ id: 1, ticketId: 501, originalName: "evidence.png", mimeType: "image/png", sizeBytes: 12, state: "ACTIVE" as const, uploadedAt: "2026-09-01T00:00:00Z", removedAt: null, removalReason: null }], comments: [], internalNotes: [] };
function response(overrides: Partial<StaffTicketDetailResponse> = {}): StaffTicketDetailResponse { return { ticket, comments: [], internalNotes: [], ...overrides }; }
beforeEach(() => { vi.resetAllMocks(); mockedGet.mockResolvedValue(response()); mockedAssign.mockResolvedValue({ ticket: { ...ticket, owner: { id: 7, name: "Staff", role: "IT_STAFF" } } }); mockedPriority.mockResolvedValue({ ticket: { ...ticket, itPriority: "LOW" } }); mockedStatus.mockResolvedValue({ ticket: { ...ticket, currentStatus: "OPEN" } }); mockedComment.mockResolvedValue({ id: 9, author: { id: 7, name: "Staff" }, content: "Staff update", createdAt: "2026-09-01T01:00:00Z" }); mockedNote.mockResolvedValue({ id: 10, author: { id: 7, name: "Staff" }, content: "Private note", createdAt: "2026-09-01T01:00:00Z" }); mockedDownload.mockResolvedValue({ blob: new Blob(["evidence"]), filename: "evidence.png" }); vi.spyOn(window, "confirm").mockReturnValue(true); });

describe("Staff Ticket Detail", () => {
  it("renders read-only and operational fields and supports assignment, priority and confirmed status", async () => {
    const user = userEvent.setup(); render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />); await screen.findByRole("heading", { name: "TKT-STAFF-501" });
    expect(screen.getByText("Requester")).toBeInTheDocument(); expect(screen.getAllByText("HIGH").length).toBeGreaterThanOrEqual(1); expect(screen.getByText("Requester Resolved")).toBeInTheDocument();
    expect(screen.getByLabelText("Status").querySelectorAll("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "OPEN" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "RESOLVED" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Claim" })); expect(mockedAssign).toHaveBeenCalledWith(501, 7);
    await user.selectOptions(screen.getByLabelText("IT Priority"), "LOW"); await user.click(screen.getByRole("button", { name: "Save IT Priority" })); expect(mockedPriority).toHaveBeenCalledWith(501, "LOW");
    await user.selectOptions(screen.getByLabelText("Status"), "OPEN"); await user.click(screen.getByRole("button", { name: "Change Status" })); expect(mockedStatus).toHaveBeenCalledWith(501, "OPEN");
  });

  it("requires confirmation and validates blank Public Comments", async () => {
    const user = userEvent.setup();
    render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Public Comments" });
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    expect(mockedStatus).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Add Comment" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Comment must contain 1-5000 characters");
    expect(mockedComment).not.toHaveBeenCalled();
  });

  it("shows conflict feedback when a status transition is rejected", async () => {
    const user = userEvent.setup();
    mockedStatus.mockRejectedValueOnce(new TicketApiError("Transition is not allowed.", 409, "STATUS_TRANSITION_NOT_ALLOWED"));
    render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />);
    await screen.findByRole("heading", { name: "Public Comments" });
    await user.selectOptions(screen.getByLabelText("Status"), "OPEN");
    await user.click(screen.getByRole("button", { name: "Change Status" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Transition is not allowed.");
  });
  it("separates Public Comments and Internal Notes with role-specific creation", async () => {
    const user = userEvent.setup(); render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />); await screen.findByRole("heading", { name: "Public Comments" });
    await user.type(screen.getByLabelText("Add a public comment"), "Staff update"); await user.click(screen.getByRole("button", { name: "Add Comment" })); await waitFor(() => expect(mockedComment).toHaveBeenCalledWith(501, "Staff update"));
    await user.type(screen.getByLabelText("Add an internal note"), "Private note"); await user.click(screen.getByRole("button", { name: "Add Note" })); await waitFor(() => expect(mockedNote).toHaveBeenCalledWith(501, "Private note")); expect(screen.getByText(/Private to IT Staff and Administrators/)).toBeInTheDocument();
  });
  it("keeps Administrator assignment/status/comments/notes read-only and downloads active attachments", async () => {
    const user = userEvent.setup(); render(<StaffTicketDetail ticketId={501} currentUserId={8} role="ADMINISTRATOR" onBack={vi.fn()} />); await screen.findByRole("heading", { name: "TKT-STAFF-501" });
    expect(screen.getByRole("button", { name: "Claim" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Unassign" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Assign/Reassign" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Change Status" })).toBeDisabled(); expect(screen.queryByLabelText("Add a public comment")).not.toBeInTheDocument(); expect(screen.queryByLabelText("Add an internal note")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Download" })); await waitFor(() => expect(mockedDownload).toHaveBeenCalledWith(0, 1));
  });

  it.each([
    [403, "Access denied. You cannot view this Ticket."],
    [404, "Ticket not found."],
  ])("shows safe state for %s detail response", async (statusCode, message) => {
    mockedGet.mockRejectedValueOnce(new TicketApiError("safe failure", statusCode, "SAFE_ERROR"));
    render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("shows retry for an unexpected detail failure", async () => {
    mockedGet.mockRejectedValueOnce(new TicketApiError("server failure", 500, "INTERNAL_ERROR"));
    render(<StaffTicketDetail ticketId={501} currentUserId={7} role="IT_STAFF" onBack={vi.fn()} />);
    expect(await screen.findByText(/Unable to load Staff Ticket Detail/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
