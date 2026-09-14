import fs from "node:fs";

/**
 * E2E database policy: the database name must explicitly contain an `e2e`
 * marker, and it must not be the DATABASE_URL configured for development.
 * This gives local cleanup a positive safety signal instead of relying only
 * on an exact URL comparison.
 */
export function assertDedicatedE2EDatabase(
  databaseUrl: string | undefined,
  developmentEnvPath: string,
): string {
  const value = databaseUrl?.trim();
  if (!value) {
    throw new Error(
      "E2E_DATABASE_URL is required. Refusing to run against a non-E2E database.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("E2E_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("E2E_DATABASE_URL must use the PostgreSQL protocol.");
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!/(^|[_-])e2e($|[_-])/i.test(databaseName)) {
    throw new Error(
      "E2E_DATABASE_URL database name must contain an explicit e2e marker.",
    );
  }

  if (fs.existsSync(developmentEnvPath)) {
    const developmentEnv = fs.readFileSync(developmentEnvPath, "utf8");
    const databaseLine = developmentEnv
      .split(/\r?\n/)
      .find((line) => /^\s*DATABASE_URL\s*=/.test(line));
    const developmentDatabaseUrl = databaseLine
      ?.slice(databaseLine.indexOf("=") + 1)
      .trim()
      .replace(/^"|"$/g, "");

    if (developmentDatabaseUrl && normalizeDatabaseUrl(developmentDatabaseUrl) === normalizeDatabaseUrl(value)) {
      throw new Error(
        "E2E_DATABASE_URL matches server/.env DATABASE_URL. Refusing to use the development database.",
      );
    }
  }

  return value;
}

function normalizeDatabaseUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}
