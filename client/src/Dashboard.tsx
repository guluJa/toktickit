import { useEffect, useRef, useState } from "react";
import { DashboardLink, DashboardTicket, getRequesterDashboard, getStaffDashboard, RequesterDashboardData, StaffDashboardData, TicketApiError } from "./api.js";

const openStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const resolvedStatuses = ["RESOLVED", "CLOSED"];
export const dashboardDate = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
type Props = { userId: number; limit?: number; onNavigate?: (link: DashboardLink) => void };

function Dashboard({ userId, limit = 20, onNavigate, staff }: Props & { staff: boolean }) {
  const [data, setData] = useState<RequesterDashboardData | StaffDashboardData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "forbidden" | "error">("loading");
  const sequence = useRef(0);
  async function load() {
    const current = ++sequence.current;
    setState("loading"); setData(null);
    try {
      const result = staff ? await getStaffDashboard(limit) : await getRequesterDashboard(limit);
      if (current !== sequence.current) return;
      setData(result); setState("loaded");
    } catch (error) {
      if (current !== sequence.current) return;
      setState(error instanceof TicketApiError && error.status === 403 ? "forbidden" : "error");
    }
  }
  useEffect(() => { void load(); return () => { ++sequence.current; }; }, [userId, staff, limit]);
  function linksFor(metric: string) {
    return (data?.links ?? []).filter(link => {
      const q = (link.query ?? {}) as Record<string, unknown>;
      const status = q[staff ? "status" : "currentStatus"];
      const plain = q.ownerId === undefined && q.itPriority === undefined;
      switch (metric) {
        case "openCount": return plain && link.rel === "recentTickets" && openStatuses.includes(String(status));
        case "waitingForRequesterCount": return plain && link.rel === "recentTickets" && status === "WAITING_FOR_REQUESTER";
        case "resolvedCount": return plain && link.rel === "recentTickets" && resolvedStatuses.includes(String(status));
        case "recentlyResolvedCount": return plain && link.rel === "recentlyResolved";
        case "recentlyUpdatedCount": return plain && link.rel === "recentTickets" && status === undefined;
        case "unassignedCount": return q.ownerId === "unassigned" && openStatuses.includes(String(status));
        case "mineCount": return q.ownerId === userId && openStatuses.includes(String(status));
        case "highPriorityCount": return q.itPriority === "HIGH" && openStatuses.includes(String(status));
        default: return false;
      }
    });
  }
  function navigation(link: DashboardLink, label: string) {
    return <button type="button" className="btn btn-sm btn-outline-success" disabled={!onNavigate} onClick={() => onNavigate?.(link)}>{label}</button>;
  }
  function tickets(title: string, rows: DashboardTicket[]) {
    return <section className="card shadow-sm mb-3" aria-label={title}><div className="card-body">
      <h3 className="h5">{title}</h3>
      {rows.length === 0 ? <p>No Tickets in this seven-day period.</p> : <ul className="list-unstyled mb-0">{rows.map(ticket => <li className="border-bottom py-3 text-break" key={ticket.id}>
        <strong>{ticket.ticketNumber}</strong><p className="mb-1">{ticket.summary}</p>
        <p className="small mb-2">Status: {ticket.currentStatus} · IT Priority: {ticket.itPriority}{staff ? ` · Owner: ${ticket.owner?.name ?? "Unassigned"}` : ""} · Updated: {dashboardDate(ticket.updatedAt)}</p>
        {navigation(ticket.detailLink, `Open ${ticket.ticketNumber}`)}
      </li>)}</ul>}
    </div></section>;
  }
  const labels: Record<string, string> = { openCount: "Open Tickets", waitingForRequesterCount: "Waiting for Requester", resolvedCount: "Resolved Tickets", recentlyUpdatedCount: "Recently Updated", recentlyResolvedCount: "Recently Resolved", unassignedCount: "Unassigned Tickets", mineCount: "My Assigned Tickets", highPriorityCount: "High Priority Tickets" };
  const title = staff ? "Staff Dashboard" : "Requester Dashboard";
  const staffData = staff ? data as StaffDashboardData | null : null;
  return <section aria-label={title}>
    <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mb-3"><h2 className="h4 mb-0">{title}</h2><button type="button" className="btn btn-outline-success" disabled={state === "loading"} onClick={() => void load()}>Refresh Dashboard</button></div>
    {state === "loading" && <p className="alert alert-info" role="status" aria-live="polite">Loading dashboard...</p>}
    {state === "forbidden" && <p className="alert alert-warning" role="alert">Access denied. Your account cannot view this dashboard.</p>}
    {state === "error" && <div className="alert alert-danger" role="alert"><p>Unable to load the dashboard. Please try again.</p><button type="button" className="btn btn-outline-danger" onClick={() => void load()}>Retry</button></div>}
    {state === "loaded" && data && <>
      <p className="small text-body-secondary">Updated {dashboardDate(data.asOf)} ({data.timezone}). Recent lists cover the previous seven days.</p>
      <p className="small">List links open the existing Ticket lists. Those lists may include older Tickets; recent counts here use the seven-day period.</p>
      {Object.values(data.metrics).every(v => v === 0) && <p role="status">No Tickets match these dashboard metrics.</p>}
      <div className="row g-3 mb-4">{Object.entries(data.metrics).map(([metric, value]) => <div className="col-12 col-md-6 col-lg-4" key={metric}>
        <section className="card h-100 shadow-sm" aria-label={labels[metric]}><div className="card-body"><h3 className="h6">{labels[metric]}</h3><p className="display-6 text-success">{value}</p>
          <div className="d-flex flex-wrap gap-2">{linksFor(metric).map((link, index) => <span key={index}>{navigation(link, `View ${labels[metric]}${linksFor(metric).length > 1 ? `: ${String((link.query as unknown as Record<string, unknown>)[staff ? "status" : "currentStatus"])}` : ""}`)}</span>)}</div>
        </div></section>
      </div>)}</div>
      {staffData && <div className="row g-3 mb-3">{([["Tickets by Status", staffData.byStatus, "status"], ["Tickets by IT Priority", staffData.byPriority, "itPriority"]] as const).map(([heading, values, field]) => <section className="col-12 col-md-6" key={heading} aria-label={heading}><div className="card h-100"><div className="card-body"><h3 className="h5">{heading}</h3><ul className="list-unstyled">{Object.entries(values).map(([key, count]) => {
        const link = data.links.find(l => { const q = l.query as unknown as Record<string, unknown>; return l.rel === "recentTickets" && q?.[field] === key && q?.ownerId === undefined && (field === "status" ? q?.itPriority === undefined : q?.status === undefined); });
        return <li className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-1" key={key}><span>{key}: {count}</span>{link && navigation(link, `View ${key} Tickets`)}</li>;
      })}</ul></div></div></section>)}</div>}
      {tickets("Recently Updated Tickets", data.recentTickets)}
      <p className="small text-body-secondary">Recently Resolved includes Tickets currently RESOLVED or CLOSED that were updated during the previous seven days; it does not represent the exact resolution time.</p>
      {tickets("Recently Resolved Tickets", data.recentlyResolvedTickets)}
      {staffData && <section className="card" aria-label="My Recent Actions"><div className="card-body"><h3 className="h5">My Recent Actions</h3>{staffData.recentActions.length === 0 ? <p>No Actions in this seven-day period.</p> : <ul className="list-unstyled">{staffData.recentActions.map(action => <li key={action.id} className="border-bottom py-3 text-break"><p>{action.description}</p><p>Result: {action.result}</p><p className="small">Performed by {action.performedBy.name} · {dashboardDate(action.actionAt)}</p>{navigation(action.detailLink, `Open Ticket for Action ${action.id}`)}</li>)}</ul>}</div></section>}
    </>}
  </section>;
}

export function RequesterDashboard(props: Props) { return <Dashboard {...props} staff={false} />; }
export function StaffDashboard(props: Props) { return <Dashboard {...props} staff />; }
