import {
  useEffect,
  useState,
} from "react";
import {
  checkSystem,
  AuthUser,
  AuthApiError,
  getCurrentUser,
  login,
  logout,
  changePassword,
  Category,
} from "./api.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";
import RequesterTicketDetail from "./RequesterTicketDetail.js";
import StaffTicketQueue from "./StaffTicketQueue.js";

type ActiveView =
  | "create"
  | "tickets"
  | "detail";

type UiState =
  | "idle"
  | "loading"
  | "success"
  | "error";

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const [state, setState] =
    useState<UiState>("idle");

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [activeView, setActiveView] =
    useState<ActiveView>("create");

  const [selectedTicketId, setSelectedTicketId] =
    useState<number | null>(null);

  const [isMobileNavigationOpen, setIsMobileNavigationOpen] =
    useState(true);

  useEffect(() => {
    void getCurrentUser()
      .then((user) => {
        setAuthUser(user);
        setAuthError("");
      })
      .catch((error) => {
        if (error instanceof AuthApiError && error.status === 401) {
          setAuthUser(null);
          setAuthError("");
        } else {
          setAuthError("Unable to verify your session. Please try again.");
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return <main className="container py-5"><div className="alert alert-info" role="status">Loading session...</div></main>;
  }

  if (!authUser) {
    return <main className="container py-5" style={{ maxWidth: 560 }}><section className="card border-success shadow-sm"><div className="card-body p-4"><h1 className="h3 text-success">TokTickIT IT Service Desk</h1><h2 className="h5">Sign in</h2>{authError && <div className="alert alert-danger" role="alert">{authError}</div>}<form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const user = await login(String(form.get("email")), String(form.get("password"))); setAuthUser(user); setAuthError(""); } catch (error) { setAuthError(error instanceof Error ? error.message : "Unable to sign in."); } }}><label className="form-label" htmlFor="auth-email">Email</label><input id="auth-email" name="email" type="email" className="form-control mb-3" required /><label className="form-label" htmlFor="auth-password">Password</label><input id="auth-password" name="password" type="password" className="form-control mb-3" required /><button className="btn btn-success">Sign in</button></form></div></section></main>;
  }

  if (authUser?.mustChangePassword) {
    return <main className="container py-5" style={{ maxWidth: 560 }}><section className="card border-success shadow-sm"><div className="card-body p-4"><h1 className="h3 text-success">Change password required</h1><p>Please change your initial password before continuing.</p>{authError && <div className="alert alert-danger" role="alert">{authError}</div>}<form onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); try { const user = await changePassword(String(form.get("newPassword")), String(form.get("confirmPassword"))); setAuthUser(user); setAuthError(""); } catch (error) { setAuthError(error instanceof Error ? error.message : "Unable to change password."); } }}><label className="form-label" htmlFor="new-password">New password</label><input id="new-password" name="newPassword" type="password" className="form-control mb-3" required /><label className="form-label" htmlFor="confirm-password">Confirm password</label><input id="confirm-password" name="confirmPassword" type="password" className="form-control mb-3" required /><button className="btn btn-success">Change password</button></form></div></section></main>;
  }

  if (authUser && authUser.role !== "REQUESTER") {
    return <main className="container py-4" style={{ maxWidth: 1200 }}><header className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4"><div><h1 className="h3 mb-1">TokTickIT <span className="text-success">IT Service Desk</span></h1><p className="mb-0 text-body-secondary">Authenticated User: <strong>{authUser.name}</strong></p><p className="small text-body-secondary mb-0">Role: {authUser.role}</p></div><button type="button" className="btn btn-outline-success" onClick={async () => { try { await logout(); setAuthUser(null); setAuthError(""); } catch (error) { setAuthError(error instanceof Error ? error.message : "Unable to sign out."); } }}>Logout</button></header>{authError && <div className="alert alert-danger" role="alert">{authError}</div>}<StaffTicketQueue role={authUser.role} /></main>;
  }
  const requester = authUser;

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
              {requester.name}
            </strong>
          </p>
          <p className="small text-body-secondary mb-0">
            Authenticated session
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-success"
          onClick={async () => { try { await logout(); setAuthUser(null); setAuthError(""); } catch (error) { setAuthError(error instanceof Error ? error.message : "Unable to sign out."); } }}
        >
          Logout
        </button>
      </header>
      {authError && <div className="alert alert-danger" role="alert">{authError}</div>}

      <button
        type="button"
        className="btn btn-outline-success d-sm-none mb-3 w-100"
        aria-controls="requester-workspace-navigation"
        aria-expanded={isMobileNavigationOpen}
        onClick={() =>
          setIsMobileNavigationOpen((current) => !current)
        }
      >
        {isMobileNavigationOpen
          ? "Hide workspace navigation"
          : "Show workspace navigation"}
      </button>

      <nav
        id="requester-workspace-navigation"
        className={`nav nav-pills flex-column flex-sm-row gap-2 mb-4 ${
          isMobileNavigationOpen ? "d-flex" : "d-none d-sm-flex"
        }`}
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
            setIsMobileNavigationOpen(false);
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
            setIsMobileNavigationOpen(false);
          }}
        >
          My Tickets
        </button>
      </nav>

      {activeView === "create" ? (
        <>
          <div className="mb-4">
            <CreateTicket
              requesterId={requester.id}
              requesterName={requester.name}
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
          requesterId={requester.id}
          requesterName={requester.name}
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
          requesterId={requester.id}
          ticketId={selectedTicketId}
          onBack={() => {
            setSelectedTicketId(null);
            setActiveView("tickets");
          }}
        />
      ) : (
        <MyTickets
          requesterId={requester.id}
          requesterName={requester.name}
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
