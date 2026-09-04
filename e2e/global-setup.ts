const API_URL = "http://127.0.0.1:3000";
const CLIENT_URL = "http://127.0.0.1:5173";

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
    `${API_URL}/api/development-requesters`,
    "PostgreSQL-backed Development Requester API",
  );
  await requireSuccessfulResponse(
    CLIENT_URL,
    "Frontend",
  );
}
