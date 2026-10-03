# TokTickIT Lab 4: แผนทดสอบและการเชื่อมโยงข้อกำหนด

สถานะ: แผนทดสอบพร้อมผลตรวจ Foundation และ Actions UI ระหว่างพัฒนา
คอลัมน์ Final ยังคงเป็น Planned จนกว่าจะตรวจ implementation, assertions และผลรันบน final main ครบ ผลตรวจระหว่างพัฒนาบันทึกแยกในข้อ 7–8

## 1. Test Strategy

ต้องครอบคลุม Unit, API/Integration, UI Component, UI Style, Authorization, Workflow, Migration/Recovery, Performance-Smoke, Responsive และ E2E รวมทั้ง regression ของ Lab 1–3

## 2. Planned Test Matrix

| Test ID | Type | Requirement/AC | What it tests | Expected Result | Planned test file | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | unit | AC-01/05/08 | Action field validation, follow-up note and version range | invalid/managed fields rejected; true requires a note and false requires null; version stays within PostgreSQL INTEGER range. Version increment is checked by API-03; Resolution Gate belongs to UNIT-02/API-04 | server/tests/lab-04/actions-taken.unit.test.ts | Planned |
| UNIT-02 | unit | AC-06/07 | Status transition and resolution gate pure rules | allowed transitions including `REOPENED → IN_PROGRESS` accepted; invalid/gate failures rejected | server/tests/lab-04/ticket-workflow.unit.test.ts | Planned |
| API-01 | API | AC-01/02/03/04/16 | Action list/create/update and zero/one/many | correct envelope, performer, `actionAt ASC, id ASC` stable pagination across multiple pages, and no delete/reorder; Lab 3 Comments/Internal Notes remain append-only | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-02 | authorization | AC-02/03/15 | Requester/Staff/Admin Action access and ownership | role and ownership enforced by Backend; Requester is read-only; Staff/Admin may edit another performer’s Action without changing `performedBy`; baseline authentication error names remain unchanged | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-03 | API | AC-05/08 | Validation and stale update | 400/409 safe errors; no overwrite; CLOSED/CANCELLED Ticket or concurrent mutation returns `ACTION_STATE_CONFLICT`; RESOLVED follow-up edit remains allowed | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-04 | workflow | AC-06/07/08 | All Ticket status transitions and resolution gate | matrix and gate enforced including `REOPENED → IN_PROGRESS`; RESOLVED may retain an outstanding `followUpRequired=true`, but CLOSED blocks until the Action is updated to false; request `{ status, version }` uses `Ticket.version`; `REOPENED` requires non-empty `reopenReason`; stale version returns 409 with no write; assignment remains Lab 3-compatible, inactive assignee returns `404 USER_NOT_FOUND`, and CANCELLED/RESOLVED/CLOSED behavior is demonstrated | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-05 | API | AC-09/12 | Requester Dashboard metrics and ownership | zero-data fixtures return zero/empty values and valid empty link arrays; seeded fixtures return correct counts and owned lists; My Tickets link uses `currentStatus`, `sortDirection` and `pageSize=10` without changing Lab 3 response; `limit=5` still yields a valid My Tickets link | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| API-06 | API | AC-10/12 | Staff/Admin Dashboard metrics and drill-down | zero-data fixtures return empty lists and all byStatus/byPriority keys with 0; seeded fixtures return correct 7-day formulas, limit/sort/tie-breaker, `recentlyResolvedTickets` and current user’s `recentActions`; Staff Queue link uses `status`, `sortOrder`, `pageSize=10` independent of `limit`, including `limit=5` | server/tests/lab-04/staff-dashboard.api.test.ts | Planned |
| API-07 | migration/regression | AC-11/15 | preserved IDs, FKs and legacy Ticket with zero Actions | old data remains valid and readable | server/tests/lab-04/migration-regression.api.test.ts | Planned |
| API-08 | migration/regression | AC-11/09/10 | repeated seed and dashboard fixtures | seed creates zero/one/many Action cases plus zero/non-zero dashboard fixtures; second seed creates no duplicates and loses no data | server/tests/lab-04/migration-regression.api.test.ts | Planned |
| MIG-01 | migration/recovery | AC-11 | migration precondition failure and separate recovery evidence | precondition test stops before writing and preserves rows; backup/restore is verified separately by the recovery script and recorded output, not by this API test alone | server/tests/lab-04/migration-recovery.api.test.ts; artifacts/lab-04/verify-recovery.ps1; artifacts/lab-04/migration-recovery.txt | Planned |
| PERF-01 | performance-smoke | AC-09/10 | Dashboard queries on seeded data | bounded response time and no unbounded Ticket collection | server/tests/lab-04/performance-smoke.api.test.ts | Planned |
| UI-01 | component | AC-01/04/05/16 | Actions list/create/edit and recoverable save | empty, populated, validation and saving guard; timeout preserves input and remains uncertain when an older Action has identical text, when a candidate appears after the original POST succeeds late, or when no candidate exists; paginate all pages and refresh metadata; no false success or automatic retry; GET failure keeps form and shows safe failure; user-initiated new submission warns about duplicate risk | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| UI-02 | component | AC-03/08 | Requester read-only Action view | no create/edit/delete controls; safe failure shown | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| UI-03 | component | AC-09/12 | Requester Dashboard | metrics, empty state, owned Detail links and My Tickets links use `currentStatus`/`sortDirection` with supported `pageSize=10`, including `limit=5`; opening a filtered link applies its status while ordinary My Tickets retains the Lab 3 All Statuses/NEW controls and default | client/tests/lab-04/RequesterDashboard.test.tsx | Planned |
| UI-04 | component | AC-10/12 | Staff Dashboard | cards, current-user recent Actions, recently resolved list and Queue/Detail links use `status`/`sortOrder` with `pageSize=10` even when `limit=5`; all zero-valued byStatus/byPriority keys, loading, empty and failure correct | client/tests/lab-04/StaffDashboard.test.tsx | Planned |
| UI-05 | component | AC-06/07/08 | Workflow controls and conflict feedback | permitted controls, gate, concurrent mutation and stale reload correct | client/tests/lab-04/TicketWorkflow.test.tsx | Planned |
| STYLE-01 | UI style/accessibility | AC-13/14 | Zen Green, semantics, labels, focus and non-color cues | visual/accessibility assertions pass | client/tests/lab-04/AccessibilityStyle.test.tsx | Planned |
| AUTH-01 | authorization UI | AC-02/03/09/10 | role navigation and forbidden UI states | controls/navigation respect roles; actual Backend enforcement is verified by API-02/API-05/API-06 and E2E, not by mocked component tests alone | client/tests/lab-04/AuthorizationStates.test.tsx | Planned |
| API-09 | API/regression | AC-09/10/12/15 | Existing Lab 3 route and response-envelope compatibility | Requester `GET /api/tickets` keeps `currentStatus`/`sortDirection` and its unwrapped list response; Staff Queue keeps `status`/`sortOrder` and `{ data: ... }`; both accept `pageSize=10` even when Dashboard `limit=5`; auth, assignment and safe errors remain unchanged; regression assertions are updated for additive `Ticket.version`, Resolution Gate and `REOPENED → IN_PROGRESS` | exact file set below | Planned |
| REG-01 | regression | AC-15 | Lab 1–3 auth, requester, queue, detail, admin and attachments | existing suites and API compatibility still pass | exact file set below | Planned |
| RESP-01 | responsive | AC-13/14 | Dashboard, Actions Taken and Detail at desktop/tablet/mobile | no clipping, overlap or page overflow | e2e/lab-04/actions-taken-flow.spec.ts; e2e/lab-04/ticket-resolution.spec.ts; e2e/lab-04/dashboards.spec.ts | Planned |
| E2E-01 | E2E | AC-01/02/03/04/05/16 | Action workflow for Requester, Staff and Admin | create/list/update/visibility works end to end; repeated click is guarded; timeout remains uncertain even if an old identical Action exists or the original POST succeeds late and appears on a later page; refresh/pagination shows candidates without false success or automatic second POST; GET failure preserves form; edit by another Staff/Admin preserves performer | e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| E2E-02 | E2E | AC-06/07/08 | Resolution workflow | RESOLVED can show outstanding follow-up; CLOSED blocks until cleared, concurrent Action/Status conflict has no partial write, `REOPENED → IN_PROGRESS` works with current version, CANCELLED is terminal, and Requester indication works | e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | E2E | AC-09/10/12/13/14 | Requester and Staff/Admin dashboards | dashboard metrics, 7-day recently resolved, current-user recent Actions and zero-valued byStatus/byPriority keys; Requester uses `currentStatus` and Staff uses `status`; `limit=5` still opens Queue with `pageSize=10`; role visibility, Detail links, sort and responsive states work | e2e/lab-04/dashboards.spec.ts | Planned |

### REG-01/API-09 exact existing Lab 1–3 test files

Server:

- `server/tests/lab-02/my-tickets.api.test.ts`
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

### แผนปรับ regression ใน Issues #71–#73

- `server/tests/lab-02/my-tickets.api.test.ts` จะยืนยันว่า `currentStatus` หลายค่า, `sortDirection` และ `pageSize=10` ยังใช้ได้ โดย response list ยังไม่ถูกห่อ `data`
- `client/tests/lab-03/RequesterRegression.test.tsx` จะยืนยันว่าหน้า My Tickets ปกติยังคง default/ตัวกรองเดิม และเมื่อเปิดจาก Dashboard link จะรับ `currentStatus` ที่ไม่ใช่ `NEW` ได้
- `server/tests/lab-03/staff-ticket-detail.api.test.ts` และ `server/tests/lab-03/staff-queue.api.test.ts` จะเพิ่ม assertion ว่า response อ่าน `Ticket.version` ได้ และใช้ค่าดังกล่าวเมื่อทดสอบ Status update/STALE_UPDATE
- `server/tests/lab-03/staff-ticket-detail.api.test.ts` จะเพิ่มกรณี Resolution Gate, `RESOLVED/CLOSED` ที่มี follow-up ค้าง และ `REOPENED → IN_PROGRESS` ตาม Contract Lab 4
- `server/tests/lab-03/staff-queue.api.test.ts` จะคง assignment/status/priority regression เดิม และยืนยัน inactive assignee เป็น `404 USER_NOT_FOUND`
- `e2e/lab-03/staff-ticket-flow.spec.ts` จะคง flow เดิม แล้วเพิ่มการตรวจ version/transition เฉพาะเมื่อ Lab 4 implementation เริ่มใน Issue ถัดไป
- การปรับข้างต้นเป็นแผน traceability เท่านั้น; ไฟล์ทดสอบเดิมยังไม่ถูกแก้ใน PR #68

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
| BR-07 | AC-04, AC-08, AC-15 | API-01, API-03, API-09, UI-01, UI-02 |
| BR-08 | AC-16 | UI-01, E2E-01 |

## 5. Planned Commands

รายการนี้เป็นคำสั่งสำหรับตรวจงานทั้ง Lab 4 ผลที่รันแล้วระหว่างพัฒนาแยกในข้อ 7–10 ส่วนคำสั่งของฟีเจอร์ที่ยังไม่พัฒนาและ Final-main ยังคง Planned:

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
ยังไม่มีผล Final-main ของ Lab 4 ในการตรวจรอบนี้ ผลตรวจบน feature branch ไม่ได้เปลี่ยนสถานะ Final ของ Test Matrix

## 7. ผลตรวจ Issue #70 บน Feature Branch

วันที่ตรวจ: 3 ตุลาคม 2026 (Asia/Bangkok)
Branch: `feature/03-lab4-actions-taken-ui` จาก baseline `af255b1` ที่รวม PR #75 แล้ว ผลด้านล่างเป็นการตรวจไฟล์ที่แก้ใน working tree ก่อน Commit

| คำสั่ง (รันจาก client/) | ผลที่รันจริง | ขอบเขต |
|---|---|---|
| `npm.cmd test -- --run tests/lab-04 --silent` | 2 files / 16 tests passed; exit 0 | UI-01/UI-02: 13 component tests และ 3 tests ของ client API helper |
| `npm.cmd test -- --silent` | 18 files / 87 tests passed; exit 0 | Client tests ทั้งชุด รวม regression ของ Lab 1–3 และ Actions Taken |
| `npm.cmd run build` | TypeScript และ Vite build สำเร็จ; exit 0 | Client production build |

ไฟล์ทดสอบของ UI-01/UI-02 คือ `client/tests/lab-04/ActionsTaken.test.tsx` และไฟล์เพิ่มเติม `client/tests/lab-04/ActionsTakenApi.test.tsx` ตรวจ route, credentials, request fields, Action version และ timeout 30 วินาทีของ Client

กรณีที่ตรวจแล้วครอบคลุมรายการ 0/1/หลาย Actions, ลำดับ actionAt/id, Staff create/edit, Administrator ใช้ Action UI ตามสิทธิ์เดิม, Requester read-only, follow-up validation, saving guard, field labels/keyboard, การคงข้อมูลเมื่อเกิด safe failure และ 409 conflict พร้อมให้ผู้ใช้ตรวจ version ล่าสุดก่อนส่งใหม่

กรณี POST ไม่ทราบผลคง draft และสถานะ submission-uncertain โหลดรายการครบทุกหน้า และยังไม่แจ้ง success แม้พบข้อความเหมือนรายการเก่าหรือรายการที่ปรากฏภายหลัง ไม่มีการ retry POST อัตโนมัติ การส่งใหม่ต้องตรวจรายการอีกครั้งและยืนยันคำเตือนเรื่องรายการซ้ำ หาก GET ล้มเหลวจะคงข้อมูลฟอร์มไว้

การตรวจ responsive รอบนี้ตรวจโครงสร้างและ classes ใน component test ยังไม่ได้ตรวจภาพบน browser ที่ขนาด desktop/tablet/mobile หรือรัน Full E2E; STYLE-01, RESP-01 และ E2E-01 ยังคง Planned สำหรับงาน hardening ไม่มีการอ้างผล Backend authorization ใหม่จาก component tests ที่ใช้ mock

## 8. ผลตรวจงาน Lab 4 ที่ทำแล้ว

ตรวจวันที่ 3 ตุลาคม 2026 (Asia/Bangkok) จาก branch `feature/03-lab4-actions-taken-ui`, HEAD `8886a13` ซึ่งรวม Contract PR #68 และ Foundation PR #75 แล้ว ผลนี้เป็นระหว่างพัฒนา ไม่ใช่ผลจาก final main

| คำสั่ง | ผลรันจริง | สิ่งที่ยืนยันได้ |
|---|---|---|
| `npm.cmd test -- --silent` ใน server/ | 23 files / 163 tests passed; exit 0; ไม่มี skip | ชุด Lab 1–3, Action API/authorization/concurrency, validation, migration preservation และ repeated seed บนฐาน local `toktickit_e2e` |
| `npm.cmd test -- --silent` ใน client/ | 18 files / 87 tests passed; exit 0; ไม่มี skip | ชุด Client Lab 1–3 และ Actions Taken UI/API helper |
| `npm.cmd run build` ใน server/ | ผ่าน; exit 0 | Server TypeScript build |
| `npx.cmd prisma validate` ใน server/ | ผ่าน; exit 0 | Prisma schema ถูกต้อง; ไม่ได้ apply migration กับ Development |

Recovery evidence เดิมของ Issue #69 อยู่ใน `artifacts/lab-04/migration-recovery.txt` คู่กับ `verify-recovery.ps1` ตรวจการ restore ฐานที่ migrate แล้ว ส่วน `migration-regression.api.test.ts` ตรวจการ upgrade จาก Lab 3 จริงบน scratch database แยก การตรวจรอบนี้ไม่ได้รัน backup/restore ซ้ำหรือใช้ผลเก่าเป็นผลรันใหม่

งานที่ยังไม่ควรนับว่าเสร็จ:

- Issue #71: ส่ง/อ่าน `Ticket.version`, Resolution Gate และ transition `REOPENED → IN_PROGRESS` ยังไม่ implement; tests Lab 3 จึงยังตรวจ Matrix เดิม
- Issues #71–#72: seed ปัจจุบันมี Ticket เดิม, zero/one/many Actions, empty Requester และตัวอย่าง RESOLVED แต่ยังไม่ใช่หลักฐานว่าครบทุก major status ต้องเพิ่ม fixtures ให้ครอบคลุมก่อนตรวจ Workflow/Dashboard โดยคงข้อมูลที่ผู้ใช้แก้แล้ว
- Repeated seed ตรวจ identity/counts และ Action metadata ที่กำหนด แต่ named fixtures เดิมยังถูก upsert บาง business fields ตาม seed ของ Lab 3 การรักษาข้อมูลก่อน–หลัง migration ที่ตรวจผ่านจึงไม่ใช่การรับรองว่ารัน seed ใน Development แล้วค่าที่แก้เองทุก field จะไม่เปลี่ยน
- Issue #72: Dashboard routes/UI, สูตรนับ, date boundary, links และ performance-smoke ยัง Planned; “Recently Resolved” ใน Contract ใช้ current status + `updatedAt` ไม่ใช่เวลาที่ resolve จริง และต้องอธิบายความหมายนี้บนหน้าจอ/รายงาน
- Issue #73: Full E2E, visual inspection และ responsive screenshots ยัง Planned รวมทั้งการสาธิตรายการใน rubric ที่ผูกกับ Ticket assignment/status ตาม Contract
- Issue #74: Final-main results, README ของ Lab 4 และรายงาน Answer Part 1–9 ยังต้องตรวจจาก main หลัง release

ชื่อและขอบเขต Issues #67, #69–#74 และ PR #68/#75/#76 สอดคล้องกับการแบ่งงานตัวอย่างใน Labsheet ข้อ 11 ไม่จำเป็นต้องเปลี่ยนเลข Issue, ชื่อ branch, model หรือ route เพื่อความสวยงาม

## 9. ผลตรวจการแก้ข้อเสนอแนะของ PR #76 / Issue #70

ตรวจวันที่ 3 ตุลาคม 2026 (Asia/Bangkok) บน branch `feature/03-lab4-actions-taken-ui` จาก HEAD `30dad19` พร้อมการแก้ใน working tree ก่อน Commit ไม่ใช่ผล Final-main

เพิ่มกรณีทดสอบใน `client/tests/lab-04/ActionsTaken.test.tsx` สำหรับ UI-01/UI-02 ดังนี้:

- เมื่อ GET เริ่มก่อน POST แล้วตอบกลับหลังสร้าง Action สำเร็จ รายการยังมี Action ที่ Backend ยืนยันแล้ว เรียงตาม `actionAt/id` และไม่เพิ่มรายการซ้ำ ไม่ว่า GET จะมี Action ใหม่นั้นหรือไม่
- เมื่อ Claim, Assign/Reassign หรือ Unassign สำเร็จ Ticket Owner ใน Actions Taken เปลี่ยนตาม Owner ปัจจุบันของ Ticket โดยไม่เปลี่ยน performer ไม่ล้างข้อมูลฟอร์มแก้ไข และไม่ส่ง PATCH Action โดยไม่จำเป็น

ก่อนแก้โค้ด ทดสอบใหม่ยืนยันปัญหาทั้งสองได้ โดยชุด component มี 2 failed / 14 passed จากนั้นแก้การรวมข้อมูลโหลดกับผลบันทึกที่ยืนยันแล้ว และส่ง Owner ปัจจุบันจาก Ticket Detail โดยไม่ remount ฟอร์ม

| คำสั่ง | ผลรันจริง | ขอบเขต |
|---|---|---|
| `npm.cmd test -- --run tests/lab-04 --silent` ใน client/ | 2 files / 19 tests passed; exit 0 | 16 component tests และ 3 client API helper tests |
| `npm.cmd test -- --run --silent` ใน client/ | 18 files / 90 tests passed; exit 0; ไม่มี skip | Client ทั้งชุด รวม regression ของ Lab 1–3 |
| `npm.cmd run build` ใน client/ | TypeScript และ Vite build ผ่าน; exit 0 | พบและแก้ตัวเลือก query ใน test ที่ TypeScript ไม่รองรับก่อน build ผ่าน |
| `git diff --check` จาก repository root | ผ่าน; exit 0 | ตรวจ whitespace ของการแก้รอบนี้ |

ผลนี้มาจาก component tests ที่ mock API และ client build ไม่ใช่หลักฐาน Full E2E หรือภาพ responsive บน browser; งานเหล่านั้นยัง Planned ใน Issue #73 ไม่มีการเปลี่ยน API, Model, Migration, Seed, Workflow หรือ Dashboard ในการแก้รอบนี้ และไม่ใช้ผลนี้ประกาศ Final-main Pass

## 10. ผลตรวจการรวม Action ตาม version ใน PR #76

ตรวจวันที่ 3 ตุลาคม 2026 (Asia/Bangkok) บน branch `feature/03-lab4-actions-taken-ui` จาก HEAD `fbf4279` พร้อมการแก้ใน working tree ก่อน Commit

เพิ่ม regression test ใน `client/tests/lab-04/ActionsTaken.test.tsx` สำหรับ UI-01: POST ยืนยัน Action version 1 แต่ GET ที่ตอบภายหลังคืน ID เดียวกันเป็น version 2 ต้องแสดงข้อมูล version 2 เพียงรายการเดียว เรียงตาม `actionAt/id` และใช้ version 2 เมื่อส่ง PATCH ครั้งถัดไป ก่อนแก้ test นี้ล้มเหลวจริง (คำสั่งเลือกเฉพาะกรณีนี้จึงข้ามอีก 16 กรณี)

`mergeActions` เลือก version สูงสุดของแต่ละ ID ทั้งข้อมูลที่โหลดและผลบันทึกที่ยืนยันแล้ว เมื่อ version เท่ากันให้ผลบันทึกที่ยืนยันแล้วแทนข้อมูลที่โหลดตามลำดับการรวมเดิม การป้องกัน Action ใหม่หายและรายการซ้ำยังผ่าน tests เดิม

| คำสั่ง | ผลรันจริง |
|---|---|
| `npm.cmd test -- --run tests/lab-04 --silent` ใน client/ | 2 files / 20 tests passed; exit 0; ไม่มี skip |
| `npm.cmd test -- --run --silent` ใน client/ | 18 files / 91 tests passed; exit 0; ไม่มี skip |
| `npm.cmd run build` ใน client/ | TypeScript และ Vite build ผ่าน; exit 0 |
| `git diff --check` จาก repository root | ผ่าน; exit 0 |

การแก้รอบนี้จำกัดที่การรวมรายการ UI และ regression test ไม่เปลี่ยน API หรือ scope ของ Issue #70 ผลเป็น component tests ที่ mock API ไม่ใช่ Full E2E และสถานะ Final-main ยังคง Planned
