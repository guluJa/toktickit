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
} from "./api.js";

interface CreateTicketProps {
  requesterId: number;
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
  | "description";

type TicketFieldErrors = Partial<
  Record<TicketFieldName, string>
>;

export default function CreateTicket({
  requesterId,
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
    } catch {
      setSubmissionState("error");
    }
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

            <dl className="mb-0">
              <dt>Official Ticket Number</dt>
              <dd>
                {
                  createdTicket.ticket
                    .ticketNumber
                }
              </dd>

              <dt>Summary</dt>
              <dd>
                {createdTicket.ticket.summary}
              </dd>

              <dt>Status</dt>
              <dd>
                {
                  createdTicket.ticket
                    .currentStatus
                }
              </dd>
            </dl>
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
            </label>

            <select
              id="ticket-category"
              className={`form-select${
                fieldErrors.categoryId
                  ? " is-invalid"
                  : ""
              }`}
              value={categoryId}
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
            </label>

            <select
              id="ticket-related-system"
              className={`form-select${
                fieldErrors.relatedSystemId
                  ? " is-invalid"
                  : ""
              }`}
              value={relatedSystemId}
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
            </label>

            <select
              id="ticket-priority"
              className="form-select"
              value={requestedPriority}
              disabled={formDisabled}
              onChange={(event) =>
                setRequestedPriority(
                  event.target
                    .value as RequestedPriority,
                )
              }
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
          </div>

          <div className="mb-3">
            <label
              className="form-label"
              htmlFor="ticket-description"
            >
              Description
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
