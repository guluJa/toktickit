import { FormEvent, useEffect, useState } from "react";
import {
  createInternalNote,
  createStaffComment,
  downloadAttachment,
  getStaffTicketDetail,
  InternalNote,
  PublicComment,
  RequestedPriority,
  StaffTicketDetailResponse,
  TicketApiError,
  TicketStatus,
  updateStaffAssignment,
  updateStaffPriority,
  updateStaffStatus,
} from "./api.js";

type Role = "IT_STAFF" | "ADMINISTRATOR";
type ScreenState = "loading" | "ready" | "forbidden" | "not-found" | "error";
const priorities: RequestedPriority[] = ["LOW", "MEDIUM", "HIGH"];
const allowedStatusTransitions: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: [],
  CANCELLED: [],
};

function formatDate(value: string) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function Message({ kind, children }: { kind: "success" | "danger" | "warning"; children: React.ReactNode }) { return <div className={`alert alert-${kind}`} role="alert" aria-live="polite">{children}</div>; }
function EntryList({ entries, empty }: { entries: Array<PublicComment | InternalNote>; empty: string }) { return entries.length ? <ul className="list-group mb-3">{entries.map((entry) => <li className="list-group-item" key={entry.id}><strong>{entry.author.name}</strong><span className="text-body-secondary ms-2">{formatDate(entry.createdAt)}</span><p className="mb-0 mt-1 text-break">{entry.content}</p></li>)}</ul> : <p className="text-body-secondary">{empty}</p>; }

export default function StaffTicketDetail({ ticketId, currentUserId, role, onBack }: { ticketId: number; currentUserId: number; role: Role; onBack: () => void }) {
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [data, setData] = useState<StaffTicketDetailResponse | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "danger" | "warning"; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [priority, setPriority] = useState<RequestedPriority>("MEDIUM");
  const [status, setStatus] = useState<TicketStatus>("NEW");
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");

  async function load() { setScreen("loading"); setFeedback(null); try { const result = await getStaffTicketDetail(ticketId); setData(result); setOwnerId(result.ticket.owner ? String(result.ticket.owner.id) : ""); setPriority(result.ticket.itPriority ?? result.ticket.requestedPriority); setStatus(result.ticket.currentStatus); setScreen("ready"); } catch (error) { const statusCode = error instanceof TicketApiError ? error.status : 0; setScreen(statusCode === 403 ? "forbidden" : statusCode === 404 ? "not-found" : "error"); } }
  useEffect(() => { void load(); }, [ticketId]);

  async function save(action: string, operation: () => Promise<{ ticket: typeof data extends null ? never : NonNullable<typeof data>["ticket"] }>) { setBusy(action); setFeedback(null); try { const result = await operation(); setData((current) => current ? { ...current, ticket: result.ticket } : current); setFeedback({ kind: "success", text: "Ticket updated successfully." }); } catch (error) { const apiError = error instanceof TicketApiError ? error : null; setFeedback({ kind: apiError?.status === 409 ? "warning" : "danger", text: apiError?.message ?? "Unable to update the Ticket. Please try again." }); } finally { setBusy(""); } }
  function submitAssignment(event: FormEvent) { event.preventDefault(); const value = ownerId.trim(); if (!value || !/^[1-9]\d*$/.test(value)) { setFeedback({ kind: "danger", text: "Enter a valid active owner ID or use Unassign." }); return; } void save("assignment", () => updateStaffAssignment(ticketId, Number(value))); }
  function changeStatus() { if (!window.confirm(`Change Ticket status to ${status}?`)) return; void save("status", () => updateStaffStatus(ticketId, status)); }
  async function addComment(event: FormEvent) { event.preventDefault(); const content = comment.trim(); if (!content || content.length > 5000) { setFeedback({ kind: "danger", text: "Comment must contain 1-5000 characters." }); return; } setBusy("comment"); setFeedback(null); try { const created = await createStaffComment(ticketId, content); setData((current) => current ? { ...current, comments: [...current.comments, created] } : current); setComment(""); setFeedback({ kind: "success", text: "Public Comment added successfully." }); } catch (error) { setFeedback({ kind: "danger", text: error instanceof Error ? error.message : "Unable to add Public Comment." }); } finally { setBusy(""); } }
  async function addNote(event: FormEvent) { event.preventDefault(); const content = note.trim(); if (!content || content.length > 5000) { setFeedback({ kind: "danger", text: "Internal Note must contain 1-5000 characters." }); return; } setBusy("note"); setFeedback(null); try { const created = await createInternalNote(ticketId, content); setData((current) => current ? { ...current, internalNotes: [...current.internalNotes, created] } : current); setNote(""); setFeedback({ kind: "success", text: "Internal Note added successfully." }); } catch (error) { setFeedback({ kind: "danger", text: error instanceof Error ? error.message : "Unable to add Internal Note." }); } finally { setBusy(""); } }
  async function download(id: number) { setBusy(`download-${id}`); setFeedback(null); try { const result = await downloadAttachment(0, id); const url = URL.createObjectURL(result.blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.filename; anchor.click(); URL.revokeObjectURL(url); setFeedback({ kind: "success", text: "Attachment download started." }); } catch (error) { setFeedback({ kind: "danger", text: error instanceof Error ? error.message : "Unable to download Attachment." }); } finally { setBusy(""); } }

  if (screen === "loading") return <div className="alert alert-info" role="status">Loading Staff Ticket Detail...</div>;
  if (screen === "forbidden") return <section><Message kind="warning">Access denied. You cannot view this Ticket.</Message><button className="btn btn-outline-success" onClick={onBack}>Back to Staff Queue</button></section>;
  if (screen === "not-found") return <section><Message kind="warning">Ticket not found.</Message><button className="btn btn-outline-success" onClick={onBack}>Back to Staff Queue</button></section>;
  if (screen === "error" || !data) return <section><Message kind="danger">Unable to load Staff Ticket Detail. Please try again.</Message><button className="btn btn-outline-success me-2" onClick={() => void load()}>Retry</button><button className="btn btn-outline-success" onClick={onBack}>Back to Staff Queue</button></section>;

  const { ticket, comments, internalNotes } = data;
  const isStaff = role === "IT_STAFF";
  const permittedStatuses = [ticket.currentStatus, ...allowedStatusTransitions[ticket.currentStatus]];
  return <section aria-labelledby="staff-ticket-detail-title">
    <button className="btn btn-link text-success px-0 mb-3" onClick={onBack}>Back to Staff Queue</button>
    <div className="d-flex justify-content-between align-items-start mb-3"><div><p className="text-body-secondary mb-1">Staff Ticket Detail</p><h2 id="staff-ticket-detail-title" className="h3">{ticket.ticketNumber}</h2><p className="mb-0">{ticket.summary}</p></div><span className="badge text-bg-success">{ticket.currentStatus}</span></div>
    {feedback && <Message kind={feedback.kind}>{feedback.text}</Message>}
    <div className="row g-3">
      <section className="col-12 col-lg-6"><div className="card h-100"><div className="card-body"><h3 className="h5">Ticket Information</h3><dl className="row mb-0"><dt className="col-sm-5">Ticket Date</dt><dd className="col-sm-7">{formatDate(ticket.createdAt)}</dd><dt className="col-sm-5">Last Updated</dt><dd className="col-sm-7">{formatDate(ticket.updatedAt)}</dd><dt className="col-sm-5">Requested Priority</dt><dd className="col-sm-7"><span className="badge text-bg-warning">{ticket.requestedPriority}</span></dd><dt className="col-sm-5">Requester Resolved</dt><dd className="col-sm-7">{ticket.requesterResolvedAt ? "Yes" : "No"}</dd></dl></div></div></section>
      <section className="col-12 col-lg-6"><div className="card h-100"><div className="card-body"><h3 className="h5">Requester Information</h3><dl className="row mb-0"><dt className="col-sm-4">Name</dt><dd className="col-sm-8">{ticket.requester.name}</dd><dt className="col-sm-4">Email</dt><dd className="col-sm-8">{ticket.requester.email}</dd><dt className="col-sm-4">Category</dt><dd className="col-sm-8">{ticket.category.name}</dd><dt className="col-sm-4">Related System</dt><dd className="col-sm-8">{ticket.relatedSystem.name}</dd></dl></div></div></section>
      <section className="col-12"><div className="card"><div className="card-body"><h3 className="h5">Request Description <span className="badge text-bg-light">Read-only</span></h3><p className="mb-0 text-break">{ticket.description}</p></div></div></section>
      <section className="col-12"><div className="card border-success"><div className="card-body"><h3 className="h5">Operational Fields</h3><p className="text-body-secondary">Only permitted operational fields are editable. Requested Priority and requesterResolved are read-only.</p><div className="row g-3"><div className="col-12 col-md-4"><label className="form-label" htmlFor="staff-owner">Owner</label><div className="input-group"><input id="staff-owner" className="form-control" value={ticket.owner ? `${ticket.owner.name} (${ticket.owner.id})` : "Unassigned"} readOnly /><button className="btn btn-outline-success" type="button" disabled={!isStaff || Boolean(busy)} onClick={() => void save("assignment", () => updateStaffAssignment(ticketId, currentUserId))}>Claim</button><button className="btn btn-outline-danger" type="button" disabled={!isStaff || Boolean(busy)} onClick={() => void save("assignment", () => updateStaffAssignment(ticketId, null))}>Unassign</button></div><form className="input-group mt-2" onSubmit={submitAssignment}><input aria-label="Owner ID for assignment" className="form-control" value={ownerId} onChange={(event) => setOwnerId(event.target.value)} placeholder="Active owner ID" disabled={!isStaff || Boolean(busy)} /><button className="btn btn-outline-success" disabled={!isStaff || Boolean(busy)}>Assign/Reassign</button></form></div><div className="col-12 col-md-4"><label className="form-label" htmlFor="staff-priority">IT Priority</label><select id="staff-priority" className="form-select" value={priority} onChange={(event) => setPriority(event.target.value as RequestedPriority)} disabled={Boolean(busy)}>{priorities.map((value) => <option key={value}>{value}</option>)}</select><button className="btn btn-success mt-2" disabled={Boolean(busy) || priority === ticket.itPriority} onClick={() => void save("priority", () => updateStaffPriority(ticketId, priority))}>Save IT Priority</button></div><div className="col-12 col-md-4"><label className="form-label" htmlFor="staff-status">Status</label><select id="staff-status" className="form-select" value={status} onChange={(event) => setStatus(event.target.value as TicketStatus)} disabled={!isStaff || Boolean(busy)}>{permittedStatuses.map((value) => <option key={value}>{value}</option>)}</select><button className="btn btn-success mt-2" disabled={!isStaff || Boolean(busy) || status === ticket.currentStatus} onClick={changeStatus}>Change Status</button></div></div></div></div></section>
      <section className="col-12 col-lg-6"><div className="card"><div className="card-body"><h3 className="h5">Public Comments</h3><p className="text-body-secondary">Visible to Requester, IT Staff and Administrator.</p><EntryList entries={comments} empty="No public comments yet." />{isStaff && <form onSubmit={addComment}><label className="form-label" htmlFor="staff-public-comment">Add a public comment</label><textarea id="staff-public-comment" className="form-control mb-2" rows={3} maxLength={5000} value={comment} onChange={(event) => setComment(event.target.value)} disabled={Boolean(busy)} /><button className="btn btn-outline-success" disabled={Boolean(busy)}>{busy === "comment" ? "Adding..." : "Add Comment"}</button></form>}</div></div></section>
      <section className="col-12 col-lg-6"><div className="card border-warning"><div className="card-body"><h3 className="h5">Internal Notes</h3><p className="text-warning-emphasis">Private to IT Staff and Administrators. Never shown to Requesters.</p><EntryList entries={internalNotes} empty="No internal notes yet." />{isStaff && <form onSubmit={addNote}><label className="form-label" htmlFor="staff-internal-note">Add an internal note</label><textarea id="staff-internal-note" className="form-control mb-2" rows={3} maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} disabled={Boolean(busy)} /><button className="btn btn-outline-warning" disabled={Boolean(busy)}>{busy === "note" ? "Adding..." : "Add Note"}</button></form>}</div></div></section>
      <section className="col-12"><div className="card"><div className="card-body"><h3 className="h5">Attachments</h3>{ticket.attachments.length ? <ul className="list-group">{ticket.attachments.map((attachment) => <li className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2" key={attachment.id}><span><strong>{attachment.originalName}</strong><small className="d-block text-body-secondary">{attachment.mimeType} · {attachment.sizeBytes} B · {attachment.state}</small>{attachment.removedAt && <small className="d-block text-danger">Removed: {formatDate(attachment.removedAt)} — {attachment.removalReason}</small>}</span>{attachment.state === "ACTIVE" && <button className="btn btn-outline-success btn-sm" disabled={Boolean(busy)} onClick={() => void download(attachment.id)}>Download</button>}</li>)}</ul> : <p className="text-body-secondary mb-0">No Attachments.</p>}</div></div></section>
    </div>
  </section>;
}
