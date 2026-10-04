import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assertDedicatedE2EDatabase } from "../database-guard.js";

test("SAFETY-01: reject Development database despite different credentials/query and require explicit E2E marker", () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "toktickit-guard-"));
  const env = path.join(folder, ".env");
  try {
    fs.writeFileSync(env, 'DATABASE_URL="postgresql://a:example@localhost/toktickit_e2e?schema=public"');
    expect(() => assertDedicatedE2EDatabase(undefined, env)).toThrow("required");
    expect(() => assertDedicatedE2EDatabase("postgresql://a:example@localhost/toktickit", env)).toThrow("marker");
    expect(() => assertDedicatedE2EDatabase("postgres://b:other@localhost:5432/toktickit_e2e?schema=other", env)).toThrow("matches");
    expect(() => assertDedicatedE2EDatabase("postgres://b:other@127.0.0.1:5432/toktickit_e2e", env)).toThrow("matches");
    expect(assertDedicatedE2EDatabase("postgresql://a:example@localhost/toktickit_other_e2e", env)).toContain("toktickit_other_e2e");
  } finally {
    // Only the explicit file and empty temporary directory created by this test.
    fs.unlinkSync(env); fs.rmdirSync(folder);
  }
});
