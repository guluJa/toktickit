# TokTickIT Lab 4: แผนทดสอบและการเชื่อมโยงข้อกำหนด

แผนทดสอบจัดทำก่อน implementation ใน [PR #68](https://github.com/guluJa/toktickit/pull/68) และปรับให้ตรงกับระบบที่พัฒนาแล้ว ผล Final-main อ้างอิง commit `08328cd293c11316da8496857007d781f2dafaa8` หลัง Release PR #81

## 1. Test Strategy

การทดสอบครอบคลุม Unit, API/Integration, UI Component, UI Style, Authorization, Workflow, Migration/Recovery, Performance-Smoke, Responsive และ E2E รวมทั้ง regression ของ Lab 1–3

## 2. Test Matrix: แผนเดิมและผล Final-main

| Test ID | Type | Requirement/AC | สิ่งที่ทดสอบ | ผลที่คาดหวัง | ไฟล์ทดสอบ | ผลสุดท้าย |
|---|---|---|---|---|---|---|
| UNIT-01 | unit | AC-01/05/08 | Validation ของ Action, follow-up และช่วงค่า version | ปฏิเสธ fields ที่ Backend จัดการและค่าผิดรูปแบบ; follow-up=true ต้องมี note และ false ต้องเป็น null; ตัวเลขไม่เกิน PostgreSQL INTEGER; API-03 ตรวจ version increment และ UNIT-02/API-04 ตรวจ gate | server/tests/lab-04/actions-taken.unit.test.ts | Pass¹ |
| UNIT-02 | unit | AC-06/07 | Status Matrix และ Resolution Gate | ยอมรับ transitions ที่อนุญาต รวม REOPENED → IN_PROGRESS และปฏิเสธ transition/gate ที่ผิดกฎ | server/tests/lab-04/ticket-workflow.unit.test.ts | Pass¹ |
| API-01 | API | AC-01/02/03/04/16 | อ่าน/สร้าง/แก้ Action และกรณี 0/1/หลายรายการ | Response และ performer ถูกต้อง; เรียง actionAt ASC, id ASC ข้ามหน้าได้อย่างคงที่; ไม่ลบหรือ reorder Action; Comments/Internal Notes เดิมยัง append-only | server/tests/lab-04/actions-taken.api.test.ts | Pass¹ |
| API-02 | authorization | AC-02/03/15 | สิทธิ์และ ownership ของ Requester/Staff/Admin | Backend บังคับสิทธิ์; Requester อ่านอย่างเดียว; Staff/Admin แก้ Action ของ performer คนอื่นได้โดยไม่เปลี่ยน performedBy; authentication errors คงชื่อเดิม | server/tests/lab-04/actions-taken.api.test.ts | Pass¹ |
| API-03 | API | AC-05/08 | Validation และ stale/concurrent update | ตอบ safe 400/409 โดยไม่เขียนทับ; CLOSED/CANCELLED หรือ race ที่เขียนต่อไม่ได้ตอบ ACTION_STATE_CONFLICT; RESOLVED ยังแก้ follow-up ได้ | server/tests/lab-04/actions-taken.api.test.ts; server/tests/lab-04/ticket-workflow.api.test.ts | Pass¹ |
| API-04 | workflow | AC-06/07/08 | ทุก Status transition, version และ Resolution Gate | ครบ Matrix รวม REOPENED → IN_PROGRESS; RESOLVED มี follow-up ค้างได้ แต่ CLOSED ต้องเคลียร์ทั้งหมด; ใช้ Ticket.version และ reopenReason ที่ไม่ว่าง; stale ไม่เขียนข้อมูล; assignment เดิมคง 404 USER_NOT_FOUND สำหรับ inactive assignee | server/tests/lab-04/ticket-workflow.api.test.ts | Pass¹ |
| API-05 | API | AC-09/12 | Requester Dashboard และ ownership | ข้อมูลว่างได้ counts=0 และ empty lists; ข้อมูล seed ได้ counts/owned lists ที่ถูกต้อง; My Tickets ใช้ currentStatus, sortDirection และ pageSize=10 ตาม response เดิม แม้ limit=5 | server/tests/lab-04/requester-dashboard.api.test.ts | Pass¹ |
| API-06 | API | AC-10/12 | Staff/Admin Dashboard และ drill-down | ข้อมูลว่างได้ empty lists และทุก byStatus/byPriority key เป็น 0; ตรวจสูตร 7 วัน limit/sort/tie-breaker, recentlyResolvedTickets และ recentActions ของผู้ใช้ปัจจุบัน; Queue ใช้ status, sortOrder, pageSize=10 แยกจาก limit | server/tests/lab-04/staff-dashboard.api.test.ts | Pass¹ |
| API-07 | migration/regression | AC-11/15 | ข้อมูลเดิมและ legacy Ticket หลัง migration | คง ID, FK และข้อมูลเดิมครบ; Ticket ที่ไม่มี Action ยังอ่านได้ | server/tests/lab-04/migration-regression.api.test.ts | Pass¹ |
| API-08 | migration/regression | AC-11/09/10 | Seed ซ้ำและ Dashboard fixtures | มี 0/1/หลาย Actions และ zero/non-zero fixtures; seed รอบสองไม่เพิ่มข้อมูลซ้ำหรือทำข้อมูลสูญหาย | server/tests/lab-04/migration-regression.api.test.ts | Pass¹ |
| MIG-01 | migration/recovery | AC-11 | Migration precondition และ recovery | Precondition failure หยุดก่อนเขียนและรักษาแถวเดิม; ตรวจ backup/restore แยกด้วย recovery script และผลรันจริง ไม่ใช้ API test นี้แทนการ restore | server/tests/lab-04/migration-recovery.api.test.ts; artifacts/lab-04/verify-recovery.ps1; artifacts/lab-04/evidence/final-main/08328cd/verification/recovery-restore.txt | Pass¹ |
| PERF-01 | performance-smoke | AC-09/10 | Performance-smoke ของ Dashboard | เวลาตอบและขนาด response อยู่ในเกณฑ์ที่กำหนด และไม่คืน Ticket ทั้งหมดแบบไร้ขอบเขต | server/tests/lab-04/performance-smoke.api.test.ts | Pass¹ |
| UI-01 | component | AC-01/04/05/16 | รายการ/ฟอร์ม Action และ recoverable save | แสดง empty/populated, validation และ saving guard; timeout คง draft และสถานะ uncertain แม้พบข้อความเดิมหรือ late commit; อ่านทุกหน้า ไม่แจ้ง success หรือ retry อัตโนมัติ; GET failure คงฟอร์ม; ส่งใหม่ต้องเตือน duplicate risk | client/tests/lab-04/ActionsTaken.test.tsx | Pass¹ |
| UI-02 | component | AC-03 | Requester อ่าน Action อย่างเดียว | ไม่มี create/edit/delete controls และแสดง safe failure | client/tests/lab-04/ActionsTaken.test.tsx | Pass¹ |
| UI-03 | component | AC-09/12 | Requester Dashboard และ My Tickets links | Metrics, empty state และ owned links ถูกต้อง; ใช้ currentStatus/sortDirection/pageSize=10 แม้ limit=5; ลิงก์ filtered ใช้สถานะที่ส่งมา ส่วน My Tickets ปกติคง default/controls เดิม | client/tests/lab-04/RequesterDashboard.test.tsx | Pass¹ |
| UI-04 | component | AC-10/12 | Staff Dashboard และ Queue links | Cards, current-user Actions, recently resolved และ Queue/Detail links ถูกต้อง; ใช้ status/sortOrder/pageSize=10 แม้ limit=5; zero keys, loading, empty และ failure แสดงถูกต้อง | client/tests/lab-04/StaffDashboard.test.tsx | Pass¹ |
| UI-05 | component | AC-06/07/08 | Workflow controls และ conflict feedback | แสดงเฉพาะ controls ที่มีสิทธิ์; gate/conflict/stale feedback ถูกต้องและ refresh ก่อนลองใหม่ | client/tests/lab-04/TicketWorkflow.test.tsx | Pass¹ |
| STYLE-01 | UI style/accessibility | AC-13/14 | Zen Green, labels, focus และ non-color cues | ผ่าน assertions ด้านรูปแบบและ accessibility ที่กำหนด | client/tests/lab-04/AccessibilityStyle.test.tsx | Pass¹ |
| AUTH-01 | authorization UI | AC-02/03/09/10 | Role navigation และ forbidden UI | Controls/navigation ตรง role; การบังคับสิทธิ์จริงตรวจด้วย API-02/API-05/API-06 และ E2E ไม่ใช้ component mocks แทน Backend | client/tests/lab-04/AuthorizationStates.test.tsx | Pass¹ |
| API-09 | API/regression | AC-09/10/12/15 | ความเข้ากันได้ของ API Lab 3 | Requester GET /api/tickets คง currentStatus/sortDirection และ unwrapped list; Staff Queue คง status/sortOrder และ data envelope; pageSize=10 ใช้ได้แม้ limit=5; คง auth/assignment/safe errors และปรับ regression สำหรับ Ticket.version, gate และ transition ใหม่ | ไฟล์จริงในรายการด้านล่าง | Pass¹ |
| REG-01 | regression | AC-15 | Regression ของ Labs 1–3 | Authentication, Requester, Queue/Detail, Administrator และ Attachments ยังผ่าน พร้อม API compatibility | ไฟล์จริงในรายการด้านล่าง | Pass¹ |
| RESP-01 | responsive | AC-13/14 | Dashboard, Actions และ Detail ทั้งสามขนาด | ไม่มี clipping, overlap หรือ page-level overflow ในขอบเขตที่ตรวจ | e2e/lab-04/actions-taken-flow.spec.ts; e2e/lab-04/ticket-resolution.spec.ts; e2e/lab-04/dashboards.spec.ts | Pass¹ |
| E2E-01 | E2E | AC-01/02/03/04/05/16 | Action workflow ตาม role | สร้าง/อ่าน/แก้และ visibility ถูกต้อง; repeated click มี guard; timeout คง uncertain แม้มีข้อความเก่าหรือ late commit อยู่หน้าถัดไป; ไม่มี false success/POST ซ้ำอัตโนมัติ; failure คง draft และการแก้โดย Staff/Admin คนอื่นคง performer | e2e/lab-04/actions-taken-flow.spec.ts | Pass¹ |
| E2E-02 | E2E | AC-06/07/08 | Resolution workflow และ concurrency | RESOLVED คง follow-up ได้; CLOSED รอเคลียร์; concurrent Action/Status ไม่มี partial write; REOPENED → IN_PROGRESS ใช้ version ล่าสุด; CANCELLED เป็น terminal; Requester indication ไม่เปลี่ยน formal status | e2e/lab-04/ticket-resolution.spec.ts | Pass¹ |
| E2E-03 | E2E | AC-09/10/12/13/14 | Dashboard API/UI, role และ drill-down | ตรวจ metrics, 7-day recently resolved, current-user Actions และ zero keys; Requester ใช้ currentStatus, Staff ใช้ status; limit=5 ยังเปิด Queue ด้วย pageSize=10; visibility/Detail links/sort/responsive ถูกต้อง | e2e/lab-04/dashboards.spec.ts | Pass¹ |

¹ Pass หมายถึง assertions และ coverage ที่ระบุซึ่งรันผ่านจาก tested Product SHA ข้างต้น ตามขอบเขตและข้อจำกัดในข้อ 5 แผนก่อน implementation ยังตรวจได้จาก revision ของ PR #68

### ไฟล์ Regression ของ Labs 1–3 สำหรับ REG-01/API-09

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

- `client/tests/lab-01/App.test.tsx`
- `client/tests/lab-02/CreateTicket.test.tsx`
- `client/tests/lab-02/MyTickets.test.tsx`
- `client/tests/lab-02/RequesterTicketDetail.test.tsx`
- `client/tests/lab-02/AttachmentSection.test.tsx`
- `client/tests/lab-02/accessibility.test.tsx`
- `client/tests/lab-02/ZenGreenStyle.test.tsx`
- `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` (compatibility test ไม่ใช่การคืน selector ใน application)
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

### Regression ที่ปรับให้รองรับ Lab 4

- My Tickets ยังคง query `currentStatus`/`sortDirection` และ response เดิม; Staff Queue ใช้ `status`/`sortOrder`
- Ticket Detail/Queue ส่งและอ่าน `Ticket.version` พร้อมตรวจ stale update, Resolution Gate และ `REOPENED → IN_PROGRESS`
- Assignment และ inactive-assignee error ยังคง `404 USER_NOT_FOUND`
- ชุด Lab 3 E2E ตรวจการทำงานเดิมร่วมกับ workflow ที่เพิ่มใน Lab 4

## 3. Acceptance-Criterion Traceability

| AC | เกณฑ์รับงาน | Test IDs |
|---|---|---|
| AC-01 | สร้าง Action โดยใช้ performer จาก session | API-01, E2E-01 |
| AC-02 | Administrator สร้าง/แก้ได้แต่ปลอม performer ไม่ได้ | API-02, AUTH-01, E2E-01 |
| AC-03 | Requester อ่าน Actions ของตนเองเท่านั้น | API-02, UI-02, E2E-01 |
| AC-04 | รายการ 0/1/หลาย Actions และลำดับคงที่ | API-01, UI-01, E2E-01 |
| AC-05 | Validation ของ follow-up | UNIT-01, API-03, UI-01 |
| AC-06 | Status Matrix ครบทุก transition | UNIT-02, API-04, UI-05 |
| AC-07 | Resolution Gate และ Requester indication | API-04, UI-05, E2E-02 |
| AC-08 | Stale-update conflict ของ Action และ Ticket | API-03, API-04, UI-05, E2E-02 |
| AC-09 | Requester Dashboard รวม Recently Resolved | API-05, UI-03, E2E-03 |
| AC-10 | Staff/Admin Dashboard ใช้ Staff route เดียวกัน | API-06, UI-04, E2E-03 |
| AC-11 | Migration, seed ซ้ำ และ recovery | API-07, API-08, MIG-01 |
| AC-12 | API และ safe errors ตรง Contract | API-01–API-06 |
| AC-13 | Loading, empty, forbidden, validation, conflict และ failure | UI-01, UI-03, UI-04, UI-05 |
| AC-14 | Responsive และ accessibility | STYLE-01, RESP-01 |
| AC-15 | Regression ของ Labs 1–3 | REG-01 |
| AC-16 | การส่ง Action ซ้ำและ failure ที่กู้คืนได้ | UI-01, E2E-01 |

## 4. FR/BR Traceability

| Requirement | Acceptance Criteria | Test IDs |
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

## 5. ผลทดสอบ Final-main

ทดสอบวันที่ 12 ตุลาคม 2026 เวลา 18:05–18:08 น. (Asia/Bangkok) จาก Product SHA `08328cd293c11316da8496857007d781f2dafaa8` ใช้โค้ด schema, migrations, seed และ tests ของ main โดยไม่แก้ไข และใช้ฐาน `toktickit_e2e` แยกจาก Development ผลรอบนี้แยกจากหลักฐานระหว่างพัฒนาและ Release candidate

| คำสั่ง/ชุดตรวจ | ผ่าน | ไม่ผ่าน/skip | หลักฐานใต้ final-main/08328cd/verification/ |
|---|---|---|---|
| Prisma validate/generate, migrate status/deploy | exit 0 ทั้งหมด; 6 migrations, schema up to date | ไม่มี pending migration | `prisma-validate.txt`, `prisma-generate.txt`, `migration-status.txt`, `migration-deploy.txt` |
| Seed สองรอบ | exit 0 ทั้งคู่; identity/edits/zero-one-many assertions ผ่านใน API-08 | 0 | `seed-first.txt`, `seed-second.txt`, `server-full.txt` |
| Focused Server Lab 4 | 9 files / 123 tests | 0 failed / 0 skipped | `server-focused.txt` |
| Full Server Labs 1–4 | 28 files / 272 tests | 0 failed / 0 skipped | `server-full.txt` |
| Focused Client Lab 4 | 7 files / 59 tests | 0 failed / 0 skipped | `client-focused.txt` |
| Full Client Labs 1–4 | 23 files / 131 tests | 0 failed / 0 skipped | `client-full.txt` |
| Server/Client build | exit 0 ทั้งคู่ | 0 | `server-build.txt`, `client-build.txt` |
| Full E2E | 15 tests | 0 failed/skipped/flaky | `e2e-full.txt`; `../e2e-report.json` |
| Responsive run | 15 tests; desktop/tablet/mobile captures | 0 failed/skipped/flaky | `responsive.txt`; `../responsive-report.json` |
| PERF-01, limit=5 | Requester 25 ms / 1,962 UTF-8 bytes; Staff 17 ms / 6,529 bytes | ผ่าน <2 วินาที/<100 KB | `performance-smoke.txt` |
| Backup/restore | exit 0; `ROW_SNAPSHOT_MATCH=true`; scratch/drop และ dump cleanup สำเร็จ | 0 | `recovery-restore.txt` |


คำสั่ง เวลา และ exit code อยู่ใน [commands.json](../../artifacts/lab-04/evidence/final-main/08328cd/verification/commands.json) และ [ผลรันทั้งหมด](../../artifacts/lab-04/evidence/final-main/08328cd/verification/) ส่วน [run.json](../../artifacts/lab-04/evidence/final-main/08328cd/run.json) ระบุ Product SHA และวิธีรัน

### Migration, seed และ recovery

API-07 เปรียบเทียบจำนวนแถว ID ความสัมพันธ์ และข้อมูลจริงก่อน–หลัง migration จาก Lab 3 รวม Users, Tickets, Attachments, Comments และ Internal Notes; Ticket เดิมได้ version=1 และอ่านได้แม้ไม่มี Action API-08 ตรวจ seed สองรอบ รวมกรณี 0/1/หลาย Actions และการรักษาข้อมูล fixture ที่แก้แล้ว

ผล backup/restore ตรงกันทั้งข้อมูลและจำนวนแถว: Users 11, Tickets 14, Actions 9, Comments 3, Internal Notes 3, Attachments 0; `ROW_SNAPSHOT_MATCH=true` และ cleanup สำเร็จ การรักษา Attachment ที่มีข้อมูลตรวจแยกใน migration test ซึ่งเตรียม Attachment เดิมหนึ่งรายการ

### Dashboard และ browser evidence

- [dashboard-metrics.json](../../artifacts/lab-04/evidence/final-main/08328cd/verification/dashboard-metrics.json) เปรียบเทียบ selected metrics และ IDs จากฐานข้อมูล API และ UI ณค่า `asOf` เดียวกัน
- [E2E report](../../artifacts/lab-04/evidence/final-main/08328cd/e2e-report.json) และ [responsive report](../../artifacts/lab-04/evidence/final-main/08328cd/responsive-report.json) แสดงผลอย่างละ 15 cases โดยไม่มี failed, skipped หรือ flaky
- ภาพหลักอยู่ใน [screenshots](../../artifacts/lab-04/screenshots/) เป็นหลักฐานรอบ hardening; โค้ด Product และ browser tests ไม่เปลี่ยนจาก `af6fe86` ถึง `08328cd` ผล browser assertions บน main ตรวจซ้ำในรอบ Final นี้
- ภาพเสริมใน [supplemental/screenshots/actions-taken](../../artifacts/lab-04/evidence/final-main/08328cd/supplemental/screenshots/actions-taken/) แสดงหลาย Actions, performer ต่างจาก Owner และ Requester read-only ทั้งสามขนาด มีผลแยก 1 passed ไม่รวมกับ E2E 15 cases ของ main
- การเก็บภาพเสริมใช้ helper ใน snapshot ที่ตรวจ accessible name ของ native file input แทน innerText โดยยังตรวจ labels, focus, clipping และ overflow; ไม่แก้ Product หรือ tests เดิม ผลและขอบเขตอยู่ใน [supplemental/run.json](../../artifacts/lab-04/evidence/final-main/08328cd/supplemental/run.json)

### ขอบเขตผลทดสอบ

ตรวจ Chromium ที่ desktop 1440×1000, tablet 820×1180 และ mobile 375×812 ร่วมกับ component tests และภาพตัวแทน ไม่ใช่การรับรองทุก browser/device หรือ WCAG certification การจำลอง 403/409/503 และ network failure เป็นกรณีทดสอบที่ตั้งใจ ไม่ใช่ข้อผิดพลาดของ normal flow; ไม่พบ uncaught pageerror ใน browser evidence

ชุด E2E Lab 2 ที่ใช้ Development Requester selector ถูกเลิกใช้ตาม config เดิม จึงไม่นับเป็น Pass การทำงาน Labs 1–3 ตรวจผ่าน full API/component suites และ authenticated Lab 3 E2E 6 cases ส่วน performance เป็น smoke test บนข้อมูลทดสอบ ไม่ใช่ production load benchmark

## 6. ประวัติการตรวจ

- Engineering Contract และแผนก่อน implementation: [PR #68](https://github.com/guluJa/toktickit/pull/68)
- Foundation, Actions UI, Workflow และ Dashboards: [PR #75](https://github.com/guluJa/toktickit/pull/75), [#76](https://github.com/guluJa/toktickit/pull/76), [#77](https://github.com/guluJa/toktickit/pull/77), [#78](https://github.com/guluJa/toktickit/pull/78)
- Integrated hardening: [PR #79](https://github.com/guluJa/toktickit/pull/79) และ `artifacts/lab-04/verification/`
- Staging Release candidate: [PR #80](https://github.com/guluJa/toktickit/pull/80) และ `artifacts/lab-04/release-candidate/3b7291e/`
- Release เข้า main: [PR #81](https://github.com/guluJa/toktickit/pull/81); [CI run 38043408742](https://github.com/guluJa/toktickit/actions/runs/38043408742) สำเร็จบน PR head `48694b8` ผลทดสอบ main หลัง merge อยู่ในข้อ 5
