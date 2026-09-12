import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  createTicketComment,
  getTicketComments,
  getTicketDetail,
  markTicketResolved,
  TicketApiError,
  TicketDetail,
  PublicComment,
} from "./api.js";
import AttachmentSection from "./AttachmentSection.js";

type DetailViewState =
  | "loading"
  | "loaded"
  | "not-found"
  | "error";

interface RequesterTicketDetailProps {
  requesterId: number;
  ticketId: number;
  onBack: () => void;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function RequesterTicketDetail({
  requesterId,
  ticketId,
  onBack,
}: RequesterTicketDetailProps) {
  const [viewState, setViewState] =
    useState<DetailViewState>("loading");
  const [ticket, setTicket] =
    useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsState, setCommentsState] = useState<"loading" | "ready" | "error">("loading");
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState("");
  const [resolvedBusy, setResolvedBusy] = useState(false);
  const [resolvedFeedback, setResolvedFeedback] = useState("");
  const requestSequence = useRef(0);

  async function loadTicketDetail(
    activeRequesterId = requesterId,
    activeTicketId = ticketId,
  ) {
    const sequence =
      requestSequence.current + 1;
    requestSequence.current = sequence;

    setTicket(null);
    setViewState("loading");

    try {
      const response = await getTicketDetail(
        activeRequesterId,
        activeTicketId,
      );

      if (sequence !== requestSequence.current) {
        return;
      }

      setTicket(response);
      setComments(response.comments ?? []);
      setCommentsState("loading");
      try {
        const loadedComments = await getTicketComments(activeRequesterId, activeTicketId);
        if (sequence === requestSequence.current) {
          setComments(loadedComments);
          setCommentsState("ready");
        }
      } catch {
        if (sequence === requestSequence.current) setCommentsState("error");
      }
      setViewState("loaded");
    } catch (error) {
      if (sequence !== requestSequence.current) {
        return;
      }

      if (
        error instanceof TicketApiError &&
        error.status === 404
      ) {
        setViewState("not-found");
        return;
      }

      setViewState("error");
    }
  }

  async function handleAddComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = commentText.trim();
    if (content.length < 1 || content.length > 5000) {
      setCommentFeedback("Comment must be between 1 and 5,000 characters.");
      return;
    }
    setCommentBusy(true);
    setCommentFeedback("");
    try {
      const created = await createTicketComment(requesterId, ticketId, content);
      setComments((current) => [...current, created]);
      setCommentText("");
      setCommentsState("ready");
      setCommentFeedback("Comment added successfully.");
    } catch {
      setCommentFeedback("Unable to add comment. Please try again.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleResolved() {
    setResolvedBusy(true);
    setResolvedFeedback("");
    try {
      const result = await markTicketResolved(requesterId, ticketId);
      setTicket((current) => current ? { ...current, requesterResolvedAt: result.requesterResolvedAt } : current);
      setResolvedFeedback("Problem marked as resolved.");
    } catch {
      setResolvedFeedback("Unable to update the Ticket. Please try again.");
    } finally {
      setResolvedBusy(false);
    }
  }

  useEffect(() => {
    void loadTicketDetail(
      requesterId,
      ticketId,
    );

    return () => {
      requestSequence.current += 1;
    };
  }, [requesterId, ticketId]);

  if (viewState === "loading") {
    return (
      <section aria-labelledby="ticket-detail-title">
        <button
          type="button"
          className="btn btn-link text-success px-0 mb-3"
          onClick={onBack}
        >
          Back to My Tickets
        </button>
        <div
          className="alert alert-info"
          role="status"
          aria-live="polite"
        >
          Loading Ticket Detail...
        </div>
      </section>
    );
  }

  if (viewState === "not-found") {
    return (
      <section aria-labelledby="ticket-detail-title">
        <div
          className="alert alert-warning"
          role="alert"
        >
          <h2
            id="ticket-detail-title"
            className="h5"
          >
            Ticket is unavailable
          </h2>
          <p>
            The requested Ticket could not be
            found or is unavailable.
          </p>
          <button
            type="button"
            className="btn btn-outline-success"
            onClick={onBack}
          >
            Back to My Tickets
          </button>
        </div>
      </section>
    );
  }

  if (viewState === "error") {
    return (
      <section aria-labelledby="ticket-detail-title">
        <div
          className="alert alert-danger"
          role="alert"
        >
          <h2
            id="ticket-detail-title"
            className="h5"
          >
            Unable to load Ticket Detail
          </h2>
          <p>
            Please retry or return to My Tickets.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() =>
                void loadTicketDetail()
              }
            >
              Retry
            </button>
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={onBack}
            >
              Back to My Tickets
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <section aria-labelledby="ticket-detail-title">
      <button
        type="button"
        className="btn btn-link text-success px-0 mb-3"
        onClick={onBack}
      >
        Back to My Tickets
      </button>

      <header className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <p className="text-body-secondary mb-1">
            Ticket Detail
          </p>
          <h2
            id="ticket-detail-title"
            className="h3 mb-1"
          >
            {ticket.ticketNumber}
          </h2>
          <p className="mb-0">
            {ticket.summary}
          </p>
        </div>
        <span className="badge text-bg-success fs-6 align-self-start">
          {ticket.currentStatus}
        </span>
      </header>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <section
            className="card shadow-sm h-100 toktickit-readonly"
            data-readonly="true"
            aria-labelledby="ticket-information-title"
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3
                  id="ticket-information-title"
                  className="h5 mb-0"
                >
                  Ticket Information
                </h3>
                <span className="badge text-bg-light border">
                  Read-only
                </span>
              </div>

              <dl className="row mb-0">
                <dt className="col-sm-5">
                  Ticket Date
                </dt>
                <dd className="col-sm-7">
                  {formatDate(ticket.createdAt)}
                </dd>
                <dt className="col-sm-5">
                  Last Updated
                </dt>
                <dd className="col-sm-7">
                  {formatDate(ticket.updatedAt)}
                </dd>
                <dt className="col-sm-5">
                  Requested Priority
                </dt>
                <dd className="col-sm-7">
                  <span className="badge text-bg-warning">
                    {ticket.requestedPriority}
                  </span>
                </dd>
                <dt className="col-sm-5">
                  Category
                </dt>
                <dd className="col-sm-7">
                  {ticket.category.name}
                </dd>
                <dt className="col-sm-5">
                  Related System
                </dt>
                <dd className="col-sm-7">
                  {ticket.relatedSystem.name}
                </dd>
              </dl>
            </div>
          </section>
        </div>

        <div className="col-12 col-lg-6">
          <section
            className="card shadow-sm h-100 toktickit-readonly"
            data-readonly="true"
            aria-labelledby="requester-information-title"
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3
                  id="requester-information-title"
                  className="h5 mb-0"
                >
                  Requester Information
                </h3>
                <span className="badge text-bg-light border">
                  Read-only
                </span>
              </div>
              <dl className="row mb-0">
                <dt className="col-sm-4">Name</dt>
                <dd className="col-sm-8">
                  {ticket.requester.name}
                </dd>
                <dt className="col-sm-4">Email</dt>
                <dd className="col-sm-8 text-break">
                  {ticket.requester.email}
                </dd>
              </dl>
            </div>
          </section>
        </div>

        <div className="col-12">
          <section
            className="card shadow-sm toktickit-readonly"
            data-readonly="true"
            aria-labelledby="request-description-title"
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3
                  id="request-description-title"
                  className="h5 mb-0"
                >
                  Request Description
                </h3>
                <span className="badge text-bg-light border">
                  Read-only
                </span>
              </div>
              <h4 className="h6">Summary</h4>
              <p>{ticket.summary}</p>
              <h4 className="h6">Description</h4>
              <p className="mb-0 text-break">
                {ticket.description}
              </p>
            </div>
          </section>
        </div>

        <div className="col-12">
          <section className="card shadow-sm" aria-labelledby="public-comments-title">
            <div className="card-body">
              <h3 id="public-comments-title" className="h5">Public Comments</h3>
              {commentsState === "loading" && <div className="alert alert-info" role="status">Loading comments...</div>}
              {commentsState === "error" && <div className="alert alert-warning" role="alert">Unable to load comments. You can still try again later.</div>}
              {commentsState === "ready" && (comments.length > 0 ? <ul className="list-group mb-3">{comments.map((comment) => <li className="list-group-item" key={comment.id}><strong>{comment.author.name}</strong><span className="text-body-secondary ms-2">{formatDate(comment.createdAt)}</span><p className="mb-0 mt-1 text-break">{comment.content}</p></li>)}</ul> : <p className="text-body-secondary">No public comments yet.</p>)}
              {commentFeedback && <div className={`alert ${commentFeedback.startsWith("Comment added") ? "alert-success" : "alert-danger"}`} role="alert">{commentFeedback}</div>}
              <form onSubmit={handleAddComment}>
                <label className="form-label" htmlFor="public-comment">Add a public comment</label>
                <textarea id="public-comment" className="form-control mb-2" rows={3} value={commentText} maxLength={5000} onChange={(event) => setCommentText(event.target.value)} disabled={commentBusy} />
                <button type="submit" className="btn btn-outline-success" disabled={commentBusy}>{commentBusy ? "Adding..." : "Add Comment"}</button>
              </form>
            </div>
          </section>
        </div>

        <div className="col-12">
          <section className="card shadow-sm" aria-labelledby="resolved-title">
            <div className="card-body">
              <h3 id="resolved-title" className="h5">Problem status</h3>
              <p className="text-body-secondary">Use this action when the reported problem has been resolved.</p>
              {resolvedFeedback && <div className={`alert ${resolvedFeedback.startsWith("Problem marked") ? "alert-success" : "alert-danger"}`} role="alert">{resolvedFeedback}</div>}
              <button type="button" className="btn btn-success" onClick={() => void handleResolved()} disabled={resolvedBusy || Boolean(ticket.requesterResolvedAt)}>{ticket.requesterResolvedAt ? "Problem marked as resolved" : resolvedBusy ? "Updating..." : "Problem Appears Resolved"}</button>
            </div>
          </section>
        </div>

        <div className="col-12">
          <AttachmentSection
            requesterId={requesterId}
            ticketId={ticket.id}
            initialAttachments={
              ticket.attachments
            }
          />
        </div>
      </div>
    </section>
  );
}
