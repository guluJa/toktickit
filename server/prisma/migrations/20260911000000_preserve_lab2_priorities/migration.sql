-- Preserve the Lab 2 requester-selected priority when introducing the IT queue priority.
UPDATE "Ticket" SET "itPriority" = "requestedPriority";
