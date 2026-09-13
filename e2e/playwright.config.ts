import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDirectory = path.dirname(fileURLToPath(import.meta.url));
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL?.trim();

if (!e2eDatabaseUrl) {
  throw new Error(
    "E2E_DATABASE_URL is required. Playwright will not start against the development database.",
  );
}

const developmentEnvPath = path.resolve(e2eDirectory, "../server/.env");
if (fs.existsSync(developmentEnvPath)) {
  const developmentEnv = fs.readFileSync(developmentEnvPath, "utf8");
  const databaseLine = developmentEnv
    .split(/\r?\n/)
    .find((line) => /^\s*DATABASE_URL\s*=/.test(line));
  const developmentDatabaseUrl = databaseLine
    ?.slice(databaseLine.indexOf("=") + 1)
    .trim()
    .replace(/^"|"$/g, "");

  if (developmentDatabaseUrl && developmentDatabaseUrl === e2eDatabaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL matches server/.env DATABASE_URL. Refusing to run E2E against the development database.",
    );
  }
}

export default defineConfig({
  // Lab 2 browser specs exercised the retired Development Requester selector.
  // Lab 3 owns the authenticated end-to-end suite and the regression coverage.
  testDir: ".",
  testIgnore: ["**/lab-02/**"],
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: path.resolve(e2eDirectory, "../test-results"),
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: {
      width: 1440,
      height: 1000,
    },
  },
  reporter: [["list"], ["html", { outputFolder: path.resolve(e2eDirectory, "../playwright-report"), open: "never" }]],
  webServer: [
    {
      command: "npm.cmd run dev",
      cwd: path.resolve(e2eDirectory, "../server"),
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl },
      url: "http://127.0.0.1:3000/api/health",
      // Never reuse a server that may have loaded server/.env and connected
      // to the development database.
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm.cmd run dev -- --host 127.0.0.1",
      cwd: path.resolve(e2eDirectory, "../client"),
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
