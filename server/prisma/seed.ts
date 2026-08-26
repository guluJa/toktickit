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

const developmentRequesters = [
  {
    name: "Development Requester 1",
    email: "requester1@toktickit.test",
    isActive: true,
  },
  {
    name: "Development Requester 2",
    email: "requester2@toktickit.test",
    isActive: true,
  },
  {
    name: "Development Requester 3",
    email: "requester3@toktickit.test",
    isActive: true,
  },
  {
    name: "Development Requester 4",
    email: "requester4@toktickit.test",
    isActive: true,
  },
  {
    name: "Inactive Development Requester",
    email: "inactive-requester@toktickit.test",
    isActive: false,
  },
];

async function main() {
  const prisma = getPrisma();

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

  for (const requester of developmentRequesters) {
    await prisma.requesterUser.upsert({
      where: { email: requester.email },
      update: {
        name: requester.name,
        isActive: requester.isActive,
      },
      create: requester,
    });
  }

  console.log("Seeded Lab 2 reference data successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });