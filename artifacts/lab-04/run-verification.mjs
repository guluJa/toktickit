import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envFile = fs.readFileSync(path.join(root, "server/.env"), "utf8");
const read = key => envFile.split(/\r?\n/).find(l => l.startsWith(key + "="))?.slice(key.length + 1).trim().replace(/^"|"$/g, "");
const original = new URL(read("DATABASE_URL")); const testUrl = new URL(original); testUrl.pathname = "/toktickit_e2e";
if (original.hostname === testUrl.hostname && original.port === testUrl.port && original.pathname === testUrl.pathname) throw Error("Refusing verification on Development database");
const env = { ...process.env, DATABASE_URL: testUrl.toString(), E2E_DATABASE_URL: testUrl.toString(), LAB3_INITIAL_PASSWORD: read("LAB3_INITIAL_PASSWORD"), FORCE_COLOR: "0" };
const secretValues = [original.password, decodeURIComponent(original.password), env.LAB3_INITIAL_PASSWORD, "Lab3-E2E-Password1!"] .filter(Boolean);
const sanitize = text => secretValues.reduce((s, v) => s.split(v).join("[REDACTED]"), text).replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[DATABASE_URL_REDACTED]").replace(/toktickit_session=[^\s;"']+/g, "toktickit_session=[REDACTED]").replace(/\b[a-f0-9]{64,128}\b/gi, "[HASH_REDACTED]");
const folder = path.join(root, "artifacts/lab-04/verification"); fs.mkdirSync(folder, { recursive: true });
const results = [];
const previous = fs.existsSync(path.join(folder, "commands.json")) ? JSON.parse(fs.readFileSync(path.join(folder, "commands.json"), "utf8")).results : [];
function run(id, cwd, command, args) {
  const start = new Date(); const cmd = [command, ...args].join(" "); console.log(`${id}: ${cmd}`);
  const r = spawnSync(cmd, { cwd: path.join(root, cwd), env, shell: true, encoding: "utf8", timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  const stdout = sanitize(r.stdout || "").replace(/[\t ]+$/gm, ""), stderr = sanitize((r.stderr || "") + (r.error?.message || "")).replace(/[\t ]+$/gm, "");
  fs.writeFileSync(path.join(folder, id + ".txt"), `Command: ${cmd}\nStarted: ${start.toISOString()}\nExit: ${r.status}\nSTDOUT\n${stdout}\nSTDERR\n${stderr}`);
  results.push({ id, command: cmd, startedAt: start.toISOString(), exitCode: r.status, durationMs: Date.now() - start.getTime() }); console.log(`${id}: exit ${r.status}`);
  const latest = [...previous.filter(old => !results.some(r => r.id === old.id)), ...results];
  fs.writeFileSync(path.join(folder, "commands.json"), JSON.stringify({ baseline: "51bcf9c", scope: "feature/06-lab4-final-hardening working tree; not Final-main; latest result per command", results: latest }, null, 2) + "\n"); return r.status === 0;
}
const mode = process.argv[2] || "all";
if (["all", "prepare"].includes(mode)) {
  for (const [id, args] of [["prisma-validate", ["--no-install", "prisma", "validate"]], ["prisma-generate", ["--no-install", "prisma", "generate"]], ["migration-status", ["--no-install", "prisma", "migrate", "status"]], ["migration-deploy", ["--no-install", "prisma", "migrate", "deploy"]]]) if (!run(id, "server", "npx.cmd", args)) process.exit(1);
  if (!run("seed-first", "server", "npm.cmd", ["run", "prisma:seed"]) || !run("seed-second", "server", "npm.cmd", ["run", "prisma:seed"])) process.exit(1);
}
if (["all", "recovery"].includes(mode)) run("recovery-restore", ".", "pwsh.exe", ["-NoProfile", "-File", "artifacts/lab-04/verify-recovery.ps1"]);
if (["all", "unit"].includes(mode)) {
  run("performance-smoke", "server", "npm.cmd", ["test", "--", "tests/lab-04/performance-smoke.api.test.ts"]);
  run("server-focused", "server", "npm.cmd", ["test", "--", "tests/lab-04", "--silent"]); run("server-full", "server", "npm.cmd", ["test", "--", "--silent"]);
  run("client-focused", "client", "npm.cmd", ["test", "--", "tests/lab-04", "--silent"]); run("client-full", "client", "npm.cmd", ["test", "--", "--silent"]);
  run("server-build", "server", "npm.cmd", ["run", "build"]); run("client-build", "client", "npm.cmd", ["run", "build"]);
}
if (["all", "e2e", "focused-e2e", "browser"].includes(mode)) run("e2e" + (mode === "focused-e2e" ? "-focused" : "-full"), "e2e", "npm.cmd", ["test", "--", ...(mode === "focused-e2e" ? ["lab-04"] : [])]);
if (["responsive", "browser"].includes(mode)) run("responsive", "e2e", "npm.cmd", ["run", "test:responsive"]);
if (mode === "checks") {
  const required = [
    ...["specification", "api-spec", "ui-spec", "tests", "reviewer", "ai-use"].map(name => `docs/lab-04/${name}.md`),
    ...["actions-taken", "ticket-workflow", "requester-dashboard", "staff-dashboard"].map(name => `server/tests/lab-04/${name}.api.test.ts`),
    ...["StaffDashboard", "RequesterDashboard", "ActionsTaken", "TicketWorkflow"].map(name => `client/tests/lab-04/${name}.test.tsx`),
    ...["actions-taken-flow", "ticket-resolution", "dashboards"].map(name => `e2e/lab-04/${name}.spec.ts`),
    ...["staff-dashboard", "requester-dashboard", "actions-taken"].map(name => `artifacts/lab-04/screenshots/${name}`),
  ];
  const missing = required.filter(relative => !fs.existsSync(path.join(root, relative)));
  if (missing.length) throw Error("Missing Labsheet minimum paths: " + missing.join(", "));
  run("diff-check", ".", "git", ["diff", "--check"]);
  run("diff-stat", ".", "git", ["diff", "--stat"]);
  run("git-status", ".", "git", ["status", "--short", "--branch"]);
  const git = args => spawnSync("git", args, { cwd: root, encoding: "utf8" }).stdout.trim();
  const paths = [...new Set([...git(["diff", "--name-only"]).split(/\r?\n/), ...git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/)])].filter(Boolean);
  const whitespaceErrors = [], secretMatches = [], entries = [];
  for (const relative of paths) {
    const filename = path.resolve(root, relative);
    if (!filename.toLowerCase().startsWith(root.toLowerCase() + path.sep)) throw Error("Out-of-workspace evidence path");
    if (!fs.existsSync(filename)) continue;
    const bytes = fs.readFileSync(filename);
    entries.push({ path: relative, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    if (/\.(md|ts|tsx|mjs|json|txt)$/.test(relative)) {
      const body = bytes.toString("utf8");
      body.split(/\r?\n/).forEach((line, i) => { if (/[\t ]+$/.test(line)) whitespaceErrors.push(`${relative}:${i + 1}`); });
      if (relative.startsWith("artifacts/lab-04/verification/") && (secretValues.some(value => body.includes(value)) || /postgres(?:ql)?:\/\/[^\s"']+|toktickit_session=(?!\[REDACTED\])[^\s;"']+/i.test(body))) secretMatches.push(relative);
    }
  }
  if (whitespaceErrors.length || secretMatches.length) {
    console.error(JSON.stringify({ whitespaceErrors, secretMatches })); process.exit(1);
  }
  fs.writeFileSync(path.join(folder, "working-tree-manifest.json"), JSON.stringify({ head: git(["rev-parse", "HEAD"]), branch: git(["branch", "--show-current"]), capturedAt: new Date().toISOString(), scope: "Uncommitted feature working tree; not staged, not staging-after-merge or Final-main", minimumStructure: { required, missing }, screenshotCount: entries.filter(e => e.path.endsWith(".png")).length, whitespaceErrors, secretMatches, files: entries.filter(e => !e.path.startsWith("artifacts/lab-04/verification/")) }, null, 2) + "\n");
  console.log(`Checked ${paths.length} changed/untracked files; no trailing whitespace or secret values in verification text. See working-tree-manifest.json.`);
}
process.exit(results.some(r => r.exitCode !== 0) ? 1 : 0);
