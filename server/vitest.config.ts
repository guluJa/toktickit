import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Lab 2 header fixtures are opt-in compatibility coverage only. Application
    // traffic never sets this flag; Lab 3 auth tests can disable it explicitly.
    setupFiles: ["tests/setup.ts"],
  },
});
