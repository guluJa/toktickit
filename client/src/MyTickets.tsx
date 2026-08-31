import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Category,
  getCategories,
  getMyTickets,
  getRelatedSystems,
  MyTicketsQuery,
  MyTicketsResponse,
  RelatedSystem,
  TicketSummary,
} from "./api.js";

type MyTicketsViewState =
  | "loading"
  | "loaded"
  | "empty"
  | "no-results"
  | "error";

interface MyTicketsProps {
  requesterId: number;
  requesterName: string;
  onCreateTicket: () => void;
  onViewTicket?: (ticketId: number) => void;
}

const DEFAULT_QUERY: MyTicketsQuery = {
  sortBy: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 10,
};

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

function priorityClass(
  priority: TicketSummary["requestedPriority"],
): string {
  switch (priority) {
    case "HIGH":
      return "text-bg-danger";
    case "MEDIUM":
      return "text-bg-warning";
    default:
      return "text-bg-secondary";
  }
}

export default function MyTickets({
  requesterId,
  requesterName,
  onCreateTicket,
  onViewTicket,
}: MyTicketsProps) {
  const [viewState, setViewState] =
    useState<MyTicketsViewState>("loading");
  const [result, setResult] =
    useState<MyTicketsResponse | null>(null);
  const [categories, setCategories] =
    useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] =
    useState<RelatedSystem[]>([]);
  const [referenceDataError, setReferenceDataError] =
    useState(false);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] =
    useState("");
  const [relatedSystemId, setRelatedSystemId] =
    useState("");
  const [requestedPriority, setRequestedPriority] =
    useState("");
  const [currentStatus, setCurrentStatus] =
    useState("");
  const [sortBy, setSortBy] =
    useState<MyTicketsQuery["sortBy"]>(
      DEFAULT_QUERY.sortBy,
    );
  const [sortDirection, setSortDirection] =
    useState<MyTicketsQuery["sortDirection"]>(
      DEFAULT_QUERY.sortDirection,
    );
  const [pageSize, setPageSize] =
    useState<MyTicketsQuery["pageSize"]>(
      DEFAULT_QUERY.pageSize,
    );
  const [appliedQuery, setAppliedQuery] =
    useState<MyTicketsQuery>(DEFAULT_QUERY);

  const requestSequence = useRef(0);

  async function loadTickets(
    query: MyTicketsQuery,
    activeRequesterId = requesterId,
  ) {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;

    setViewState("loading");
    setResult(null);

    try {
      const response = await getMyTickets(
        activeRequesterId,
        query,
      );

      if (sequence !== requestSequence.current) {
        return;
      }

      setResult(response);

      if (response.totalOwnedItems === 0) {
        setViewState("empty");
      } else if (response.totalItems === 0) {
        setViewState("no-results");
      } else {
        setViewState("loaded");
      }
    } catch {
      if (sequence === requestSequence.current) {
        setViewState("error");
      }
    }
  }

  async function loadReferenceData() {
    setReferenceDataError(false);

    try {
      const [categoryItems, systemItems] =
        await Promise.all([
          getCategories(),
          getRelatedSystems(),
        ]);

      setCategories(categoryItems);
      setRelatedSystems(systemItems);
    } catch {
      setCategories([]);
      setRelatedSystems([]);
      setReferenceDataError(true);
    }
  }

  useEffect(() => {
    const resetQuery = { ...DEFAULT_QUERY };

    setSearch("");
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("");
    setCurrentStatus("");
    setSortBy(DEFAULT_QUERY.sortBy);
    setSortDirection(DEFAULT_QUERY.sortDirection);
    setPageSize(DEFAULT_QUERY.pageSize);
    setAppliedQuery(resetQuery);
    setResult(null);

    void loadReferenceData();
    void loadTickets(resetQuery, requesterId);

    return () => {
      requestSequence.current += 1;
    };
  }, [requesterId]);

  function buildDraftQuery(): MyTicketsQuery {
    return {
      ...(search.trim()
        ? { search: search.trim() }
        : {}),
      ...(categoryId
        ? { categoryId: Number(categoryId) }
        : {}),
      ...(relatedSystemId
        ? {
            relatedSystemId: Number(relatedSystemId),
          }
        : {}),
      ...(requestedPriority
        ? {
            requestedPriority:
              requestedPriority as MyTicketsQuery["requestedPriority"],
          }
        : {}),
      ...(currentStatus
        ? {
            currentStatus:
              currentStatus as MyTicketsQuery["currentStatus"],
          }
        : {}),
      sortBy,
      sortDirection,
      page: 1,
      pageSize,
    };
  }

  function handleApply() {
    const nextQuery = buildDraftQuery();
    setAppliedQuery(nextQuery);
    void loadTickets(nextQuery);
  }

  function handleClearFilters() {
    const resetQuery = { ...DEFAULT_QUERY };

    setSearch("");
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("");
    setCurrentStatus("");
    setSortBy(DEFAULT_QUERY.sortBy);
    setSortDirection(DEFAULT_QUERY.sortDirection);
    setPageSize(DEFAULT_QUERY.pageSize);
    setAppliedQuery(resetQuery);
    void loadTickets(resetQuery);
  }

  function changePage(page: number) {
    const nextQuery = {
      ...appliedQuery,
      page,
    };

    setAppliedQuery(nextQuery);
    void loadTickets(nextQuery);
  }

  const controlsDisabled = viewState === "loading";
  const tickets = result?.items ?? [];

  return (
    <section aria-labelledby="my-tickets-title">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <div>
          <h2 id="my-tickets-title" className="h4 mb-1">
            My Tickets
          </h2>
          <p className="text-body-secondary mb-0">
            Tickets owned by {requesterName}
          </p>
        </div>

        {viewState !== "empty" && (
          <button
            type="button"
            className="btn btn-success"
            onClick={onCreateTicket}
          >
            Create Ticket
          </button>
        )}
      </div>

      <form
        className="card shadow-sm mb-3"
        aria-label="My Tickets controls"
        onSubmit={(event) => {
          event.preventDefault();
          handleApply();
        }}
      >
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="ticket-search">
                Search Tickets
              </label>
              <input
                id="ticket-search"
                type="search"
                className="form-control"
                value={search}
                maxLength={100}
                disabled={controlsDisabled}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ticket Number or Summary"
              />
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="category-filter">
                Category
              </label>
              <select
                id="category-filter"
                aria-label="Category Filter"
                className="form-select"
                value={categoryId}
                disabled={controlsDisabled || referenceDataError}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="system-filter">
                Related System
              </label>
              <select
                id="system-filter"
                aria-label="Related System Filter"
                className="form-select"
                value={relatedSystemId}
                disabled={controlsDisabled || referenceDataError}
                onChange={(event) => setRelatedSystemId(event.target.value)}
              >
                <option value="">All Systems</option>
                {relatedSystems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {system.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="priority-filter">
                Priority
              </label>
              <select
                id="priority-filter"
                aria-label="Priority Filter"
                className="form-select"
                value={requestedPriority}
                disabled={controlsDisabled}
                onChange={(event) => setRequestedPriority(event.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label" htmlFor="status-filter">
                Status
              </label>
              <select
                id="status-filter"
                aria-label="Status Filter"
                className="form-select"
                value={currentStatus}
                disabled={controlsDisabled}
                onChange={(event) => setCurrentStatus(event.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="sort-by">
                Sort By
              </label>
              <select
                id="sort-by"
                className="form-select"
                value={sortBy}
                disabled={controlsDisabled}
                onChange={(event) =>
                  setSortBy(event.target.value as MyTicketsQuery["sortBy"])
                }
              >
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Ticket Date</option>
                <option value="ticketNumber">Ticket Number</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="sort-direction">
                Sort Direction
              </label>
              <select
                id="sort-direction"
                className="form-select"
                value={sortDirection}
                disabled={controlsDisabled}
                onChange={(event) =>
                  setSortDirection(
                    event.target.value as MyTicketsQuery["sortDirection"],
                  )
                }
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label" htmlFor="page-size">
                Page Size
              </label>
              <select
                id="page-size"
                className="form-select"
                value={pageSize}
                disabled={controlsDisabled}
                onChange={(event) =>
                  setPageSize(
                    Number(event.target.value) as MyTicketsQuery["pageSize"],
                  )
                }
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          {referenceDataError && (
            <p className="text-danger mt-3 mb-0" role="alert">
              Category and Related System filters are temporarily unavailable.
            </p>
          )}

          <div className="d-flex flex-wrap gap-2 mt-3">
            <button
              type="submit"
              className="btn btn-success"
              disabled={controlsDisabled}
            >
              Apply
            </button>
            {viewState !== "no-results" && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={controlsDisabled}
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </form>

      {viewState === "loading" && (
        <div className="alert alert-info" role="status" aria-live="polite">
          Loading Tickets...
        </div>
      )}

      {viewState === "error" && (
        <div className="alert alert-danger" role="alert">
          <p className="mb-3">Unable to load your Tickets. Please try again.</p>
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => void loadTickets(appliedQuery)}
          >
            Retry
          </button>
        </div>
      )}

      {viewState === "empty" && (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <h3 className="h5">You have not created any Tickets yet.</h3>
            <p className="text-body-secondary">Create your first IT Support Ticket.</p>
            <button type="button" className="btn btn-success" onClick={onCreateTicket}>
              Create Ticket
            </button>
          </div>
        </div>
      )}

      {viewState === "no-results" && (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <h3 className="h5">No Tickets match the current Search or Filters.</h3>
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {viewState === "loaded" && result && (
        <>
          <p className="text-body-secondary">
            {result.totalItems} matching Tickets
          </p>

          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle" aria-label="My Tickets table">
              <thead>
                <tr>
                  <th>Ticket Number</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="fw-semibold">{ticket.ticketNumber}</td>
                    <td>{ticket.summary}</td>
                    <td>{ticket.category.name}</td>
                    <td>
                      <span className={`badge ${priorityClass(ticket.requestedPriority)}`}>
                        {ticket.requestedPriority}
                      </span>
                    </td>
                    <td><span className="badge text-bg-success">{ticket.currentStatus}</span></td>
                    <td>{formatDate(ticket.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success"
                        disabled={!onViewTicket}
                        title={!onViewTicket ? "Ticket Detail will be available in a later increment." : undefined}
                        onClick={() => onViewTicket?.(ticket.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none" role="list" aria-label="My Tickets cards">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="card shadow-sm mb-3" role="listitem">
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-2 mb-2">
                    <strong>{ticket.ticketNumber}</strong>
                    <span className="badge text-bg-success">{ticket.currentStatus}</span>
                  </div>
                  <h3 className="h6">{ticket.summary}</h3>
                  <dl className="row small mb-3">
                    <dt className="col-5">Category</dt>
                    <dd className="col-7">{ticket.category.name}</dd>
                    <dt className="col-5">Related System</dt>
                    <dd className="col-7">{ticket.relatedSystem.name}</dd>
                    <dt className="col-5">Priority</dt>
                    <dd className="col-7">{ticket.requestedPriority}</dd>
                    <dt className="col-5">Last Updated</dt>
                    <dd className="col-7">{formatDate(ticket.updatedAt)}</dd>
                  </dl>
                  <button
                    type="button"
                    className="btn btn-outline-success w-100"
                    disabled={!onViewTicket}
                    onClick={() => onViewTicket?.(ticket.id)}
                  >
                    View
                  </button>
                </div>
              </article>
            ))}
          </div>

          <nav
            className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mt-3"
            aria-label="My Tickets pagination"
          >
            <span>
              Page {result.page} of {result.totalPages}
            </span>
            <div className="btn-group">
              <button
                type="button"
                className="btn btn-outline-success"
                disabled={result.page <= 1}
                onClick={() => changePage(result.page - 1)}
              >
                Previous Page
              </button>
              <button
                type="button"
                className="btn btn-outline-success"
                disabled={result.page >= result.totalPages}
                onClick={() => changePage(result.page + 1)}
              >
                Next Page
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
