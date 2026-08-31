import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Category,
  createTicket,
  CreateTicketResponse,
  getCategories,
  getRelatedSystems,
  RelatedSystem,
  RequestedPriority,
  TicketApiError,
} from "./api.js";

interface CreateTicketProps {
  requesterId: number;
  requesterName: string;
  onMyTickets?: () => void;
}

type ReferenceDataState =
  | "loading"
  | "ready"
  | "error";

type SubmissionState =
  | "idle"
  | "submitting"
  | "success"
  | "error";

type TicketFieldName =
  | "categoryId"
  | "relatedSystemId"
  | "summary"
  | "requestedPriority"
  | "description";

type TicketFieldErrors = Partial<
  Record<TicketFieldName, string>
>;

export default function CreateTicket({
  requesterId,
  requesterName,
  onMyTickets,
}: CreateTicketProps) {
  const [
    referenceDataState,
    setReferenceDataState,
  ] = useState<ReferenceDataState>(
    "loading",
  );

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [
    relatedSystems,
    setRelatedSystems,
  ] = useState<RelatedSystem[]>([]);

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    relatedSystemId,
    setRelatedSystemId,
  ] = useState("");

  const [summary, setSummary] =
    useState("");

  const [
    requestedPriority,
    setRequestedPriority,
  ] = useState<RequestedPriority>(
    "MEDIUM",
  );

  const [
    description,
    setDescription,
  ] = useState("");

  const [fieldErrors, setFieldErrors] =
    useState<TicketFieldErrors>({});

  const [
    submissionState,
    setSubmissionState,
  ] = useState<SubmissionState>("idle");

  const [
    submissionKey,
    setSubmissionKey,
  ] = useState<string | null>(null);

  const [
    createdTicket,
    setCreatedTicket,
  ] = useState<CreateTicketResponse | null>(
    null,
  );

  const loadReferenceData =
    useCallback(async () => {
      setReferenceDataState("loading");
      setCategories([]);
      setRelatedSystems([]);

      try {
        const [
          loadedCategories,
          loadedRelatedSystems,
        ] = await Promise.all([
          getCategories(),
          getRelatedSystems(),
        ]);

        setCategories(loadedCategories);
        setRelatedSystems(
          loadedRelatedSystems,
        );
        setReferenceDataState("ready");
      } catch {
        setReferenceDataState("error");
      }
    }, []);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  function clearFieldError(
    field: TicketFieldName,
  ) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = {
        ...currentErrors,
      };

      delete nextErrors[field];

      return nextErrors;
    });
  }

  function validateForm(): TicketFieldErrors {
    const errors: TicketFieldErrors = {};

    if (!categoryId) {
      errors.categoryId =
        "Category is required.";
    }

    if (!relatedSystemId) {
      errors.relatedSystemId =
        "Related System is required.";
    }

    const normalizedSummary =
      summary.trim();

    if (
      normalizedSummary.length < 5 ||
      normalizedSummary.length > 150
    ) {
      errors.summary =
        "Summary must contain between 5 and 150 characters.";
    }

    const normalizedDescription =
      description.trim();

    if (
      normalizedDescription.length < 10 ||
      normalizedDescription.length > 5000
    ) {
      errors.description =
        "Description must contain between 10 and 5000 characters.";
    }

    return errors;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submissionState === "submitting") {
      return;
    }

    const errors = validateForm();

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const currentSubmissionKey =
      submissionKey ??
      globalThis.crypto.randomUUID();

    setSubmissionKey(currentSubmissionKey);
    setCreatedTicket(null);
    setSubmissionState("submitting");

    try {
      const response = await createTicket(
        requesterId,
        {
          submissionKey:
            currentSubmissionKey,
          categoryId: Number(categoryId),
          relatedSystemId: Number(
            relatedSystemId,
          ),
          summary: summary.trim(),
          requestedPriority,
          description: description.trim(),
        },
      );

      setCreatedTicket(response);
      setSubmissionState("success");
    } catch (error) {
      if (error instanceof TicketApiError) {
        const backendErrors: TicketFieldErrors = {};
        const editableFields: TicketFieldName[] = [
          "categoryId",
          "relatedSystemId",
          "summary",
          "requestedPriority",
          "description",
        ];

        for (const field of editableFields) {
          const message = error.fields[field];

          if (message) {
            backendErrors[field] = message;
          }
        }

        setFieldErrors(backendErrors);
      }

      setSubmissionState("error");
    }
  }

  function handleCreateAnotherTicket() {
    setCategoryId("");
    setRelatedSystemId("");
    setSummary("");
    setRequestedPriority("MEDIUM");
    setDescription("");
    setFieldErrors({});
    setSubmissionKey(null);
    setCreatedTicket(null);
    setSubmissionState("idle");
  }

  const formReady =
    referenceDataState === "ready";

  const formDisabled =
    !formReady ||
    submissionState === "submitting";

  return (
    <section
      className="card shadow-sm"
      aria-labelledby="create-ticket-title"
    >
      <div className="card-body p-4">
        <h2
          id="create-ticket-title"
          className="h4 text-success mb-3"
        >
          Create Ticket
        </h2>

        <section
          className="border rounded p-3 mb-3 bg-body-tertiary"
          aria-labelledby="ticket-system-information"
        >
          <h3
            id="ticket-system-information"
            className="h6"
          >
            System Information
          </h3>

          <dl className="row mb-0">
            <dt className="col-sm-4">
              Ticket Number
            </dt>
            <dd className="col-sm-8">
              {createdTicket
                ? createdTicket.ticket.ticketNumber
                : "Pending until saved"}
            </dd>

            <dt className="col-sm-4">
              Ticket Date
            </dt>
            <dd className="col-sm-8">
              {createdTicket
                ? new Date(
                    createdTicket.ticket.createdAt,
                  ).toLocaleString()
                : "Assigned when saved"}
            </dd>

            <dt className="col-sm-4">
              Requester
            </dt>
            <dd className="col-sm-8">
              {requesterName}
            </dd>

            <dt className="col-sm-4">
              Current Status
            </dt>
            <dd className="col-sm-8">
              {createdTicket
                ? createdTicket.ticket.currentStatus
                : "NEW (assigned when saved)"}
            </dd>
          </dl>
        </section>

        {referenceDataState ===
          "loading" && (
          <div
            className="alert alert-info"
            role="status"
            aria-live="polite"
          >
            Loading reference data...
          </div>
        )}

        {referenceDataState ===
          "error" && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            <p className="mb-3">
              Unable to load reference data.
              Please try again.
            </p>

            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() =>
                void loadReferenceData()
              }
            >
              Retry
            </button>
          </div>
        )}

        {submissionState === "error" && (
          <div
            className="alert alert-danger"
            role="alert"
          >
            Unable to create the Ticket. Your
            form values have been preserved.
            Please try again.
          </div>
        )}

        {submissionState === "success" &&
          createdTicket && (
          <div
            className="alert alert-success"
            role="status"
            aria-live="polite"
          >
            <h3 className="h5">
              Ticket Created
            </h3>

            <h4 className="h6">Saved Values</h4>

            <dl className="mb-3">
              <dt>Official Ticket Number</dt>
              <dd>
                {
                  createdTicket.ticket
                    .ticketNumber
                }
              </dd>

              <dt>Ticket Date</dt>
              <dd>
                {new Date(
                  createdTicket.ticket.createdAt,
                ).toLocaleString()}
              </dd>

              <dt>Requester</dt>
              <dd>
                {createdTicket.ticket.requester.name}
              </dd>

              <dt>Category</dt>
              <dd>
                {createdTicket.ticket.category.name}
              </dd>

              <dt>Related System</dt>
              <dd>
                {
                  createdTicket.ticket
                    .relatedSystem.name
                }
              </dd>

              <dt>Summary</dt>
              <dd>
                {createdTicket.ticket.summary}
              </dd>

              <dt>Requested Priority</dt>
              <dd>
                {
                  createdTicket.ticket
                    .requestedPriority
                }
              </dd>

              <dt>Description</dt>
              <dd>
                {createdTicket.ticket.description}
              </dd>

              <dt>Status</dt>
              <dd>
                {
                  createdTicket.ticket
                    .currentStatus
                }
              </dd>
            </dl>

            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-success"
                onClick={handleCreateAnotherTicket}
              >
                Create Another Ticket
              </button>

              <button
                type="button"
                className="btn btn-outline-success"
                disabled
                title="Available after the Ticket Detail increment is implemented."
              >
                View Ticket
              </button>

              <button
                type="button"
                className="btn btn-outline-success"
                disabled={!onMyTickets}
                title={
                  onMyTickets
                    ? undefined
                    : "Available after the My Tickets increment is implemented."
                }
                onClick={onMyTickets}
              >
                My Tickets
              </button>
            </div>

            <p className="small mb-0 mt-2">
              View Ticket will be enabled by the Ticket Detail increment.
            </p>
          </div>
        )}

        <form
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="ticket-category"
            >
              Category
              <span
                className="text-danger"
                aria-hidden="true"
              >
                {" "}*
              </span>
            </label>

            <select
              id="ticket-category"
              className={`form-select${
                fieldErrors.categoryId
                  ? " is-invalid"
                  : ""
              }`}
              value={categoryId}
              required
              aria-label="Category"
              aria-required="true"
              disabled={formDisabled}
              aria-invalid={Boolean(
                fieldErrors.categoryId,
              )}
              aria-describedby={
                fieldErrors.categoryId
                  ? "ticket-category-error"
                  : undefined
              }
              onChange={(event) => {
                setCategoryId(
                  event.target.value,
                );
                clearFieldError(
                  "categoryId",
                );
              }}
            >
              <option value="">
                Select a Category
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ),
              )}
            </select>

            {fieldErrors.categoryId && (
              <div
                id="ticket-category-error"
                className="invalid-feedback"
              >
                {fieldErrors.categoryId}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="ticket-related-system"
            >
              Related System
              <span
                className="text-danger"
                aria-hidden="true"
              >
                {" "}*
              </span>
            </label>

            <select
              id="ticket-related-system"
              className={`form-select${
                fieldErrors.relatedSystemId
                  ? " is-invalid"
                  : ""
              }`}
              value={relatedSystemId}
              required
              aria-label="Related System"
              aria-required="true"
              disabled={formDisabled}
              aria-invalid={Boolean(
                fieldErrors.relatedSystemId,
              )}
              aria-describedby={
                fieldErrors.relatedSystemId
                  ? "ticket-related-system-error"
                  : undefined
              }
              onChange={(event) => {
                setRelatedSystemId(
                  event.target.value,
                );
                clearFieldError(
                  "relatedSystemId",
                );
              }}
            >
              <option value="">
                Select a Related System
              </option>

              {relatedSystems.map(
                (system) => (
                  <option
                    key={system.id}
                    value={system.id}
                  >
                    {system.name}
                  </option>
                ),
              )}
            </select>

            {fieldErrors.relatedSystemId && (
              <div
                id="ticket-related-system-error"
                className="invalid-feedback"
              >
                {fieldErrors.relatedSystemId}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="ticket-summary"
            >
              Summary
              <span
                className="text-danger"
                aria-hidden="true"
              >
                {" "}*
              </span>
            </label>

            <input
              id="ticket-summary"
              className={`form-control${
                fieldErrors.summary
                  ? " is-invalid"
                  : ""
              }`}
              type="text"
              maxLength={150}
              value={summary}
              required
              aria-label="Summary"
              aria-required="true"
              disabled={formDisabled}
              aria-invalid={Boolean(
                fieldErrors.summary,
              )}
              aria-describedby={
                fieldErrors.summary
                  ? "ticket-summary-error"
                  : undefined
              }
              onChange={(event) => {
                setSummary(
                  event.target.value,
                );
                clearFieldError("summary");
              }}
            />

            {fieldErrors.summary && (
              <div
                id="ticket-summary-error"
                className="invalid-feedback"
              >
                {fieldErrors.summary}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="ticket-priority"
            >
              Requested Priority
              <span
                className="text-danger"
                aria-hidden="true"
              >
                {" "}*
              </span>
            </label>

            <select
              id="ticket-priority"
              className={`form-select${
                fieldErrors.requestedPriority
                  ? " is-invalid"
                  : ""
              }`}
              value={requestedPriority}
              required
              aria-label="Requested Priority"
              aria-required="true"
              disabled={formDisabled}
              aria-invalid={Boolean(
                fieldErrors.requestedPriority,
              )}
              aria-describedby={
                fieldErrors.requestedPriority
                  ? "ticket-priority-error"
                  : undefined
              }
              onChange={(event) => {
                setRequestedPriority(
                  event.target
                    .value as RequestedPriority,
                );
                clearFieldError(
                  "requestedPriority",
                );
              }}
            >
              <option value="LOW">
                Low
              </option>
              <option value="MEDIUM">
                Medium
              </option>
              <option value="HIGH">
                High
              </option>
            </select>

            {fieldErrors.requestedPriority && (
              <div
                id="ticket-priority-error"
                className="invalid-feedback"
              >
                {fieldErrors.requestedPriority}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="ticket-description"
            >
              Description
              <span
                className="text-danger"
                aria-hidden="true"
              >
                {" "}*
              </span>
            </label>

            <textarea
              id="ticket-description"
              className={`form-control${
                fieldErrors.description
                  ? " is-invalid"
                  : ""
              }`}
              rows={5}
              maxLength={5000}
              value={description}
              required
              aria-label="Description"
              aria-required="true"
              disabled={formDisabled}
              aria-invalid={Boolean(
                fieldErrors.description,
              )}
              aria-describedby={
                fieldErrors.description
                  ? "ticket-description-error"
                  : undefined
              }
              onChange={(event) => {
                setDescription(
                  event.target.value,
                );
                clearFieldError(
                  "description",
                );
              }}
            />

            {fieldErrors.description && (
              <div
                id="ticket-description-error"
                className="invalid-feedback"
              >
                {fieldErrors.description}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-success"
            disabled={formDisabled}
          >
            {submissionState ===
            "submitting"
              ? "Creating Ticket..."
              : "Create Ticket"}
          </button>
        </form>
      </div>
    </section>
  );
}
