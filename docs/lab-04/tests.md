# TokTickIT Lab 4: แผนทดสอบและการเชื่อมโยงข้อกำหนด

สถานะ: แผนทดสอบพร้อมผลตรวจ Foundation, Actions UI, Workflow, Dashboard และ hardening ระหว่างพัฒนา
คอลัมน์ Final ยังคงเป็น Planned จนกว่าจะตรวจ implementation, assertions และผลรันบน final main ครบ ผลตรวจระหว่างพัฒนาอยู่ในข้อ 7–16 และ Release candidate จาก staging อยู่ในข้อ 17 ผลเก่าแต่ละรอบยังคงตามที่บันทึก ไม่ใช้สถานะในประวัติแทนสถานะปัจจุบัน

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
| API-05 | API | AC-09/12 | Requester Dashboard metrics and ownership | zero-data fixtures return zero metrics/empty Ticket lists with valid drill-down links; seeded fixtures return correct counts and owned lists; My Tickets link uses `currentStatus`, `sortDirection` and `pageSize=10` without changing Lab 3 response; `limit=5` still yields a valid My Tickets link | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
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

- `server/tests/lab-01/health.test.ts`
- `server/tests/lab-01/categories.test.ts`
- `server/tests/lab-02/create-ticket.api.test.ts`
- `server/tests/lab-02/attachments.api.test.ts`
- `server/tests/lab-02/ticket-detail.api.test.ts`
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

รายการนี้เป็นคำสั่งสำหรับตรวจงานทั้ง Lab 4 ผลที่รันแล้วระหว่างพัฒนาแยกในข้อ 7–11 ส่วนคำสั่งของฟีเจอร์ที่ยังไม่พัฒนาและ Final-main ยังคง Planned:

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

## 11. ผลตรวจ Issue #71: Ticket Workflow และ Resolution Gate

ตรวจวันที่ 3 ตุลาคม 2026 (Asia/Bangkok) บน `feature/04-lab4-ticket-workflow` จาก `lab4-staging` commit `284c7cb` พร้อมไฟล์แก้ใน working tree ก่อน Stage/Commit ผลในข้อ 7–10 เป็นประวัติการตรวจรอบก่อน ไม่ใช่สถานะ Workflow ปัจจุบัน

### ขอบเขตที่พัฒนาและตรวจแล้ว

- UNIT-02: `server/tests/lab-04/ticket-workflow.unit.test.ts` ตรวจทุกคู่สถานะ 64 คู่, ชนิด/ช่วง Ticket.version, reopenReason และกฎ gate
- API-04: `server/tests/lab-04/ticket-workflow.api.test.ts` ตรวจ Matrix จริงผ่าน HTTP, roles, validation, version, gate, indication, response compatibility, inactive assignee และ concurrency
- UI-05: `client/tests/lab-04/TicketWorkflow.test.tsx` ตรวจตัวเลือกทุกสถานะ, Administrator read-only, reopenReason/labels, saving guard, safe failure, gate/conflict, การ refresh แล้วลองใหม่อย่างชัดเจน และการรักษาข้อมูลฟอร์ม
- คง route/envelope เดิม เพิ่ม `version` ใน Ticket Detail/รายการ Ticket และให้ status request ส่ง Ticket.version ตาม Contract Lab 4; ไม่ใช้ ActionTaken.version แทน ไม่เปลี่ยน assignment permission หรือ `404 USER_NOT_FOUND`
- Requester indication ยังคงไม่เปลี่ยน currentStatus หรือ Ticket.version และ Backend คง ownership protection
- ใช้ `Ticket.version` ที่มีอยู่จาก foundation ไม่สร้าง migration ซ้ำ เพิ่ม seed fixtures ใหม่ครบ 8 สถานะ โดยสร้างครั้งแรกเท่านั้นและตรวจว่ารันซ้ำยังรักษา ID, fields, owner, version และ Action ที่ผู้ใช้แก้ใน workflow fixtures เหล่านี้ ส่วนข้อจำกัดของ named seed fixtures เดิมจาก Lab 3 ยังเป็นไปตามข้อ 8

### กลไก concurrency และหลักฐาน

Action POST/PATCH และ Status PATCH ใช้ `lockTicketMutation` ร่วมกันภายใน transaction โดยล็อกแถว Ticket ด้วย `SELECT ... FOR UPDATE` ก่อนอ่าน status/version/Actions ใช้ isolation `READ COMMITTED` เพื่อให้คำขอที่รอ lock อ่านข้อมูลหลัง commit ของคำขอก่อนหน้า แล้วตรวจและเขียนภายใน transaction เดียวกัน จึงไม่มีช่องว่างระหว่างตรวจ gate กับเขียน Status หรือระหว่างตรวจ state กับเขียน Action ไม่เพิ่ม Ticket.version จากการแก้ Action

API tests ถือ lock จริงของคำขอแรกไว้ชั่วคราวและตรวจ `pg_stat_activity`/`pg_blocking_pids` ว่าคำขอที่สองรอ backend PID ของ transaction แรก ก่อนปล่อยให้ commit ครอบคลุม:

- Action create สำเร็จก่อน RESOLVED: gate เห็น Action ใหม่
- Action create/PATCH เพิ่ม follow-up ก่อน CLOSED: ปฏิเสธ gate โดยไม่เปลี่ยน Ticket status/version
- PATCH เคลียร์ follow-up ก่อน CLOSED: ปิดได้จากข้อมูลล่าสุด
- CLOSED/CANCELLED สำเร็จก่อน Action create: ตอบ `ACTION_STATE_CONFLICT` โดยไม่เพิ่ม Action
- CLOSED สำเร็จก่อน Action PATCH: ไม่เปลี่ยน Action fields/version
- Status สองคำขอใช้ Ticket.version เดียวกัน: สำเร็จหนึ่งคำขอ อีกคำขอได้ `STALE_UPDATE` พร้อม expectedVersion/actualVersion และเพิ่ม Ticket.version ครั้งเดียว

### ผลคำสั่งที่รันจริง

Server integration/seed/recovery-precondition tests ใช้ฐาน local `toktickit_e2e` เท่านั้น ไม่ reset หรือเขียนข้อมูลใน Development ไม่แสดง credential หรือ database URL

| คำสั่ง | ผลจริง |
|---|---|
| `npm.cmd test -- --run tests/lab-04/ticket-workflow.unit.test.ts tests/lab-04/ticket-workflow.api.test.ts tests/lab-04/actions-taken.api.test.ts tests/lab-03/staff-ticket-detail.api.test.ts --silent` ใน server/ | 4 files / 100 tests passed; exit 0; ไม่มี skip |
| `npm.cmd test -- --run tests/lab-04 tests/lab-03/StaffTicketDetail.test.tsx --silent` ใน client/ | 4 files / 45 tests passed; exit 0; ไม่มี skip |
| `npm.cmd test -- --run --silent` ใน server/ | 24 files passed / 1 file failed; 250 tests passed / 1 failed; exit 1; ไม่มี skip |
| `npm.cmd test -- --run --silent` ใน client/ | 19 files / 108 tests passed; exit 0; ไม่มี skip |
| `npm.cmd run build` ใน server/ และ client/ | ผ่านทั้งสองคำสั่ง; exit 0 |
| `npx.cmd prisma validate` และ `npx.cmd prisma generate` ใน server/ | ผ่านทั้งสองคำสั่ง; exit 0; ไม่ apply migration กับ Development |
| `git diff --check` จาก repository root และตรวจ whitespace ของไฟล์ใหม่แยก | ไม่พบ whitespace errors |

### ข้อจำกัดที่ยังเหลือ

Full Server ยังไม่ผ่านทั้งหมด: test `preserves exact Lab 3 rows and relationships across the real Lab 4 migration` ใน `server/tests/lab-04/migration-regression.api.test.ts` เรียก `psql.exe` ไม่สำเร็จ (`spawnSync ... UNKNOWN`) ตรวจเรียก `psql.exe --version` แยกแล้ว Windows ระบุว่า Application Control policy บล็อก executable นี้ จึงไม่ได้ยืนยัน migration-preservation รอบใหม่ ห้ามใช้ผลเดิมแทนผลรอบนี้ ไม่ข้าม test และไม่ได้เปลี่ยนนโยบายความปลอดภัยของเครื่อง ต้องให้เครื่องอนุญาต PostgreSQL client ตามนโยบายที่ถูกต้อง แล้วรัน Full Server ใหม่ก่อนอ้างว่าผ่านทั้งชุด ส่วน repeated seed และการรักษา edits ของ workflow fixtures ผ่านในรอบนี้

ปรับเฉพาะ direct status requests เดิมใน `e2e/lab-03/staff-ticket-flow.spec.ts` ให้อ่าน Ticket.version ก่อนส่ง เพื่อรักษา regression flow ไม่มีการรันหรือประกาศ Full E2E/visual/responsive ผ่านใน Issue นี้; E2E-02 และหลักฐานภาพยังอยู่ใน Issue #73 Dashboard ยังอยู่ใน Issue #72 และ Final-main ยังคง Planned ไม่มีการแก้ `reviewer.md`/`ai-use.md` หรือสร้าง Review/Prompt evidence ย้อนหลัง

## 12. เตรียม CI สำหรับตรวจ Issue #71 บน GitHub

วันที่ 4 ตุลาคม 2026 ผู้จัดทำเลือกคง Smart App Control ไว้และอนุญาตให้เพิ่ม `.github/workflows/lab4-tests.yml` เพื่อรันการตรวจบน GitHub-hosted Linux แทนการลดการป้องกันของเครื่อง Local ไม่แก้หรือข้าม migration-regression test เดิม

- Workflow รันเมื่อ Push เข้า `feature/04-lab4-ticket-workflow`/`lab4-staging` หรือเมื่อเปิด/อัปเดต PR เข้า `lab4-staging`/`main`
- Server job ใช้ PostgreSQL 17 service ชั่วคราวและฐาน `toktickit_e2e` บน runner เท่านั้น ติดตั้ง `psql`, `createdb`, `dropdb` สำหรับ scratch database ที่ test สร้างเอง ไม่ใช้ Development credentials หรือฐานในเครื่องผู้จัดทำ
- รัน `npm ci`, Prisma validate/generate/migrate deploy, seed สองรอบ, Full Server tests, Server build และตรวจ whitespace ของ commit ที่ทดสอบ
- CI ให้ test/hook timeout 60 วินาทีสำหรับงาน migration บน runner ใหม่ โดยไม่กรองหรือ skip test; Client job รัน `npm ci`, Full Client tests และ build แยกจาก Server
- ไม่รัน Full E2E/visual/responsive ของ Issue #73 และไม่อ้างว่า precondition test เท่ากับ backup/restore verification

สถานะขณะจัดเตรียม CI: **Pending** ข้อ 12 เป็นบันทึกก่อน Commit/Push ผล GitHub Actions ที่เกิดขึ้นภายหลังอยู่ในข้อ 13 โดยไม่แทนผล Local ในข้อ 11 หรือผล Dashboard รอบใหม่

## 13. Historical CI: PR #77

ตรวจ Run และ log จาก GitHub วันที่ 4 ตุลาคม 2026: [Lab 4 tests — run 37141299140](https://github.com/guluJa/toktickit/actions/runs/37141299140) เป็น `pull_request` run ของ revision `de4dcb6c6be6f33aaa1339b976dee44bb5c69a98` ใน PR #77 (runner checkout merge ref `6dd9dcb28c415eea0724bb8736f234a1811803e1`) ทั้งสอง jobs มี conclusion `success`

| Job | ผลจาก log |
|---|---|
| Server tests and migration regression | 25 files / 251 tests passed; รวม real migration-preservation test, Prisma validate/generate, migrate deploy, seed สองรอบ และ Server build |
| Client tests and build | 19 files / 108 tests passed; Client build ผ่าน |

ผลนี้ยืนยัน revision ของ PR #77 บน GitHub-hosted Linux ไม่ใช่ผลของ Issue #72 หรือ Final-main และไม่ใช้แทนผล migration test ที่ Local Windows ยังเรียก `psql.exe` ไม่ได้

## 14. Issue #72: Requester และ Staff Dashboards

ตรวจวันที่ 4 ตุลาคม 2026 (Asia/Bangkok) บน `feature/05-lab4-role-dashboards` จาก HEAD `bb6049b` ซึ่งรวม PR #77 พร้อมการแก้ใน working tree ก่อน Stage/Commit

### ขอบเขตและ Acceptance Criteria

- AC-09 / API-05 / UI-03: Requester metrics และ recent/recently resolved lists กรองด้วย session requesterId; Backend ปฏิเสธ role อื่นและ identity header; My Tickets links คง `currentStatus`, `sortDirection` และ response เดิม
- AC-10 / API-06 / UI-04: IT Staff และ Administrator ใช้ `/api/staff/dashboard`; counts/groupBy ครอบคลุมข้อมูลจริงทั้งหมด; recent Actions เป็นของ session user; byStatus/byPriority คืนครบทุก key รวมค่า 0
- AC-12/13: `{ data: ... }`, `limit` ค่าเริ่มต้น 20/ช่วง 1–100, links, loading/zero/empty/forbidden/safe failure/retry และ keyboard/semantic/responsive classes ตรง Contract ผลตอบกลับเก่าไม่ทับข้อมูลหลังเปลี่ยนผู้ใช้
- AC-15 / API-09: ทดสอบ Lab 2 My Tickets และ Lab 3 Queue พร้อม request/response เดิม เพิ่ม Requester regression สำหรับ query จาก Dashboard โดยคงค่าเริ่มต้น All Statuses/NEW; Actions และ Workflow เดิมผ่านใน Full suites ยกเว้นข้อจำกัด migration test ด้านล่าง
- วันที่จัดเก็บเป็น UTC, แสดง Asia/Bangkok; ช่วง 7 วันเป็น `[asOf - 7 × 24 hours, asOf)` ตรวจ lower/upper boundary และ tie-breaker `updatedAt DESC, id DESC`/`actionAt DESC, id DESC` รวม limit=1/5/100 และ counts ที่มากกว่า list limit
- PERF-01: HTTP smoke บนฐานทดสอบที่มี seed และ fixtures; แต่ละ route ตอบภายใน 2 วินาที, response ต่ำกว่า 100 KB และ embedded lists ไม่เกิน limit การตรวจนี้ไม่ใช่ production load test หรือ SLA

### ผลคำสั่งจริง

Server tests ใช้ `toktickit_e2e` ที่แยกจาก Development; fixtures ใช้บัญชี/ID เฉพาะและ cleanup หลังทดสอบ กรณี zero-data Staff ใช้ transaction snapshot ที่ rollback การลบทั้งหมด ไม่มี reset หรือเขียนข้อมูล Development/Production และไม่ได้แก้ schema, migration หรือ seed

| คำสั่ง | ผลจริง |
|---|---|
| Server: `npm.cmd test -- tests/lab-04/requester-dashboard.api.test.ts tests/lab-04/staff-dashboard.api.test.ts tests/lab-04/performance-smoke.api.test.ts tests/lab-02/my-tickets.api.test.ts tests/lab-03/staff-queue.api.test.ts` | 5 files / 42 tests passed; exit 0; ไม่มี skip |
| Client: `npm.cmd test -- tests/lab-04/RequesterDashboard.test.tsx tests/lab-04/StaffDashboard.test.tsx tests/lab-03/RequesterRegression.test.tsx` | 3 files / 20 tests passed; exit 0; ไม่มี skip |
| Server: `npm.cmd test -- --silent` | 27 files passed / 1 failed; 271 tests passed / 1 failed; exit 1; ไม่มี skip |
| Client: `npm.cmd test -- --silent` | 21 files / 126 tests passed; exit 0; ไม่มี skip |
| Server/Client: `npm.cmd run build` | ผ่านทั้งสองคำสั่ง; exit 0 |
| Server: `npx.cmd --no-install prisma validate` / `prisma generate` | ผ่านทั้งสองคำสั่ง; exit 0 |
| Repository: `git diff --check` และตรวจไฟล์ใหม่แยกโดยไม่ Stage | ไม่พบ whitespace errors; LF/CRLF warnings ไม่ใช่ test failure |

Dashboard API tests ใช้ PostgreSQL จริง; UI tests mock HTTP responses และตรวจ navigation/query ที่ App ส่ง จึงไม่ใช่หลักฐาน Full E2E/ภาพ responsive ผลเป็น feature-branch verification ไม่ใช่ Final-main

### ข้อจำกัดและงานที่ยัง Planned

Full Server ล้มเหลวเฉพาะ `preserves exact Lab 3 rows and relationships across the real Lab 4 migration` ใน `server/tests/lab-04/migration-regression.api.test.ts`: `spawnSync ... psql.exe UNKNOWN` ตามข้อจำกัด Application Control เดิม ไม่เปลี่ยนหรือ skip test และไม่ปิด Smart App Control ผล PR #77 ในข้อ 13 เป็นประวัติคนละ revision; CI ของ Issue #72 ยัง Pending จนกว่าจะเปิด/อัปเดต PR เข้า `lab4-staging` และตรวจผลจริงจาก workflow เดิม

E2E-03, STYLE-01/AUTH-01 แบบรวมฟีเจอร์, browser responsive/visual evidence อยู่ใน Issue #73; release/Final-main อยู่ใน Issue #74 คอลัมน์ Final ใน Test Matrix และ AC ยัง Planned ไม่มีการสร้าง Review/Approval หรือ Merge evidence ในรอบนี้

## 15. Historical CI: PR #78

ตรวจ Run/log จริงจาก GitHub: [run 37206924423](https://github.com/guluJa/toktickit/actions/runs/37206924423) ของ PR #78 revision `bf04947d5ff3e372c546c5cdef511d2e7a28b7ea` ทั้งสอง jobs สำเร็จ: Server 28 files / 272 tests และ Client 21 files / 126 tests พร้อม builds ผ่าน PR #78 merge เข้า `lab4-staging` เป็น `51bcf9c86d89e2a1df0df86b9021d12d341f5bab`

นี่คือ historical feature CI ไม่ใช่ผล hardening รอบนี้หรือ Final-main ข้อจำกัด Local ของรอบ #71/#72 ยังคงบันทึกตามเดิม ไม่เปลี่ยนผลเก่าย้อนหลัง

## 16. Issue #73: Hardening และ integrated verification

ตรวจวันที่ 4–5 ตุลาคม 2026 (Asia/Bangkok) บน `feature/06-lab4-final-hardening` จาก `lab4-staging` HEAD `51bcf9c` พร้อม working-tree changes ก่อน Stage/Commit ไม่ใช่ผล staging หลัง merge หรือ Final-main

### Read-only audit ก่อนแก้

- Branch/HEAD ถูกต้อง, working tree เริ่มต้นสะอาด และมี merge ของ PR #78; ตรวจ Issue #73, Labsheet และเอกสาร Lab 4 ทั้งหกไฟล์เทียบกับ implementation/tests จริง
- AC-01–12 มี Model/API/UI/workflow/authorization และ integration tests แล้ว ไม่จำเป็นต้องเพิ่ม policy, model, migration หรือ API ใหม่
- AC-13–16 ยังขาด browser integration ของ Lab 4, `AUTH-01`/`STYLE-01`, ภาพและ visual checklist ที่ตรวจจริง, selected metric evidence เทียบ PostgreSQL/API/UI และ README Lab 4
- พบช่อง Owner ID ไม่มี visible label และ guard เดิมเทียบ database URL ทั้งเส้นซึ่งแยก credentials/query ไม่ใช่ฐานข้อมูลจริง จึงแก้เฉพาะ label กับ guard ไม่เปลี่ยนสิทธิ์หรือกติกาฟีเจอร์
- Rubric assign/complete/cancel/append-only ใช้การจับคู่ตาม specification ข้อ 12 ไม่เพิ่ม Action lifecycle, deletion หรือ history model และไม่อ้างว่าได้รับคำยืนยันจาก TA

### หลักฐานตาม Acceptance Criteria

| AC | หลักฐานในรอบ hardening |
|---|---|
| AC-01/02/03 | API-01/02, AUTH-01 และ E2E-01: performer จาก session, Admin edit คง performer, Requester owned read-only และ direct API denial |
| AC-04/05 | UNIT-01/API-01/03/UI-01; E2E-01 มี zero/one/many, 102 Actions/สองหน้า, follow-up validation และลำดับเดิม |
| AC-06/07 | UNIT-02/API-04/UI-05 และ E2E-02; API ตรวจครบ 64 transition pairs, gate, indication; browser สาธิต RESOLVED พร้อม follow-up, CLOSED หลังเคลียร์, reopen reason, REOPENED → IN_PROGRESS และ CANCELLED terminal |
| AC-08 | API-03/04 ทดสอบ atomic Action/Status ทั้งสองลำดับด้วย database lock จริง; E2E-02 ทดสอบ Action PATCH version เดียวกันสำเร็จหนึ่งคำขอและ stale Ticket UI คงฟอร์ม |
| AC-09/10 | API-05/06/UI-03/04 และ E2E-03; `dashboard-metrics.json` บันทึก asOf, selected counts และ IDs ที่เทียบ PostgreSQL/API/UI; รวม current-user Actions และ recently resolved lists |
| AC-11 | API-07/08/MIG-01 ผ่าน: snapshot ก่อน/หลัง migration, ID/FK/data เดิม, version=1 และ seed ซ้ำ; backup/restore รอบใหม่เปรียบเทียบ complete row snapshots ตรงกันบน scratch database แล้ว cleanup สำเร็จ |
| AC-12/13 | Full API/UI suites และ E2E-01–03 ตรวจ error envelope, safe failure, loading/empty/forbidden/validation/conflict/retry; ไม่แสดง private error details |
| AC-14 | STYLE-01/RESP-01, browser keyboard/focus/labels/error association/overflow/overlap และภาพ desktop/tablet/mobile; ผลตรวจภาพอยู่ใน ui-spec ข้อ 7–8 |
| AC-15 | Full Server/Client ครอบคลุม Labs 1–3; authenticated Lab 3 E2E ครบทั้ง 6 กรณี มี attachments, comments, notes, assignment และ user management |
| AC-16 | UI-01/E2E-01: double-click มี POST หนึ่งครั้ง; timeout/lost response คงฟอร์ม, identical old Action ไม่ใช่หลักฐาน success, อ่านครบทุกหน้า, original POST บันทึกภายหลัง, failed reconciliation และ explicit duplicate-risk confirmation |

### คำสั่งและผลรอบล่าสุด

ใช้ `artifacts/lab-04/run-verification.mjs` กำหนดฐาน `toktickit_e2e` ภายใน process, ไม่แก้ `.env`, ไม่ reset และไม่แตะฐาน Development/Production คำสั่ง/เวลา/exit code/stdout/stderr ที่กรองข้อมูลลับอยู่ใน `artifacts/lab-04/verification/commands.json` และไฟล์ `.txt` ตามชื่อคำสั่ง

| ชุดตรวจ | ผลจริง | Log |
|---|---|---|
| Prisma validate/generate, migrate status/deploy | exit 0; migrations เดิมครบ ไม่สร้างหรือแก้ migration | `prisma-validate.txt`, `prisma-generate.txt`, `migration-status.txt`, `migration-deploy.txt` |
| Seed สองรอบ | exit 0 ทั้งคู่; repeated-seed assertions ผ่านใน Server tests | `seed-first.txt`, `seed-second.txt` |
| Focused Server Lab 4 | 9 files / 123 tests passed | `server-focused.txt` |
| Full Server Labs 1–4 | 28 files / 272 tests passed รวม real migration-preservation และ PERF-01 | `server-full.txt` |
| PERF-01 แบบมีผลวัด | Requester 30 ms / 4,353 UTF-8 bytes; Staff 24 ms / 9,171 bytes, limit=5; ผ่าน <2 วินาที/<100 KB เป็นผล smoke รอบนี้ ไม่ใช่ SLA | `performance-smoke.txt` |
| Focused Client Lab 4 | 7 files / 59 tests passed | `client-focused.txt` |
| Full Client Labs 1–4 | 23 files / 131 tests passed | `client-full.txt` |
| Server/Client builds | exit 0 ทั้งสองคำสั่ง | `server-build.txt`, `client-build.txt` |
| Focused Lab 4 E2E | 9 tests passed; exit 0 | `e2e-focused.txt` |
| Full E2E และ responsive | 15 tests passed ต่อคำสั่ง; exit 0 ทั้งคู่; 6 authenticated Lab 3 regressions + 9 Lab 4/safety cases | `e2e-full.txt`, `responsive.txt` |
| Backup/restore รอบใหม่ | exit 0 ด้วย PowerShell 7 ที่มี RemoteSigned อยู่แล้ว; `ROW_SNAPSHOT_MATCH=true`, scratch/drop และ temp-dump cleanup สำเร็จ ไม่เปลี่ยน policy | `recovery-restore.txt` |

ไม่มี `skip` ใน suites ที่รัน รายการ `e2e/lab-02/` ถูก exclude ตาม config เดิมเพราะใช้ Development Requester selector ที่เลิกใช้งานแล้ว ไม่ได้นับเป็น Pass หรือเป็น authenticated browser coverage; พฤติกรรม Lab 2 ตรวจด้วย full API/component suites และ Lab 3 authenticated E2E

### ขอบเขตการพิสูจน์

- E2E ใช้ Chromium, desktop 1440×1000, tablet 820×1180 และ mobile 375×812 ไม่ใช่การรับรองทุก browser/device หรือ WCAG certification; ไม่ทำซ้ำทุก business case บนทุก viewport เพราะแยก flow assertions กับ responsive captures
- Dashboard selected counts ใช้ query PostgreSQL ณ `asOf` ของ API และตรวจค่าที่ UI แสดง ขอบเขต `[asOf - 7 × 24h, asOf)`, timezone, tie-breaker และ limit=1/5/100 ตรวจใน API-05/06; browser ตรวจ recent/current-user lists, valid Queue `pageSize=10` กับ Dashboard `limit=5` และ Detail destinations
- ภาพ Staff `empty-fixture-*` ใช้ controlled empty HTTP response เพื่อพิสูจน์ UI เท่านั้น ไม่อ้างว่า PostgreSQL ทั้งฐานว่าง; zero-data Backend ทดสอบด้วย transactional snapshot ที่ rollback ใน API-06 ส่วน Requester empty ใช้บัญชีที่ไม่มี Ticket จริง
- กรณี late commit ถือ lock บน Ticket fixture ชั่วคราว ยืนยันคำขอเดิมรอด้วย `pg_blocking_pids` ก่อน browser ขาด response แล้วปล่อยให้คำขอเดิมบันทึกสำเร็จ ไม่ส่ง POST ใหม่แทน; กรณี timeout ใช้ browser clock เร่ง timer 30 วินาทีหลัง real server commit โดยหน่วง response ผลทั้งสองกรณียังคง submission-uncertain ไม่รับรอง Backend deduplication
- Browser logs อยู่ใน `verification/browser/`: ไม่มี uncaught `pageerror`; 401 ของ unauthenticated `/api/auth/me` และ 403/409/503/network failures ที่จงใจสร้างเป็น expected checks ไม่อ้างว่า console ไม่มี HTTP errors เลย Normal Dashboard flow ตรวจว่าไม่มี unexpected API failure
- PERF-01 เป็น HTTP smoke บน seed/fixtures: response แต่ละ route <2 วินาที, <100 KB และ lists ไม่เกิน limit ไม่ใช่ production benchmark หรือ SLA
- Recovery ใช้ procedure `verify-recovery.ps1` เดิมโดยไม่แก้ script หรือ migration: backup ฐานทดสอบ → restore ไปยัง scratch ใหม่ → เปรียบเทียบ complete row snapshots → drop เฉพาะ scratch และลบ temporary dump รอบแรก Windows PowerShell 5 ปฏิเสธ script ด้วย Restricted (`recovery-restore-powershell5.txt`); ตรวจแล้ว PowerShell 7 ที่มีอยู่ใช้ RemoteSigned จึงรันได้ด้วย policy เดิมและได้ exit 0 (`recovery-restore.txt`) ไม่ลดการป้องกันหรือใช้ policy bypass หลักฐาน Foundation เดิมยังเก็บแยกใน `artifacts/lab-04/migration-recovery.txt`

### สถานะก่อน Peer Review

Test/evidence เป็นของ feature working tree นี้เท่านั้น Peer Review และ merge เข้า `lab4-staging` ยัง Pending ต้องตรวจผลอีกครั้งบน staging หลัง merge ก่อน Release งาน Issue #74 และคอลัมน์ Final/Product DoD ยังคง Planned ไม่ Stage/Commit/Push หรือสร้าง PR ในรอบนี้

## 17. Issue #74: Pre-release audit และ Release candidate

ตรวจวันที่ 5 ตุลาคม 2026 เวลา 17:41–17:44 น. (Asia/Bangkok) จาก `lab4-staging` commit `3b7291e47b6c53eb21202f2402cd480f72f883e6` ซึ่งรวม PR #79 แล้ว Working tree สะอาดก่อนสร้าง `codex/lab4-pre-release-audit` เพื่อแก้เอกสารเตรียม Release เท่านั้น ไม่มีการ Stage, Commit, Push, เปิด PR หรือ Merge ในรอบนี้

### แหล่งอ้างอิงและผล audit

- อ่าน SE Lab 4 Labsheet ครบ, Issue #74, เอกสาร Lab 4 ทั้งหกไฟล์, baseline API ของ Lab 3, schema/migrations/seed, tests และหลักฐานเดิม โดยไม่ถือสรุปจากแชทเป็นผลตรวจ
- PR #68 และ #75–#79 มี Approval ของ PhraewaS บน revision ที่ merge เข้า `lab4-staging` จริง; merge commits อยู่ใน ancestry ของ candidate และ Contract PR #68 เกิดก่อน implementation PRs รายละเอียดใน `reviewer.md`
- PR #79: [review comment](https://github.com/guluJa/toktickit/pull/79#pullrequestreview-5410260883), [คำตอบ](https://github.com/guluJa/toktickit/pull/79#issuecomment-5990353143), [Approval](https://github.com/guluJa/toktickit/pull/79#pullrequestreview-5412952624), head `af6fe86`, merge `3b7291e` วันที่ 5 ตุลาคม 2026
- [CI หลัง merge — run 37295186571](https://github.com/guluJa/toktickit/actions/runs/37295186571) ทดสอบ `3b7291e` จริง ทั้งสอง jobs สำเร็จ; log ยืนยัน Server 28 files / 272 tests และ Client 23 files / 131 tests รวม builds, Prisma/migrations/seed และ `npm ci` จาก lockfiles CI นี้ไม่มี E2E/responsive จึงใช้ผล Local candidate ด้านล่างสำหรับสองส่วนดังกล่าว
- พบข้อความสถานะก่อนเปิด PR #79 ค้างอยู่ใน reviewer/specification/API/UI spec จึงปรับเฉพาะสถานะและลิงก์หลักฐาน ไม่เปลี่ยน requirement, route, role, error code หรือ FR/BR/AC และไม่เปลี่ยนผลเก่าในข้อ 7–16
- Minimum structure ตาม Labsheet ข้อ 12 มีครบทั้ง 20 paths ที่ระบุใน manifest เดิม; test-file paths/FR–BR–AC–Test traceability ตรวจซ้ำกับไฟล์จริง ผลก่อนปล่อยและข้อจำกัดอยู่ใน `release-candidate/3b7291e/audit.json`
- ไม่พบ `.env`, `node_modules`, private uploads หรือ generated Playwright reports/traces ถูก track; migration ใหม่มีเพียง additive foundation ของ PR #75 ไม่มีการแก้ migration ที่ merge แล้ว ค่า credential/URL ใน disposable CI เป็นค่าทดสอบที่ระบุไว้ชัดเจน ไม่ใช่ credential ของเครื่องผู้จัดทำ

### วิธีรันโดยรักษาหลักฐานเดิม

รัน `node artifacts/lab-04/run-release-candidate.mjs 3b7291e` จาก repository root: export commit ด้วย `git archive` ไปยัง snapshot ชั่วคราว ใช้ dependencies ที่ติดตั้งไว้ผ่าน junctions และเรียกคำสั่งของ runner เดิมบน `toktickit_e2e` เท่านั้น ไม่มีการเปลี่ยน application/schema/migration/seed/tests ใน snapshot และไม่รันคำสั่งบน Development/Production หลังรันลบ private `.env`, junctions และ snapshot/report ชั่วคราว รวมทั้ง scratch recovery database และ dump ที่ procedure เดิมจัดการ

ผลใหม่อยู่ใน `artifacts/lab-04/release-candidate/3b7291e/` ทั้ง logs, Dashboard queries, browser records และภาพ 57 ไฟล์ ส่วน `artifacts/lab-04/verification/`, `screenshots/`, recovery เดิมและ Lab 3 evidence ยังคงเดิม ตรวจ SHA-256 แล้ว 107 historical files ไม่เปลี่ยน (`manifest.json`) การแก้ label ใน `commands.json` และ `dashboard-metrics.json` ทำเฉพาะสำเนา evidence ใหม่เพื่อระบุ staging revision ให้ถูกต้อง เพราะ runner/spec เดิมมี label feature branch คงที่ ไม่แก้ assertions หรือผลวัด

### ผลคำสั่งจาก candidate commit จริง

ทุกคำสั่งด้านล่างได้ exit 0; เวลาและ stdout/stderr ที่กรองข้อมูลลับอยู่ใน `verification/commands.json` และ logs ใต้โฟลเดอร์ candidate

| ชุดตรวจ | ผลรันจริง | Log ใต้ candidate/verification/ |
|---|---|---|
| Prisma validate/generate, migrate status/deploy | ผ่าน; migration ทั้ง 6 รายการครบ ไม่มี pending migration | `prisma-validate.txt`, `prisma-generate.txt`, `migration-status.txt`, `migration-deploy.txt` |
| Seed สองรอบ | ผ่านทั้งคู่; preservation/idempotence assertions ผ่านใน Full Server | `seed-first.txt`, `seed-second.txt` |
| Focused Server Lab 4 | 9 files / 123 tests passed | `server-focused.txt` |
| Full Server Labs 1–4 | 28 files / 272 tests passed | `server-full.txt` |
| Focused Client Lab 4 | 7 files / 59 tests passed | `client-focused.txt` |
| Full Client Labs 1–4 | 23 files / 131 tests passed | `client-full.txt` |
| Server/Client builds | ผ่านทั้งสองคำสั่ง | `server-build.txt`, `client-build.txt` |
| Full E2E | 15 tests passed | `e2e-full.txt` |
| Responsive run | 15 passed, 0 failed/flaky/skipped; desktop/tablet/mobile captures | `responsive.txt`, `run.json` |
| PERF-01 | Requester 21 ms / 4,353 UTF-8 bytes; Staff 16 ms / 9,171 bytes, limit=5; ผ่าน <2 วินาที/<100 KB | `performance-smoke.txt` |
| Backup/restore | complete row snapshots ตรงกัน, scratch/drop และ dump cleanup สำเร็จ | `recovery-restore.txt` |

Recovery source/restored counts ตรงกัน: Users 11, Tickets 14, Actions 9, Comments 3, Internal Notes 3, Attachments 0; ไม่อ้างว่ารอบ restore นี้มี Attachment ที่ไม่เป็นศูนย์ การรักษา Attachment เดิมหนึ่งรายการพร้อม ID/FK/data ตรวจใน real Lab 3 → Lab 4 migration test บน scratch database แยก ซึ่งผ่านใน Full Server

ไม่มี skip ในชุดที่รัน; retired `e2e/lab-02/` ถูก exclude ตาม config เดิมและไม่นับเป็น Pass Regression ของ Lab 2 พิสูจน์ด้วย full API/component tests และ authenticated Lab 3 E2E ใช้ Chromium เท่านั้น ไม่ใช่ทุก browser/device หรือ WCAG certification และ performance-smoke ไม่ใช่ SLA/load benchmark

### AC และขอบเขตหลักฐาน

AC-01–AC-16 ใช้ traceability ในข้อ 3–4 และ mapping ข้อ 16 เดิม โดย rerun automated suites จาก staging commit นี้ครบ: UNIT/API/MIG/PERF/UI/STYLE/AUTH/REG และ E2E-01–03/RESP-01; ไม่เพิ่ม AC หรือเปลี่ยน Final เป็น Pass Selected Dashboard metrics ใน `verification/dashboard-metrics.json` เทียบ PostgreSQL ณ `asOf` กับ API/UI จริง; empty Staff captures เป็น controlled HTTP fixture ส่วน Requester empty ใช้บัญชีไม่มี Ticket และ zero-data Backend ตรวจใน API suites

Browser records ไม่มี uncaught pageerror; auth/me 401 ของ guest และ deliberate 403/409/503/network fault เป็น expected scenarios ไม่เรียกว่า console ไม่มี HTTP error ทั้งหมด ตรวจภาพตัวแทนรอบใหม่ 6 ไฟล์ ได้แก่ Action create-desktop/edit-mobile/workflow-tablet, Requester populated-mobile, Staff populated-desktop/empty-tablet ร่วมกับ automated keyboard/labels/focus/overlap/overflow checks ที่สาม viewport ไม่อ้างว่าตรวจภาพทั้ง 57 ไฟล์ด้วยตา

### Release readiness และสิ่งที่ยัง Pending

| รายการ | สถานะ |
|---|---|
| Dependencies #67/#69–#73 และ peer review/merge เข้า staging | ตรวจจริงครบ; Issues ปิดแล้ว |
| Candidate tests/builds/migration/seed/recovery | ผ่านบน `3b7291e` ตาม logs; ไม่ใช่ Final-main |
| เอกสาร/หลักฐาน pre-release รอบนี้ | แก้ใน working tree; peer review ยัง Pending |
| GitHub Project/Kanban | Pending: token ไม่มี `read:project`; ต้องตรวจ Done ด้วยมือ ไม่เปลี่ยนสิทธิ์เอง |
| การตีความ rubric assign/complete/cancel/append-only | คง Contract ที่อนุมัติใน PR #68; ไม่เพิ่ม Action lifecycle หรืออ้าง TA confirmation |
| Release PR staging → main | Pending; ไม่มีการสร้าง PR ในรอบนี้ |
| Final-main verification และ Final AC/Product DoD | Pending; ต้องรันจาก main หลัง Release merge จริง |
| AI-use สำหรับส่งงาน | Pending: คัด 6–10 prompts จริง, ยืนยันชื่อ LLM และ My Reflection ของผู้จัดทำ |
| PDF Answer Part 1–9 และ links ฉบับส่ง | Pending; ใช้ final main เป็น source of truth หลัง verification |

ลำดับถัดไป: review เอกสารเตรียม Release เข้า staging → Release PR `lab4-staging` ไป `main` โดยไม่ใช้ closing keyword กับ #74 → review/merge → Final-main verification → review เอกสาร/หลักฐาน Final เข้า main → ตรวจ Project/links และจัดทำ PDF แล้วจึงปิด #74 เมื่อเงื่อนไขครบ
