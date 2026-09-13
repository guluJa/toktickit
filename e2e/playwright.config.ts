import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDirectory = path.dirname(fileURLToPath(import.meta.url));

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
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: true,
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
