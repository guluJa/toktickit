import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getTicketDetail,
  TicketApiError,
  TicketDetail,
} from "./api.js";

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

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    sizeBytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
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
            className="card shadow-sm h-100"
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
            className="card shadow-sm h-100"
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
            className="card shadow-sm"
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
          <section
            className="card shadow-sm"
            aria-labelledby="attachments-title"
          >
            <div className="card-body">
              <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-3">
                <h3
                  id="attachments-title"
                  className="h5 mb-0"
                >
                  Attachments
                </h3>
                <span className="text-body-secondary">
                  Metadata only
                </span>
              </div>

              {ticket.attachments.length === 0 ? (
                <p className="text-body-secondary mb-0">
                  No Attachments are associated with
                  this Ticket.
                </p>
              ) : (
                <div className="row g-3">
                  {ticket.attachments.map(
                    (attachment) => (
                      <div
                        className="col-12 col-md-6"
                        key={attachment.id}
                      >
                        <article className="border rounded p-3 h-100">
                          <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-2">
                            <strong className="text-break">
                              {attachment.originalName}
                            </strong>
                            <span
                              className={`badge align-self-start ${
                                attachment.state ===
                                "ACTIVE"
                                  ? "text-bg-success"
                                  : "text-bg-secondary"
                              }`}
                            >
                              {attachment.state}
                            </span>
                          </div>
                          <dl className="row small mb-0">
                            <dt className="col-5">
                              MIME Type
                            </dt>
                            <dd className="col-7 text-break">
                              {attachment.mimeType}
                            </dd>
                            <dt className="col-5">
                              File Size
                            </dt>
                            <dd className="col-7">
                              {formatFileSize(
                                attachment.sizeBytes,
                              )}
                            </dd>
                            <dt className="col-5">
                              Uploaded At
                            </dt>
                            <dd className="col-7">
                              {formatDate(
                                attachment.uploadedAt,
                              )}
                            </dd>
                            {attachment.removedAt && (
                              <>
                                <dt className="col-5">
                                  Removed At
                                </dt>
                                <dd className="col-7">
                                  {formatDate(
                                    attachment.removedAt,
                                  )}
                                </dd>
                              </>
                            )}
                            {attachment.removalReason && (
                              <>
                                <dt className="col-5">
                                  Removal Reason
                                </dt>
                                <dd className="col-7 text-break">
                                  {
                                    attachment.removalReason
                                  }
                                </dd>
                              </>
                            )}
                          </dl>
                        </article>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
