import type { Express, Request, Response } from "express";
import { Prisma, RequestedPriority, TicketStatus } from "@prisma/client";
import { requireAuthenticated, requireNormalApplicationAccess } from "./auth.js";
import { requireStaffQueueAccess } from "./staff-access.js";
import { getPrisma } from "./prisma.js";

export const openStatuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const resolvedStatuses: TicketStatus[] = ["RESOLVED", "CLOSED"];
const safeUserSelect = { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true } as const;
const ticketSelect = { id: true, ticketNumber: true, summary: true, currentStatus: true, requestedPriority: true, itPriority: true, updatedAt: true } as const;
type Link = { rel: "recentTickets" | "recentlyResolved" | "ticketDetail"; target: string; ticketId?: number; query?: Record<string, string | number> };

export function dashboardWindow(asOf: Date) {
  // Bangkok has a fixed UTC+07 offset: a rolling seven-day interval is seven
  // complete 24-hour periods, not seven midnight-aligned calendar dates.
  return { gte: new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000), lt: asOf };
}

export async function readDashboard(tx: Prisma.TransactionClient, userId: number, staff: boolean, limit: number, asOf: Date) {
  const base: Prisma.TicketWhereInput = staff ? {} : { requesterId: userId };
  const updatedAt = dashboardWindow(asOf);
  const recentWhere = { ...base, updatedAt };
  const resolvedWhere = { ...base, currentStatus: { in: resolvedStatuses } };
  const detailTarget = staff ? "staff-ticket-detail" : "requester-ticket-detail";
  const detailLink = (ticketId: number): Link => ({ rel: "ticketDetail", target: detailTarget, ticketId });
  const listLink = (status?: TicketStatus, extra: Record<string, string | number> = {}, rel: Link["rel"] = "recentTickets"): Link => ({
    rel, target: staff ? "staff-queue" : "requester-tickets", query: {
      sortBy: "updatedAt", [staff ? "sortOrder" : "sortDirection"]: "desc", page: 1, pageSize: 10,
      ...(status ? { [staff ? "status" : "currentStatus"]: status } : {}), ...extra,
    },
  });
  const [recentlyUpdatedCount, recentlyResolvedCount, recentTickets, recentlyResolvedTickets] = await Promise.all([
    tx.ticket.count({ where: recentWhere }),
    tx.ticket.count({ where: { ...resolvedWhere, updatedAt } }),
    tx.ticket.findMany({ where: recentWhere, select: { ...ticketSelect, ...(staff ? { owner: { select: safeUserSelect } } : {}) }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: limit }),
    tx.ticket.findMany({ where: { ...resolvedWhere, updatedAt }, select: { ...ticketSelect, ...(staff ? { owner: { select: safeUserSelect } } : {}) }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: limit }),
  ]);
  const common = {
    timezone: "Asia/Bangkok", asOf: asOf.toISOString(),
    recentTickets: recentTickets.map(t => ({ ...t, detailLink: detailLink(t.id) })),
    recentlyResolvedTickets: recentlyResolvedTickets.map(t => ({ ...t, detailLink: detailLink(t.id) })),
  };
  const links = [listLink(), ...Object.values(TicketStatus).map(s => listLink(s)), ...resolvedStatuses.map(s => listLink(s, {}, "recentlyResolved"))];
  if (!staff) {
    const [openCount, waitingForRequesterCount, resolvedCount] = await Promise.all([
      tx.ticket.count({ where: { ...base, currentStatus: { in: openStatuses } } }),
      tx.ticket.count({ where: { ...base, currentStatus: "WAITING_FOR_REQUESTER" } }),
      tx.ticket.count({ where: resolvedWhere }),
    ]);
    return { ...common, metrics: { openCount, waitingForRequesterCount, resolvedCount, recentlyUpdatedCount, recentlyResolvedCount }, links };
  }
  const [unassignedCount, mineCount, highPriorityCount, statuses, priorities, recentActions] = await Promise.all([
    tx.ticket.count({ where: { ownerId: null, currentStatus: { in: openStatuses } } }),
    tx.ticket.count({ where: { ownerId: userId, currentStatus: { in: openStatuses } } }),
    tx.ticket.count({ where: { itPriority: "HIGH", currentStatus: { in: openStatuses } } }),
    tx.ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
    tx.ticket.groupBy({ by: ["itPriority"], _count: { _all: true } }),
    tx.actionTaken.findMany({ where: { performedById: userId, actionAt: updatedAt }, select: { id: true, ticketId: true, actionAt: true, description: true, result: true, performedBy: { select: safeUserSelect } }, orderBy: [{ actionAt: "desc" }, { id: "desc" }], take: limit }),
  ]);
  const byStatus = Object.fromEntries(Object.values(TicketStatus).map(s => [s, statuses.find(g => g.currentStatus === s)?._count._all ?? 0]));
  const byPriority = Object.fromEntries(Object.values(RequestedPriority).map(p => [p, priorities.find(g => g.itPriority === p)?._count._all ?? 0]));
  links.push(...openStatuses.flatMap(s => [listLink(s, { ownerId: "unassigned" }), listLink(s, { ownerId: userId }), listLink(s, { itPriority: "HIGH" })]),
    ...Object.values(RequestedPriority).map(p => listLink(undefined, { itPriority: p })));
  return { ...common, metrics: { unassignedCount, mineCount, highPriorityCount, recentlyUpdatedCount, recentlyResolvedCount }, byStatus, byPriority,
    recentActions: recentActions.map(a => ({ ...a, detailLink: detailLink(a.ticketId) })), links };
}

async function dashboard(req: Request, res: Response, staff: boolean) {
  const raw = req.query.limit;
  const limit = raw === undefined ? 20 : typeof raw === "string" && /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || Object.keys(req.query).some(k => k !== "limit")) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "limit must be an integer from 1 to 100.", fields: { limit: "Use an integer from 1 to 100; custom date ranges are not supported." } } });
    return;
  }
  try {
    const asOf = new Date();
    // Counts and limited lists come from one consistent snapshot, not from
    // counting a paginated list or observing different concurrent revisions.
    const data = await getPrisma().$transaction(tx => readDashboard(tx, req.authUser!.id, staff, limit, asOf), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    res.json({ data });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Unable to load the dashboard. Please try again." } });
  }
}

export function registerDashboardRoutes(app: Express) {
  app.get("/api/requester/dashboard", requireAuthenticated, requireNormalApplicationAccess, (req, res, next) => {
    if (req.authUser?.role !== "REQUESTER") { res.status(403).json({ error: { code: "ROLE_FORBIDDEN", message: "This dashboard is not available for the current role." } }); return; }
    next();
  }, (req, res) => dashboard(req, res, false));
  app.get("/api/staff/dashboard", requireStaffQueueAccess, (req, res) => dashboard(req, res, true));
}
