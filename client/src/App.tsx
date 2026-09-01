import {
  useEffect,
  useState,
} from "react";
import {
  checkSystem,
  DevelopmentRequester,
  getDevelopmentRequester,
  getDevelopmentRequesters,
  Category,
} from "./api.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import RequesterTicketDetail from "./RequesterTicketDetail.js";

type ActiveView =
  | "create"
  | "tickets"
  | "detail";

type UiState =
  | "idle"
  | "loading"
  | "success"
  | "error";

type RequesterViewState =
  | "loading"
  | "ready"
  | "empty"
  | "error";

const REQUESTER_STORAGE_KEY =
  "toktickit.developmentRequesterId";

export default function App() {
  const [
    requesterViewState,
    setRequesterViewState,
  ] = useState<RequesterViewState>("loading");

  const [
    requesters,
    setRequesters,
  ] = useState<DevelopmentRequester[]>([]);

  const [
    selectedRequesterId,
    setSelectedRequesterId,
  ] = useState("");

  const [
    currentRequester,
    setCurrentRequester,
  ] = useState<DevelopmentRequester | null>(null);

  const [
    isContinuing,
    setIsContinuing,
  ] = useState(false);

  const [state, setState] =
    useState<UiState>("idle");

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [activeView, setActiveView] =
    useState<ActiveView>("create");

  const [selectedTicketId, setSelectedTicketId] =
    useState<number | null>(null);

  async function loadRequesterOptions() {
    setRequesterViewState("loading");
    setRequesters([]);
    setSelectedRequesterId("");

    try {
      const result =
        await getDevelopmentRequesters();

      setRequesters(result);
      setRequesterViewState(
        result.length > 0 ? "ready" : "empty",
      );
    } catch {
      setRequesterViewState("error");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialiseRequesterContext() {
      const storedRequesterId =
        localStorage.getItem(
          REQUESTER_STORAGE_KEY,
        );

      if (storedRequesterId) {
        const requesterId =
          Number(storedRequesterId);

        if (
          Number.isSafeInteger(requesterId) &&
          requesterId > 0
        ) {
          try {
            const requester =
              await getDevelopmentRequester(
                requesterId,
              );

            if (!cancelled) {
              setCurrentRequester(requester);
            }

            return;
          } catch {
            localStorage.removeItem(
              REQUESTER_STORAGE_KEY,
            );
          }
        } else {
          localStorage.removeItem(
            REQUESTER_STORAGE_KEY,
          );
        }
      }

      if (!cancelled) {
        await loadRequesterOptions();
      }
    }

    void initialiseRequesterContext();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleContinue() {
    const requesterId =
      Number(selectedRequesterId);

    if (
      !Number.isSafeInteger(requesterId) ||
      requesterId <= 0
    ) {
      return;
    }

    setIsContinuing(true);

    try {
      const requester =
        await getDevelopmentRequester(
          requesterId,
        );

      localStorage.setItem(
        REQUESTER_STORAGE_KEY,
        String(requester.id),
      );

      setCurrentRequester(requester);
    } catch {
      localStorage.removeItem(
        REQUESTER_STORAGE_KEY,
      );
      setRequesterViewState("error");
    } finally {
      setIsContinuing(false);
    }
  }

  function handleChangeRequester() {
    localStorage.removeItem(
      REQUESTER_STORAGE_KEY,
    );

    setCurrentRequester(null);
    setState("idle");
    setCategories([]);
    setActiveView("create");
    setSelectedTicketId(null);

    void loadRequesterOptions();
  }

  async function handleCheck() {
    setState("loading");
    setCategories([]);

    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (!currentRequester) {
    return (
      <main
        className="container py-5"
        style={{ maxWidth: 680 }}
      >
        <section
          className="card border-success shadow-sm"
          aria-labelledby="requester-selection-title"
        >
          <div className="card-body p-4">
            <h1
              id="requester-selection-title"
              className="h3 text-success mb-3"
            >
              TokTickIT
            </h1>

            <h2 className="h5">
              Select a Development Requester
            </h2>

            <p className="text-body-secondary">
              Select a Development Requester
              to test requester-specific ticket
              behavior. This is not a login
              screen. Authentication and
              role-based access will be
              introduced in Lab 3.
            </p>

            {requesterViewState ===
              "loading" && (
              <div
                className="alert alert-info"
                role="status"
                aria-live="polite"
              >
                Loading development
                requesters...
              </div>
            )}

            {requesterViewState ===
              "empty" && (
              <div
                className="alert alert-warning"
                role="status"
              >
                <p className="mb-3">
                  No active Development
                  Requesters are available.
                </p>

                <button
                  type="button"
                  className="btn btn-outline-success"
                  onClick={() =>
                    void loadRequesterOptions()
                  }
                >
                  Retry
                </button>
              </div>
            )}

            {requesterViewState ===
              "error" && (
              <div
                className="alert alert-danger"
                role="alert"
              >
                <p className="mb-3">
                  Unable to load Development
                  Requesters. Please try again.
                </p>

                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={() =>
                    void loadRequesterOptions()
                  }
                >
                  Retry
                </button>
              </div>
            )}

            {requesterViewState ===
              "ready" && (
              <>
                <div className="mb-3">
                  <label
                    className="form-label"
                    htmlFor="development-requester"
                  >
                    Development Requester
                  </label>

                  <select
                    id="development-requester"
                    className="form-select"
                    value={selectedRequesterId}
                    disabled={isContinuing}
                    onChange={(event) =>
                      setSelectedRequesterId(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Select a requester
                    </option>

                    {requesters.map(
                      (requester) => (
                        <option
                          key={requester.id}
                          value={requester.id}
                        >
                          {requester.name} (
                          {requester.email})
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-success"
                  disabled={
                    !selectedRequesterId ||
                    isContinuing
                  }
                  onClick={() =>
                    void handleContinue()
                  }
                >
                  {isContinuing
                    ? "Continuing..."
                    : "Continue"}
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className="container py-4"
      style={{ maxWidth: 1200 }}
    >
      <header className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">
            TokTickIT{" "}
            <span className="text-success">
              IT Service Desk
            </span>
          </h1>

          <p className="mb-0 text-body-secondary">
            Current Requester:{" "}
            <strong>
              {currentRequester.name}
            </strong>
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-success"
          onClick={handleChangeRequester}
        >
          Change Requester
        </button>
      </header>

      <nav
        className="nav nav-pills gap-2 mb-4"
        aria-label="Requester workspace"
      >
        <button
          type="button"
          className={`nav-link ${
            activeView === "create"
              ? "active"
              : "text-success"
          }`}
          aria-current={
            activeView === "create"
              ? "page"
              : undefined
          }
          onClick={() => {
            setSelectedTicketId(null);
            setActiveView("create");
          }}
        >
          Create Ticket
        </button>
        <button
          type="button"
          className={`nav-link ${
            activeView === "tickets" ||
            activeView === "detail"
              ? "active"
              : "text-success"
          }`}
          aria-current={
            activeView === "tickets" ||
            activeView === "detail"
              ? "page"
              : undefined
          }
          onClick={() => {
            setSelectedTicketId(null);
            setActiveView("tickets");
          }}
        >
          My Tickets
        </button>
      </nav>

      {activeView === "create" ? (
        <>
          <div className="mb-4">
            <CreateTicket
              requesterId={currentRequester.id}
              requesterName={currentRequester.name}
              onMyTickets={() =>
                setActiveView("tickets")
              }
              onViewTicket={(ticketId) => {
                setSelectedTicketId(ticketId);
                setActiveView("detail");
              }}
            />
          </div>

          <section
            className="card shadow-sm"
            aria-labelledby="system-check-title"
          >
            <div className="card-body">
          <h2
            id="system-check-title"
            className="h5"
          >
            System Check
          </h2>

          <button
            type="button"
            className="btn btn-success"
            onClick={() =>
              void handleCheck()
            }
            disabled={state === "loading"}
          >
            {state === "loading"
              ? "Loading..."
              : "Check System"}
          </button>

          {state === "success" && (
            <div className="mt-4">
              <div className="alert alert-success">
                System Status: Online
              </div>

              <h3 className="h6">
                Supported Request Categories
              </h3>

              <ol className="list-group list-group-numbered">
                {categories.map(
                  (category) => (
                    <li
                      className="list-group-item"
                      key={category.id}
                    >
                      {category.name}
                    </li>
                  ),
                )}
              </ol>
            </div>
          )}

          {state === "error" && (
            <div className="alert alert-danger mt-4">
              <div>
                System Status: Offline
              </div>
              <div>
                Unable to connect to TokTickIT
                API
              </div>
            </div>
          )}
            </div>
          </section>
        </>
      ) : activeView === "tickets" ? (
        <MyTickets
          requesterId={currentRequester.id}
          requesterName={currentRequester.name}
          onCreateTicket={() =>
            setActiveView("create")
          }
          onViewTicket={(ticketId) => {
            setSelectedTicketId(ticketId);
            setActiveView("detail");
          }}
        />
      ) : selectedTicketId ? (
        <RequesterTicketDetail
          requesterId={currentRequester.id}
          ticketId={selectedTicketId}
          onBack={() => {
            setSelectedTicketId(null);
            setActiveView("tickets");
          }}
        />
      ) : (
        <MyTickets
          requesterId={currentRequester.id}
          requesterName={currentRequester.name}
          onCreateTicket={() =>
            setActiveView("create")
          }
          onViewTicket={(ticketId) => {
            setSelectedTicketId(ticketId);
            setActiveView("detail");
          }}
        />
      )}
    </main>
  );
}
