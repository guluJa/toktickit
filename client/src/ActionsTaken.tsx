import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ActionFields, ActionTaken as ActionRecord, createAction, getActionPage,
  TicketApiError, updateAction,
} from "./api.js";

type Audience = "staff" | "requester";
type ListState = "loading" | "ready" | "error";
type FormMode = "create" | "edit";

const blank: ActionFields = {
  description: "", result: "", followUpRequired: false,
  followUpNote: null, attachmentNotes: null,
};

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

function validate(fields: ActionFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!fields.description.trim()) errors.description = "Enter an Action description.";
  if (!fields.result.trim()) errors.result = "Enter a result.";
  if (fields.followUpRequired && !fields.followUpNote?.trim()) {
    errors.followUpNote = "Enter a follow-up note when follow-up is required.";
  }
  return errors;
}

function matchesDraft(action: ActionRecord, fields: ActionFields): boolean {
  return action.description === fields.description.trim() &&
    action.result === fields.result.trim() &&
    action.followUpRequired === fields.followUpRequired &&
    action.followUpNote === (fields.followUpRequired ? fields.followUpNote?.trim() : null) &&
    action.attachmentNotes === (fields.attachmentNotes?.trim() || null);
}

export default function ActionsTaken({ ticketId, audience, ticketStatus }: {
  ticketId: number;
  audience: Audience;
  ticketStatus?: string;
}) {
  const [items, setItems] = useState<ActionRecord[]>([]);
  const [listState, setListState] = useState<ListState>("loading");
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [draft, setDraft] = useState<ActionFields>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [reviewedSinceUncertain, setReviewedSinceUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "danger" | "warning"; text: string } | null>(null);
  const sequence = useRef(0);
  const savingGuard = useRef(false);
  const canWrite = audience === "staff" && ticketStatus !== "CLOSED" && ticketStatus !== "CANCELLED";

  async function refresh(): Promise<ActionRecord[] | null> {
    const current = ++sequence.current;
    setListState("loading");
    try {
      const loaded: ActionRecord[] = [];
      let page = 1;
      let totalPages = 1;
      while (page <= totalPages) {
        const result = await getActionPage(ticketId, audience, page);
        loaded.push(...result.items);
        totalPages = result.pagination.totalPages;
        page += 1;
      }
      if (current !== sequence.current) return null;
      loaded.sort((a, b) => a.actionAt.localeCompare(b.actionAt) || a.id - b.id);
      setItems(loaded);
      setListState("ready");
      return loaded;
    } catch {
      if (current === sequence.current) setListState("error");
      return null;
    }
  }

  useEffect(() => {
    setItems([]);
    setDraft(blank);
    setMode("create");
    setEditingId(null);
    setEditingVersion(null);
    setUncertain(false);
    setReviewedSinceUncertain(false);
    setConflict(false);
    setFeedback(null);
    void refresh();
    return () => { sequence.current += 1; };
  }, [ticketId, audience]);

  function edit(action: ActionRecord) {
    setMode("edit");
    setEditingId(action.id);
    setEditingVersion(action.version);
    setDraft({
      description: action.description, result: action.result,
      followUpRequired: action.followUpRequired, followUpNote: action.followUpNote,
      attachmentNotes: action.attachmentNotes,
    });
    setErrors({});
    setConflict(false);
    setFeedback(null);
  }

  function newAction() {
    setMode("create");
    setEditingId(null);
    setEditingVersion(null);
    setDraft(blank);
    setErrors({});
    setConflict(false);
    setFeedback(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || savingGuard.current || (mode === "edit" && conflict) || (mode === "create" && uncertain && !reviewedSinceUncertain)) return;
    const validation = validate(draft);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    if (mode === "create" && uncertain && !window.confirm(
      "The earlier request may still save an Action. Sending again may create a duplicate. Send a new request?",
    )) return;
    savingGuard.current = true;
    setSaving(true);
    setFeedback(null);
    const fields: ActionFields = {
      description: draft.description.trim(), result: draft.result.trim(),
      followUpRequired: draft.followUpRequired,
      followUpNote: draft.followUpRequired ? draft.followUpNote?.trim() || null : null,
      attachmentNotes: draft.attachmentNotes?.trim() || null,
    };
    try {
      if (mode === "create") {
        const result = await createAction(ticketId, fields);
        setItems((current) => [...current, result.action].sort(
          (a, b) => a.actionAt.localeCompare(b.actionAt) || a.id - b.id,
        ));
        setDraft(blank);
        setUncertain(false);
        setReviewedSinceUncertain(false);
        setFeedback({ kind: "success", text: "Action created successfully." });
      } else if (editingId !== null && editingVersion !== null) {
        const result = await updateAction(ticketId, editingId, fields, editingVersion);
        setItems((current) => current.map((item) => item.id === editingId ? result.action : item));
        setEditingVersion(result.action.version);
        setConflict(false);
        setFeedback({ kind: "success", text: "Action updated successfully." });
      }
    } catch (error) {
      const apiError = error instanceof TicketApiError ? error : null;
      if (mode === "create" && (!apiError || apiError.status === 0 || apiError.status >= 500)) {
        setUncertain(true);
        setReviewedSinceUncertain(false);
        setFeedback({ kind: "warning", text: "Submission uncertain: the Action may still be saved. Review all Actions before deciding whether to send again. Matching text does not prove which request created an Action." });
        const loaded = await refresh();
        if (!loaded) setFeedback({ kind: "warning", text: "Submission uncertain. Unable to reload Actions; your form is preserved. Try refreshing the list before deciding whether to send again." });
      } else if (mode === "edit" && apiError?.status === 409) {
        setConflict(true);
        setFeedback({ kind: "warning", text: "This Action changed or the Ticket no longer permits editing. Your form is preserved. Reload the latest Action before choosing whether to retry." });
        await refresh();
      } else if (apiError?.status === 400 && Object.keys(apiError.fields).length) {
        setErrors(apiError.fields);
        setFeedback({ kind: "danger", text: "Check the highlighted Action fields." });
      } else {
        setFeedback({ kind: "danger", text: "Unable to save Action Taken. Your form is preserved; please review and try again." });
      }
    } finally {
      savingGuard.current = false;
      setSaving(false);
    }
  }

  async function refreshForReview() {
    const loaded = await refresh();
    if (!loaded) setFeedback({ kind: "warning", text: "Unable to reload Actions. Your form is preserved; try again later." });
    else if (uncertain) {
      setReviewedSinceUncertain(true);
      const candidates = loaded.filter((action) => matchesDraft(action, draft)).length;
      setFeedback({ kind: "warning", text: `Submission still uncertain. Reviewed ${loaded.length} Actions${candidates ? `; ${candidates} have matching details` : ""}. Matching details cannot confirm which request saved them. A later refresh may show more Actions.` });
    }
  }

  function useLatestVersion() {
    const latest = items.find((item) => item.id === editingId);
    if (!latest || !canWrite) return;
    setEditingVersion(latest.version);
    setConflict(false);
    setFeedback({ kind: "warning", text: "Latest Action loaded. Compare it with your preserved form before choosing Save changes." });
  }

  const prefix = audience === "staff" ? "staff" : "requester";
  const fieldId = (field: string) => `${prefix}-action-${ticketId}-${field}`;
  return <section className="card shadow-sm" aria-labelledby={fieldId("title")}>
    <div className="card-body">
      <h3 id={fieldId("title")} className="h5">Actions Taken</h3>
      <p className="text-body-secondary">Actions are ordered by Action date and ID. Ticket owner and performer are different roles.</p>
      {listState === "loading" && <p role="status" aria-live="polite">Loading Actions Taken...</p>}
      {listState === "error" && <div className="alert alert-warning" role="alert">Unable to load Actions Taken. Your form is preserved. <button type="button" className="btn btn-link p-0" onClick={() => void refreshForReview()}>Retry loading Actions</button></div>}
      {listState === "ready" && (items.length === 0 ?
        <p className="text-body-secondary">No Actions Taken yet.</p> :
        <ol className="list-group list-group-numbered mb-4">
          {items.map((action) => <li className="list-group-item" key={action.id}>
            <div className="d-flex flex-column flex-sm-row justify-content-between gap-2">
              <div className="text-break">
                <strong>Action #{action.id}</strong>
                <dl className="row mb-0 mt-2">
                  <dt className="col-sm-4">Action date/time</dt><dd className="col-sm-8">{dateTime(action.actionAt)}</dd>
                  <dt className="col-sm-4">Description</dt><dd className="col-sm-8 text-break">{action.description}</dd>
                  <dt className="col-sm-4">Result</dt><dd className="col-sm-8 text-break">{action.result}</dd>
                  <dt className="col-sm-4">Performed by</dt><dd className="col-sm-8">{action.performedBy.name}</dd>
                  <dt className="col-sm-4">Ticket owner</dt><dd className="col-sm-8">{action.ticketOwner?.name ?? "Unassigned"}</dd>
                  <dt className="col-sm-4">Follow-up required</dt><dd className="col-sm-8">{action.followUpRequired ? "Yes" : "No"}</dd>
                  <dt className="col-sm-4">Follow-up note</dt><dd className="col-sm-8 text-break">{action.followUpNote ?? "None"}</dd>
                  <dt className="col-sm-4">Attachment notes</dt><dd className="col-sm-8 text-break">{action.attachmentNotes ?? "None"}</dd>
                </dl>
              </div>
              {canWrite && <button type="button" className="btn btn-outline-success btn-sm align-self-start" disabled={saving || uncertain || listState !== "ready"} onClick={() => edit(action)}>Edit Action #{action.id}</button>}
            </div>
          </li>)}
        </ol>)}
      {feedback && <div className={`alert alert-${feedback.kind}`} role="alert" aria-live="polite">{feedback.text}</div>}
      {uncertain && <button type="button" className="btn btn-outline-warning mb-3" disabled={saving || listState === "loading"} onClick={() => void refreshForReview()}>Refresh all Actions</button>}
      {audience === "requester" && <p className="text-body-secondary mb-0">Actions Taken are read-only for Requesters.</p>}
      {audience === "staff" && !canWrite && <p className="text-body-secondary mb-0">Actions Taken cannot be changed on a closed or cancelled Ticket.</p>}
      {canWrite && <div className="border-top pt-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <h4 className="h6 mb-0">{mode === "create" ? "Create Action" : `Edit Action #${editingId}`}</h4>
          {mode === "edit" && <button type="button" className="btn btn-outline-success btn-sm" disabled={saving} onClick={newAction}>New Action</button>}
        </div>
        <p className="small text-body-secondary">Performed by is recorded automatically from your signed-in session. Action date/time and Ticket owner cannot be edited here.</p>
        <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="row g-3">
            <div className="col-12"><label className="form-label" htmlFor={fieldId("description")}>Action description</label><textarea id={fieldId("description")} className="form-control" rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? fieldId("description-error") : undefined} disabled={saving} />{errors.description && <div id={fieldId("description-error")} className="text-danger small">{errors.description}</div>}</div>
            <div className="col-12"><label className="form-label" htmlFor={fieldId("result")}>Result</label><textarea id={fieldId("result")} className="form-control" rows={3} value={draft.result} onChange={(event) => setDraft((current) => ({ ...current, result: event.target.value }))} aria-invalid={Boolean(errors.result)} aria-describedby={errors.result ? fieldId("result-error") : undefined} disabled={saving} />{errors.result && <div id={fieldId("result-error")} className="text-danger small">{errors.result}</div>}</div>
            <div className="col-12"><div className="form-check"><input id={fieldId("follow-up")} className="form-check-input" type="checkbox" checked={draft.followUpRequired} onChange={(event) => setDraft((current) => ({ ...current, followUpRequired: event.target.checked, followUpNote: event.target.checked ? current.followUpNote : null }))} disabled={saving} /><label className="form-check-label" htmlFor={fieldId("follow-up")}>Follow-up required</label></div></div>
            {draft.followUpRequired && <div className="col-12"><label className="form-label" htmlFor={fieldId("follow-up-note")}>Follow-up note</label><textarea id={fieldId("follow-up-note")} className="form-control" rows={2} value={draft.followUpNote ?? ""} onChange={(event) => setDraft((current) => ({ ...current, followUpNote: event.target.value }))} aria-invalid={Boolean(errors.followUpNote)} aria-describedby={errors.followUpNote ? fieldId("follow-up-note-error") : undefined} disabled={saving} />{errors.followUpNote && <div id={fieldId("follow-up-note-error")} className="text-danger small">{errors.followUpNote}</div>}</div>}
            <div className="col-12"><label className="form-label" htmlFor={fieldId("attachment-notes")}>Attachment notes (optional)</label><textarea id={fieldId("attachment-notes")} className="form-control" rows={2} value={draft.attachmentNotes ?? ""} onChange={(event) => setDraft((current) => ({ ...current, attachmentNotes: event.target.value }))} disabled={saving} /></div>
          </div>
          {conflict && <div className="alert alert-warning mt-3">Review the latest Action in the list, then choose whether to use its version. Your edits stay in this form. <button type="button" className="btn btn-outline-warning btn-sm mt-2" disabled={listState !== "ready"} onClick={useLatestVersion}>Use latest version</button></div>}
          {uncertain && mode === "create" && <p className="text-warning-emphasis mt-3">The earlier POST may still succeed. Refresh all Actions before deciding whether to send again; a new request may create a duplicate.</p>}
          <button type="submit" className="btn btn-success mt-3" disabled={saving || (mode === "edit" && conflict) || (mode === "create" && uncertain && !reviewedSinceUncertain)} aria-busy={saving}>{saving ? "Saving..." : mode === "edit" ? "Save changes" : uncertain ? "Send a new Action (duplicate risk)" : "Create Action"}</button>
        </form>
      </div>}
    </div>
  </section>;
}
