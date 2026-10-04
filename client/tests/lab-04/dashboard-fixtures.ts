import type { DashboardLink, RequesterDashboardData, StaffDashboardData, TicketStatus } from "../../src/api.js";

export const date = "2026-10-03T17:00:00.000Z";
export const staffUser = { id: 7, name: "Current Staff", email: "staff@test", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false };
export function listLink(status?: TicketStatus, staff = false, extra = {}, rel: DashboardLink["rel"] = "recentTickets"): DashboardLink {
  return { rel, target: staff ? "staff-queue" : "requester-tickets", query: staff
    ? { sortBy: "updatedAt", sortOrder: "desc", page: 1, pageSize: 10, ...(status ? { status } : {}), ...extra }
    : { sortBy: "updatedAt", sortDirection: "desc", page: 1, pageSize: 10, ...(status ? { currentStatus: status } : {}), ...extra } };
}
export const statuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
export function requesterData(): RequesterDashboardData {
  return { timezone: "Asia/Bangkok", asOf: date, metrics: { openCount: 120, waitingForRequesterCount: 1, resolvedCount: 4, recentlyUpdatedCount: 31, recentlyResolvedCount: 2 },
    recentTickets: [{ id: 42, ticketNumber: "T-42", summary: "Owned Ticket", currentStatus: "OPEN", requestedPriority: "LOW", itPriority: "HIGH", updatedAt: date, detailLink: { rel: "ticketDetail", target: "requester-ticket-detail", ticketId: 42 } }],
    recentlyResolvedTickets: [], links: [listLink(), ...statuses.map(s => listLink(s)), listLink("RESOLVED", false, {}, "recentlyResolved"), listLink("CLOSED", false, {}, "recentlyResolved")] };
}
export function staffData(): StaffDashboardData {
  const base = requesterData();
  return { timezone: base.timezone, asOf: base.asOf, metrics: { unassignedCount: 18, mineCount: 2, highPriorityCount: 55, recentlyUpdatedCount: 200, recentlyResolvedCount: 9 },
    byStatus: { NEW: 0, OPEN: 120, IN_PROGRESS: 2, WAITING_FOR_REQUESTER: 0, RESOLVED: 3, CLOSED: 1, REOPENED: 0, CANCELLED: 0 }, byPriority: { LOW: 0, MEDIUM: 2, HIGH: 124 },
    recentTickets: base.recentTickets.map(t => ({ ...t, owner: staffUser, detailLink: { ...t.detailLink, target: "staff-ticket-detail" } })), recentlyResolvedTickets: [],
    recentActions: [{ id: 51, ticketId: 42, actionAt: date, description: "Checked connection", result: "Restored", performedBy: staffUser, detailLink: { rel: "ticketDetail", target: "staff-ticket-detail", ticketId: 42 } }],
    links: [listLink(undefined, true), ...statuses.map(s => listLink(s, true)), ...(["RESOLVED", "CLOSED"] as const).map(s => listLink(s, true, {}, "recentlyResolved")),
      ...statuses.filter(s => ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"].includes(s)).flatMap(s => [listLink(s, true, { ownerId: "unassigned" }), listLink(s, true, { ownerId: 7 }), listLink(s, true, { itPriority: "HIGH" })]),
      ...(["LOW", "MEDIUM", "HIGH"] as const).map(itPriority => listLink(undefined, true, { itPriority }))] };
}
