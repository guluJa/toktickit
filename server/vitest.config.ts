import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // API suites share one PostgreSQL test database. Running test files in
    // parallel can let fixture writes interfere with migration row-count
    // assertions, so keep the standard test command deterministic.
    fileParallelism: false,
    // Lab 2 header fixtures are opt-in compatibility coverage only. Application
    // traffic never sets this flag; Lab 3 auth tests can disable it explicitly.
    setupFiles: ["tests/setup.ts"],
  },
});
