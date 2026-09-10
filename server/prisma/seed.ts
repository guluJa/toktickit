import { randomUUID } from "node:crypto";
import { hashPassword } from "../src/auth.js";
import { getPrisma } from "../src/prisma.js";

const categories = [
  "Account and Access",
  "Hardware",
  "Software",
  "Network",
];

const relatedSystems = [
  {
    name: "Email",
    description: "Institutional email and mailbox services",
  },
  {
    name: "Campus Wi-Fi",
    description: "Wireless network services on campus",
  },
  {
    name: "VPN",
    description: "Remote access to internal services",
  },
  {
    name: "LEB2 App",
    description: "Learning Environment application",
  },
  {
    name: "Grade Submission App",
    description: "Online grade submission system",
  },
  {
    name: "Printer",
    description: "Shared printer and printing services",
  },
  {
    name: "Corporate Laptop",
    description: "Organization-managed laptop devices",
  },
];

const users = [
  {
    name: "Development Requester 1",
    email: "requester1@toktickit.test",
    role: "REQUESTER" as const,
    isActive: true,
  },
  {
    name: "Development Requester 2",
    email: "requester2@toktickit.test",
    role: "REQUESTER" as const,
    isActive: true,
  },
  {
    name: "Development Requester 3",
    email: "requester3@toktickit.test",
    role: "REQUESTER" as const,
    isActive: true,
  },
  {
    name: "Development Requester 4",
    email: "requester4@toktickit.test",
    role: "REQUESTER" as const,
    isActive: true,
  },
  {
    name: "Inactive Development Requester",
    email: "inactive-requester@toktickit.test",
    role: "REQUESTER" as const,
    isActive: false,
  },
  { name: "IT Staff 1", email: "staff1@toktickit.test", role: "IT_STAFF" as const, isActive: true },
  { name: "IT Staff 2", email: "staff2@toktickit.test", role: "IT_STAFF" as const, isActive: true },
  { name: "IT Staff 3", email: "staff3@toktickit.test", role: "IT_STAFF" as const, isActive: true },
  { name: "Inactive IT Staff", email: "inactive-staff@toktickit.test", role: "IT_STAFF" as const, isActive: false },
  { name: "Lab Administrator", email: "admin@toktickit.test", role: "ADMINISTRATOR" as const, isActive: true },
];

const localInitialPassword = process.env.LAB3_INITIAL_PASSWORD;

async function main() {
  const prisma = getPrisma();

  if (!localInitialPassword) {
    throw new Error("LAB3_INITIAL_PASSWORD must be set for local seed execution.");
  }

  const seedPasswordHash = await hashPassword(
    localInitialPassword,
    "toktickit-lab3-seed-v1",
  );
  const userIds = new Map<string, number>();

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: {
        name,
        isActive: true,
      },
    });
  }

  for (const system of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: {
        description: system.description,
        isActive: true,
      },
      create: {
        ...system,
        isActive: true,
      },
    });
  }

  for (const definition of users) {
    const existing = await prisma.requesterUser.findUnique({
      where: { email: definition.email },
      select: { id: true, passwordHash: true },
    });

    const user = existing
      ? await prisma.requesterUser.update({
          where: { id: existing.id },
          data: {
            name: definition.name,
            role: definition.role,
            isActive: definition.isActive,
            ...(existing.passwordHash === "!"
              ? {
                  passwordHash: seedPasswordHash,
                  mustChangePassword: true,
                }
              : {}),
          },
        })
      : await prisma.requesterUser.create({
          data: {
            ...definition,
            passwordHash: seedPasswordHash,
            mustChangePassword: true,
          },
        });

    userIds.set(definition.email, user.id);
  }

  const categoryIds = new Map(
    (await prisma.category.findMany({ select: { id: true, name: true } }))
      .map((category) => [category.name, category.id] as const),
  );
  const systemIds = new Map(
    (await prisma.relatedSystem.findMany({ select: { id: true, name: true } }))
      .map((system) => [system.name, system.id] as const),
  );

  const tickets = [
    {
      number: "TKT-LAB3-0001",
      requester: "requester1@toktickit.test",
      category: "Network",
      system: "Campus Wi-Fi",
      summary: "Campus Wi-Fi disconnects",
      priority: "HIGH" as const,
      description: "The connection drops repeatedly during work.",
      owner: "staff1@toktickit.test",
    },
    {
      number: "TKT-LAB3-0002",
      requester: "requester2@toktickit.test",
      category: "Hardware",
      system: "Corporate Laptop",
      summary: "Laptop will not start",
      priority: "MEDIUM" as const,
      description: "The managed laptop does not start after charging.",
      owner: null,
    },
    {
      number: "TKT-LAB3-0003",
      requester: "requester3@toktickit.test",
      category: "Account and Access",
      system: "Email",
      summary: "Email access request",
      priority: "LOW" as const,
      description: "The requester needs help accessing institutional email.",
      owner: "staff2@toktickit.test",
    },
    {
      number: "TKT-LAB3-0004",
      requester: "requester4@toktickit.test",
      category: "Software",
      system: "LEB2 App",
      summary: "Application error on submission",
      priority: "HIGH" as const,
      description: "The application displays an error when submitting work.",
      owner: "staff3@toktickit.test",
    },
    {
      number: "TKT-LAB3-0005",
      requester: "requester1@toktickit.test",
      category: "Network",
      system: "VPN",
      summary: "VPN setup help",
      priority: "MEDIUM" as const,
      description: "The requester needs help configuring the VPN.",
      owner: null,
    },
  ];

  for (const definition of tickets) {
    const requesterId = userIds.get(definition.requester);
    const categoryId = categoryIds.get(definition.category);
    const relatedSystemId = systemIds.get(definition.system);
    const ownerId = definition.owner
      ? userIds.get(definition.owner) ?? null
      : null;

    if (!requesterId || !categoryId || !relatedSystemId) {
      throw new Error("Unable to resolve local seed references.");
    }

    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: definition.number },
      update: {
        requesterId,
        categoryId,
        relatedSystemId,
        summary: definition.summary,
        requestedPriority: definition.priority,
        itPriority: definition.priority,
        description: definition.description,
        ownerId,
      },
      create: {
        ticketNumber: definition.number,
        requesterId,
        submissionKey: randomUUID(),
        categoryId,
        relatedSystemId,
        summary: definition.summary,
        requestedPriority: definition.priority,
        itPriority: definition.priority,
        description: definition.description,
        ownerId,
      },
    });

    if (ownerId) {
      const commentContent = "Seeded public comment for local development.";
      const noteContent = "Seeded internal note for local development.";
      const existingComment = await prisma.comment.findFirst({
        where: { ticketId: ticket.id, content: commentContent },
      });
      if (!existingComment) {
        await prisma.comment.create({
          data: { ticketId: ticket.id, authorId: ownerId, content: commentContent },
        });
      }
      const existingNote = await prisma.internalNote.findFirst({
        where: { ticketId: ticket.id, content: noteContent },
      });
      if (!existingNote) {
        await prisma.internalNote.create({
          data: { ticketId: ticket.id, authorId: ownerId, content: noteContent },
        });
      }
    }
  }

  console.log("Seeded Lab 3 local users, reference data and tickets successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
