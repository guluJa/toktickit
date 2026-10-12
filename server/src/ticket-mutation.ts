import type { Prisma } from "@prisma/client";

// All Action/Status writers lock the parent before reading state or children.
// READ COMMITTED ensures reads after a waiting lock see the preceding commit.
export async function lockTicketMutation(tx: Prisma.TransactionClient, ticketId: number): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticketId} FOR UPDATE`;
}
