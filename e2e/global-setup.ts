import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = "http://127.0.0.1:3000";
const CLIENT_URL = "http://localhost:5173";

async function requireSuccessfulResponse(
  url: string,
  description: string,
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${description} prerequisite failed with HTTP ${response.status}.`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  await requireSuccessfulResponse(
    `${API_URL}/api/health`,
    "Backend health",
  );
  await requireSuccessfulResponse(
    CLIENT_URL,
    "Frontend",
  );
  const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
  for (const directory of ["authentication", "staff-queue", "staff-ticket-detail", "user-management"]) {
    await fs.mkdir(path.join(repositoryRoot, "artifacts", "lab-03", "screenshots", directory), { recursive: true });
  }
}
