import { Prisma } from "@prisma/client";
export { allowedStatusTransitions, isAllowedStatusTransition } from "./ticket-workflow.js";

export const staffTicketDetailSelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  description: true,
  currentStatus: true,
  version: true,
  requesterResolvedAt: true,
  createdAt: true,
  updatedAt: true,
  requester: { select: { id: true, name: true, email: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true, role: true } },
  attachments: {
    select: {
      id: true,
      ticketId: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      uploadedAt: true,
      removedAt: true,
      removalReason: true,
    },
    orderBy: [{ uploadedAt: "asc" }, { id: "asc" }],
  },
  comments: {
    select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  internalNotes: {
    select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.TicketSelect;

export type StaffTicketDetailRecord = Prisma.TicketGetPayload<{
  select: typeof staffTicketDetailSelect;
}>;

export function toAttachmentMetadata(attachment: StaffTicketDetailRecord["attachments"][number]) {
  return {
    ...attachment,
    state: attachment.removedAt ? ("REMOVED" as const) : ("ACTIVE" as const),
  };
}

export function toStaffTicketDetail(ticket: StaffTicketDetailRecord) {
  const comments = ticket.comments.map((comment) => ({ ...comment }));
  const internalNotes = ticket.internalNotes.map((note) => ({ ...note }));
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    description: ticket.description,
    currentStatus: ticket.currentStatus,
    version: ticket.version,
    requesterResolvedAt: ticket.requesterResolvedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    requester: ticket.requester,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    owner: ticket.owner,
    attachments: ticket.attachments.map(toAttachmentMetadata),
    comments,
    internalNotes,
  };
}
