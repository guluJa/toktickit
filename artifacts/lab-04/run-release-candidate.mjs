import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

// Verify a committed staging snapshot without overwriting historical evidence.
// No checkout, reset, staging, commit, network write or Development DB mutation.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw Error(`Git check failed: ${args.join(" ")}`);
  return result.stdout.trim();
}
const revision = git(["rev-parse", "--verify", `${process.argv[2] || "lab4-staging"}^{commit}`]);
if (revision !== git(["rev-parse", "lab4-staging"])) throw Error("Candidate must be the local lab4-staging commit.");
git(["diff", "--exit-code", revision, "--", "server", "client", "e2e", ".github"]);
const destination = path.join(root, "artifacts/lab-04/release-candidate", revision.slice(0, 7));
if (fs.existsSync(destination)) throw Error("Evidence directory exists; preserve it and choose a new candidate/run explicitly.");
const envFile = fs.readFileSync(path.join(root, "server/.env"), "utf8");
const read = key => envFile.split(/\r?\n/).find(line => line.startsWith(key + "="))?.slice(key.length + 1).trim().replace(/^"|"$/g, "");
const original = new URL(read("DATABASE_URL"));
if (!['localhost', '127.0.0.1'].includes(original.hostname) || decodeURIComponent(original.pathname.slice(1)) === "toktickit_e2e") {
  throw Error("Only a local dedicated toktickit_e2e database, separate from Development, is supported.");
}
const secrets = [original.password, decodeURIComponent(original.password), read("LAB3_INITIAL_PASSWORD"), "Lab3-E2E-Password1!"].filter(Boolean);
const sanitize = value => secrets.reduce((body, secret) => body.split(secret).join("[REDACTED]"), value)
  .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[DATABASE_URL_REDACTED]")
  .replace(/toktickit_session=[^\s;"']+/g, "toktickit_session=[REDACTED]");
const hash = filename => createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
const historicalFiles = git(["ls-files", "artifacts/lab-03", "artifacts/lab-04/verification", "artifacts/lab-04/screenshots", "artifacts/lab-04/migration-recovery.txt"])
  .split(/\r?\n/).filter(Boolean);
const historicalHashes = new Map(historicalFiles.map(relative => [relative, hash(path.join(root, relative))]));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "toktickit-lab4-rc-"));
const startedAt = new Date().toISOString();
const phases = [];
fs.mkdirSync(destination, { recursive: true });
let infrastructureError;
try {
  const archive = path.join(scratch, "candidate.tar");
  git(["archive", "--format=tar", `--output=${archive}`, revision]);
  const unpack = spawnSync("tar", ["-xf", archive, "-C", scratch], { encoding: "utf8" });
  if (unpack.status !== 0) throw Error("Could not unpack candidate snapshot.");
  // Reuse installed locked dependencies, not application code from another tree.
  for (const group of ["server", "client", "e2e"]) {
    const installed = path.join(root, group, "node_modules");
    if (!fs.existsSync(installed)) throw Error(`Missing installed ${group} dependencies.`);
    fs.symlinkSync(installed, path.join(scratch, group, "node_modules"), "junction");
  }
  // The guard needs the actual Development identity; this private copy is temporary.
  fs.copyFileSync(path.join(root, "server/.env"), path.join(scratch, "server/.env"));
  const output = path.join(scratch, "artifacts/lab-04/verification");
  // Empty only the exported copies so a failed run cannot inherit old results
  // or screenshots and label them as fresh release-candidate evidence.
  for (const relative of ["artifacts/lab-04/verification", "artifacts/lab-04/screenshots"]) {
    const exported = path.resolve(scratch, relative);
    if (!exported.startsWith(path.resolve(scratch) + path.sep)) throw Error("Unsafe snapshot output path.");
    fs.rmSync(exported, { recursive: true, force: true });
  }
  for (const mode of ["prepare", "unit", "browser", "recovery"]) {
    const begin = Date.now();
    console.log(`Candidate ${revision.slice(0, 7)}: ${mode}`);
    const result = spawnSync(process.execPath, [path.join(scratch, "artifacts/lab-04/run-verification.mjs"), mode], {
      cwd: scratch, encoding: "utf8", timeout: 1200000, maxBuffer: 16 * 1024 * 1024,
    });
    const text = sanitize((result.stdout || "") + (result.stderr || "") + (result.error?.message || ""));
    console.log(text);
    fs.writeFileSync(path.join(destination, `${mode}-runner.txt`), text.replace(/[\t ]+$/gm, ""));
    phases.push({ mode, exitCode: result.status, durationMs: Date.now() - begin });
    if (mode === "prepare" && result.status !== 0) break;
  }
  const rawCommands = JSON.parse(fs.readFileSync(path.join(output, "commands.json"), "utf8"));
  fs.cpSync(output, path.join(destination, "verification"), { recursive: true });
  const screenshots = path.join(scratch, "artifacts/lab-04/screenshots");
  if (fs.existsSync(screenshots)) fs.cpSync(screenshots, path.join(destination, "screenshots"), { recursive: true });
  const provenance = { revision, scope: "Committed lab4-staging release candidate; not Final-main", startedAt, completedAt: new Date().toISOString() };
  // The historical runner/spec contain fixed feature-branch labels. Correct only
  // copied documentary metadata, never the tests/assertions or old evidence.
  fs.writeFileSync(path.join(destination, "verification/commands.json"), JSON.stringify({ ...provenance, phases, results: rawCommands.results }, null, 2) + "\n");
  const metricsPath = path.join(destination, "verification/dashboard-metrics.json");
  if (fs.existsSync(metricsPath)) {
    const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
    fs.writeFileSync(metricsPath, JSON.stringify({ ...provenance, results: metrics.results }, null, 2) + "\n");
  }
  // Exclude copied historical failures/unexecuted command logs from the new run.
  const currentLogs = new Set(rawCommands.results.map(result => `${result.id}.txt`));
  for (const filename of fs.readdirSync(path.join(destination, "verification"))) {
    if (filename.endsWith(".txt") && !currentLogs.has(filename)) fs.unlinkSync(path.join(destination, "verification", filename));
    if (filename === "working-tree-manifest.json") fs.unlinkSync(path.join(destination, "verification", filename));
  }
  const browserResults = {};
  const readReporter = filename => {
    const report = JSON.parse(fs.readFileSync(filename, "utf8"));
    return { passed: report.stats.expected, failed: report.stats.unexpected, flaky: report.stats.flaky, skipped: report.stats.skipped };
  };
  const reportPath = path.join(scratch, "test-results-lab4/results.json");
  if (fs.existsSync(reportPath)) browserResults.lastResponsiveRun = readReporter(reportPath);
  fs.writeFileSync(path.join(destination, "run.json"), JSON.stringify({ ...provenance, phases, browserResults, note: "Snapshot exported with git archive; installed dependencies reused through junctions. Application, schema, migrations and tests were not edited. Browser screenshots/logs are fresh outputs; old feature evidence remains unchanged." }, null, 2) + "\n");
} catch (error) {
  infrastructureError = sanitize(error.message);
  fs.writeFileSync(path.join(destination, "infrastructure-error.txt"), infrastructureError + "\n");
  console.error(infrastructureError);
} finally {
  // Remove credentials and temporary reports (may contain session traces).
  const privateEnv = path.join(scratch, "server/.env");
  if (fs.existsSync(privateEnv)) fs.unlinkSync(privateEnv);
  for (const group of ["server", "client", "e2e"]) {
    const junction = path.join(scratch, group, "node_modules");
    if (fs.existsSync(junction) && fs.lstatSync(junction).isSymbolicLink()) fs.rmdirSync(junction);
  }
  const resolvedScratch = path.resolve(scratch);
  if (path.dirname(resolvedScratch).toLowerCase() !== path.resolve(os.tmpdir()).toLowerCase() || !path.basename(resolvedScratch).startsWith("toktickit-lab4-rc-")) {
    throw Error("Refusing cleanup outside the exact temporary candidate directory.");
  }
  fs.rmSync(resolvedScratch, { recursive: true, force: true });
}
const preservation = [...historicalHashes].map(([relative, before]) => ({ path: relative, unchanged: hash(path.join(root, relative)) === before }));
if (preservation.some(entry => !entry.unchanged)) throw Error("Historical evidence changed.");
const evidenceFiles = [];
const secretMatches = [];
function scan(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const filename = path.join(folder, entry.name);
    if (entry.isDirectory()) scan(filename);
    else {
      evidenceFiles.push({ path: path.relative(destination, filename).replaceAll(path.sep, "/"), bytes: fs.statSync(filename).size, sha256: hash(filename) });
      if (/\.(json|txt)$/.test(entry.name)) {
        const body = fs.readFileSync(filename, "utf8");
        if (secrets.some(secret => body.includes(secret)) || /postgres(?:ql)?:\/\/[^\s"']+|toktickit_session=(?!\[REDACTED\])[^\s;"']+/i.test(body)) secretMatches.push(path.relative(destination, filename));
      }
    }
  }
}
scan(destination);
fs.writeFileSync(path.join(destination, "manifest.json"), JSON.stringify({ revision, preservedHistoricalFiles: preservation.length, historicalEvidenceUnchanged: true, secretMatches, files: evidenceFiles }, null, 2) + "\n");
console.log(`Historical evidence preserved: ${preservation.length} files; evidence text secret matches: ${secretMatches.length}`);
process.exit(infrastructureError || phases.some(phase => phase.exitCode !== 0) || secretMatches.length ? 1 : 0);
