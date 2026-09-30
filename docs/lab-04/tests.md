# TokTickIT Lab 4 Test DD and Traceability

สถานะ: Test Plan ก่อน implementation
ทุกแถวเริ่มต้นเป็น Planned จนกว่าจะมี test file จริง, assertion ครบ และผลรันจาก main จริง

## 1. Test Strategy

ต้องครอบคลุม Unit, API/Integration, UI Component, UI Style, Authorization, Workflow, Migration/Recovery, Performance-Smoke, Responsive และ E2E รวมทั้ง regression ของ Lab 1–3

## 2. Planned Test Matrix

| Test ID | Type | Requirement/AC | What it tests | Expected Result | Planned test file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | unit | AC-01/05/08 | Action validation, follow-up state and version increment | invalid input rejected; an Action may require follow-up; valid update increments Action.version and resolution gate detects outstanding follow-up | server/tests/lab-04/actions-taken.unit.test.ts | Planned |
| UNIT-02 | unit | AC-06/07 | Status transition and resolution gate pure rules | allowed transitions accepted; invalid/gate failures rejected | server/tests/lab-04/ticket-workflow.unit.test.ts | Planned |
| API-01 | API | AC-01/02/03/04 | Action list/create/update and zero/one/many | correct envelope, performer and stable ordering | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-02 | authorization | AC-02/03/15 | Requester/Staff/Admin Action access | role and ownership enforced by Backend | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-03 | API | AC-05/08 | Validation and stale update | 400/409 safe errors; no overwrite; CLOSED/CANCELLED Ticket or concurrent mutation returns `ACTION_STATE_CONFLICT`; RESOLVED follow-up edit remains allowed | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-04 | workflow | AC-06/07/08 | All Ticket status transitions and resolution gate | matrix and gate enforced; RESOLVED may retain an outstanding `followUpRequired=true`, but CLOSED blocks until the Action is updated to false; request `{ status, version }` uses `Ticket.version`; `REOPENED` requires non-empty `reopenReason`; stale version returns 409 with no write | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-05 | API | AC-09 | Requester Dashboard metrics and ownership | zero-data fixtures return zero/empty values; seeded non-zero fixtures return correct open, waiting, recently updated/resolved counts and lists for current Requester only | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| API-06 | API | AC-10 | Staff/Admin Dashboard metrics and drill-down | zero-data fixtures return empty metrics; seeded fixtures return correct formulas, timezone, response shape and drill-down for Staff/Admin | server/tests/lab-04/staff-dashboard.api.test.ts | Planned |
| API-07 | migration/regression | AC-11/15 | preserved IDs, FKs and legacy Ticket with zero Actions | old data remains valid and readable | server/tests/lab-04/migration-regression.api.test.ts | Planned |
| API-08 | migration/regression | AC-11/09/10 | repeated seed and dashboard fixtures | seed creates zero/one/many Action cases plus zero/non-zero dashboard fixtures; second seed creates no duplicates and loses no data | server/tests/lab-04/migration-regression.api.test.ts | Planned |
| MIG-01 | migration/recovery | AC-11 | migration precondition failure and recovery evidence | migration stops before writing when precondition fails; preserved rows remain unchanged; isolated backup/restore check can recover the verification database | server/tests/lab-04/migration-recovery.api.test.ts | Planned |
| PERF-01 | performance-smoke | AC-09/10 | Dashboard queries on seeded data | bounded response time and no unbounded Ticket collection | server/tests/lab-04/performance-smoke.api.test.ts | Planned |
| UI-01 | component | AC-01/04/05/16 | Actions list/create/edit and recoverable save | empty, populated, validation, saving guard, recoverable failure preserves input, reload-before-retry and success states correct | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| UI-02 | component | AC-03/08 | Requester read-only Action view | no create/edit/delete controls; safe failure shown | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| UI-03 | component | AC-09 | Requester Dashboard | metrics, empty state and drill-down correct | client/tests/lab-04/RequesterDashboard.test.tsx | Planned |
| UI-04 | component | AC-10 | Staff Dashboard | cards, queue links, loading, empty and failure correct | client/tests/lab-04/StaffDashboard.test.tsx | Planned |
| UI-05 | component | AC-06/07/08 | Workflow controls and conflict feedback | permitted controls, gate, concurrent mutation and stale reload correct | client/tests/lab-04/TicketWorkflow.test.tsx | Planned |
| STYLE-01 | UI style/accessibility | AC-13/14 | Zen Green, semantics, labels, focus and non-color cues | visual/accessibility assertions pass | client/tests/lab-04/AccessibilityStyle.test.tsx | Planned |
| AUTH-01 | authorization | AC-02/03/09/10 | role navigation and direct API/UI access | forbidden roles cannot bypass Backend | client/tests/lab-04/AuthorizationStates.test.tsx | Planned |
| API-09 | API/regression | AC-12/15 | Existing Lab 3 route and response-envelope compatibility | Lab 3 route names, `{ data: ... }` success shapes and safe errors remain unchanged | exact file set below | Planned |
| REG-01 | regression | AC-15 | Lab 1–3 auth, requester, queue, detail, admin and attachments | existing suites and API compatibility still pass | exact file set below | Planned |
| RESP-01 | responsive | AC-13/14 | Dashboard, Actions Taken and Detail at desktop/tablet/mobile | no clipping, overlap or page overflow | e2e/lab-04/actions-taken-flow.spec.ts; e2e/lab-04/ticket-resolution.spec.ts; e2e/lab-04/dashboards.spec.ts | Planned |
| E2E-01 | E2E | AC-01/02/03/04/05/16 | Action workflow for Requester, Staff and Admin | create/list/update/visibility works end to end; repeated click is guarded and recoverable failure preserves the form for reload/retry | e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| E2E-02 | E2E | AC-06/07/08 | Resolution workflow | RESOLVED can show outstanding follow-up; CLOSED blocks until cleared, concurrent Action/Status conflict has no partial write, and Requester indication works | e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | E2E | AC-09/10/13/14 | Requester and Staff/Admin dashboards | dashboard metrics, recently resolved, role visibility, drill-down and responsive states work | e2e/lab-04/dashboards.spec.ts | Planned |

### REG-01/API-09 exact existing Lab 1–3 test files

Server:

- `server/tests/lab-03/auth.api.test.ts`
- `server/tests/lab-03/auth.unit.test.ts`
- `server/tests/lab-03/authorization.api.test.ts`
- `server/tests/lab-03/comments-notes.api.test.ts`
- `server/tests/lab-03/migration-regression.api.test.ts`
- `server/tests/lab-03/staff-queue.api.test.ts`
- `server/tests/lab-03/staff-ticket-detail.api.test.ts`
- `server/tests/lab-03/users-admin.api.test.ts`

Client:

- `client/tests/lab-03/AccessibilityStyle.test.tsx`
- `client/tests/lab-03/AuthorizationStates.test.tsx`
- `client/tests/lab-03/ChangePassword.test.tsx`
- `client/tests/lab-03/Login.test.tsx`
- `client/tests/lab-03/RequesterRegression.test.tsx`
- `client/tests/lab-03/StaffTicketDetail.test.tsx`
- `client/tests/lab-03/StaffTicketQueue.test.tsx`
- `client/tests/lab-03/UserManagement.test.tsx`

E2E:

- `e2e/lab-03/authentication.spec.ts`
- `e2e/lab-03/staff-ticket-flow.spec.ts`
- `e2e/lab-03/user-administration.spec.ts`

## 3. Acceptance-Criterion Traceability

| AC | Criterion | Planned evidence |
|---|---|---|
| AC-01 | Staff creates Action with server-derived performer | API-01, E2E-01 |
| AC-02 | Admin can create/update but cannot impersonate performer | API-02, AUTH-01, E2E-01 |
| AC-03 | Requester reads own Actions only | API-02, UI-02, E2E-01 |
| AC-04 | zero/one/many and stable ordering | API-01, UI-01, E2E-01 |
| AC-05 | follow-up validation | UNIT-01, API-03, UI-01 |
| AC-06 | complete Status Matrix | UNIT-02, API-04, UI-05 |
| AC-07 | resolution gate and indication | API-04, UI-05, E2E-02 |
| AC-08 | stale update conflict for Action and Ticket workflow | API-03, API-04, UI-05, E2E-02 |
| AC-09 | Requester Dashboard including Recently Resolved | API-05, UI-03, E2E-03 |
| AC-10 | Staff/Admin Dashboard using one staff route | API-06, UI-04, E2E-03 |
| AC-11 | migration, repeated seed and recovery safety | API-07, API-08, MIG-01 |
| AC-12 | exact API and safe errors | API-01 through API-06 |
| AC-13 | UI states | UI-01, UI-03, UI-04, UI-05 |
| AC-14 | responsive/accessibility | STYLE-01, RESP-01 |
| AC-15 | Lab 1–3 regression | REG-01 |
| AC-16 | duplicate/recoverable Action submission | UI-01, E2E-01 |

## 4. FR/BR Traceability

| Requirement | Acceptance Criteria | Planned Test IDs |
|---|---|---|
| FR-01 | AC-01–AC-05 | UNIT-01, API-01, API-03, UI-01, UI-02, E2E-01 |
| FR-02 | AC-02, AC-03, AC-15 | API-02, AUTH-01, API-09, E2E-01 |
| FR-03 | AC-06, AC-07 | UNIT-02, API-04, UI-05, E2E-02 |
| FR-04 | AC-08 | API-03, API-04, UI-05, E2E-02 |
| FR-05 | AC-09, AC-10 | API-05, API-06, UI-03, UI-04, E2E-03 |
| FR-06 | AC-11 | API-07, API-08, MIG-01 |
| FR-07 | AC-13, AC-14, AC-16 | UI-01, UI-03, UI-04, UI-05, STYLE-01, RESP-01 |
| FR-08 | AC-15 | API-09, REG-01 |
| FR-09 | AC-16 | UI-01, E2E-01 |
| BR-01 | AC-01, AC-02 | API-01, API-02, E2E-01 |
| BR-02 | AC-01, AC-15 | API-02, API-09, REG-01 |
| BR-03 | AC-05, AC-07 | UNIT-01, API-04, E2E-02 |
| BR-04 | AC-06 | UNIT-02, API-04, E2E-02 |
| BR-05 | AC-08 | API-03, API-04, E2E-02 |
| BR-06 | AC-09, AC-10 | API-05, API-06, E2E-03 |
| BR-07 | AC-04, AC-08 | API-01, API-03, UI-01, UI-02 |
| BR-08 | AC-16 | UI-01, E2E-01 |

## 5. Planned Commands

Commands are plans only and have not been run in this audit:

- server: npm.cmd test
- client: npm.cmd test
- server: npm.cmd run build
- client: npm.cmd run build
- Prisma: npx.cmd prisma validate; npx.cmd prisma generate; npx.cmd prisma migrate deploy
- seed: npm.cmd run prisma:seed twice on isolated E2E database
- E2E: npm.cmd test from e2e with dedicated E2E_DATABASE_URL
- responsive: npm.cmd run test:responsive

## 6. Final Result

Final-main result: Planned
No Lab 4 test file or Lab 4 test output exists in the audited main commit. Do not mark any row Pass until the implementation, assertions and Final-main run exist.
