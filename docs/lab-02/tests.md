# Lab 2 Test Plan and Verification Results

เอกสารนี้เป็น Test Plan, Acceptance-Criterion Traceability และผลทดสอบ Integration ของ Lab 2 ทั้งบน `lab2-staging` และ Final `main` หลัง Feature/Documentation PR #14, #16, #18, #20, #22, #24, #26, #28, #30, #31, #33 และ #34 ถูกรวมครบแล้ว โดยแยกผล Staging และ Final `main` ไว้อย่างชัดเจน

Test IDs และ Paths ในเอกสารนี้ตรงกับ Automated Tests ที่อยู่ใน Repository ไม่มีการระบุผลล่วงหน้าและไม่มี Required Test ที่ถูก Skip

## 1. Test Strategy

การทดสอบใช้แนวทาง Test DD และ TDD โดยเริ่มจาก Scenario ที่เชื่อมกับ Acceptance Criteria ใน `specification.md` เขียน Test ให้ล้มเหลวด้วยเหตุผลที่คาดไว้ จากนั้น Implement เฉพาะพฤติกรรมที่จำเป็นและ Refactor โดยรักษา Test ให้ผ่าน

| Level | Purpose | Primary Tool |
|---|---|---|
| Unit | ตรวจ Pure Logic เช่น Ticket Number, Normalization และ Attachment Validation | Vitest |
| API/Integration | ตรวจ HTTP Contract, PostgreSQL/Prisma behavior, Ownership, Validation และ Safe Error | Vitest + Supertest |
| UI Component | ตรวจ Rendering, Interaction, Loading, Empty, Validation, Success และ Failure states | Vitest + Testing Library |
| UI Style/Accessibility | ตรวจ Required classes/attributes, Focus, Labels, Badges และ non-color indicators | Vitest + Testing Library |
| Responsive | ตรวจ Desktop, Tablet และ Mobile รวมถึง Overflow และ Navigation | Playwright |
| E2E | ตรวจ Requester workflow จริงผ่าน Frontend, API และ Database | Playwright |

หลักการร่วม:

- Test Data ต้องแยกจากข้อมูลใช้งานและ Reset ได้อย่างสม่ำเสมอ
- API Tests ต้องตรวจทั้ง Status, Response Shape และผลใน Database
- Ownership Tests ต้องใช้ Requester อย่างน้อยสองคน
- Failure Tests ต้องตรวจว่า Error ปลอดภัยและไม่เปิดเผย Stack Trace, SQL, Local Path หรือ Secret
- Required Tests ห้าม Skip, Disable หรือ Comment out ใน Final `main`

## 2. Planned Tests

ตารางต่อไปนี้คง Planned Test design เดิมและแสดง Staging Integration Status จากผลรันจริง

### 2.1 Unit Tests

| Test ID | AC | What It Tests | Expected Result | Planned Test File | Status |
|---|---|---|---|---|---|
| UNIT-01 | AC-07, AC-12 | Official Ticket Number generation | ได้รูปแบบ `TKT-YYYYMMDD-XXXXXX` และจัดการ Unique Conflict ได้ | `server/tests/lab-02/ticket-number.unit.test.ts` | Pass — lab2-staging |
| UNIT-02 | AC-08, AC-17 | Trim, length limits และ query normalization | Valid input ถูก Normalize; Invalid input ถูก Reject ด้วยรายละเอียด Field/Parameter | `server/tests/lab-02/validation.unit.test.ts` | Pass — lab2-staging |
| UNIT-03 | AC-24, AC-25, AC-26 | Attachment type, MIME/extension, size และ active-count rules | ยอมรับเฉพาะไฟล์ที่ผ่านกฎและปฏิเสธ Boundary ที่ไม่ถูกต้อง | `server/tests/lab-02/attachment-validation.unit.test.ts` | Pass — lab2-staging |
| UNIT-04 | AC-28 | Removal Reason validation | Trim แล้วต้องยาว 5-250 ตัวอักษร | `server/tests/lab-02/attachment-validation.unit.test.ts` | Pass — lab2-staging |

### 2.2 API and Integration Tests

| Test ID | AC | What It Tests | Expected Result | Planned Test File | Status |
|---|---|---|---|---|---|
| API-REQ-01 | AC-01 | Retrieve Development Requesters | คืน HTTP 200 และเฉพาะ Active Requesters | `server/tests/lab-02/development-requesters.api.test.ts` | Pass — lab2-staging |
| API-REQ-02 | AC-05 | Missing, unknown และ inactive Requester context | Missing/malformed Header คืน 400; unknown/inactive context คืน Safe 403 และไม่คืน Ticket data | `server/tests/lab-02/development-requesters.api.test.ts` | Pass — lab2-staging |
| API-REF-01 | AC-09 | Active Category และ Related System retrieval | คืนเฉพาะ Active Reference Data | `server/tests/lab-02/reference-data.api.test.ts` | Pass — lab2-staging |
| API-CREATE-01 | AC-07, AC-12 | Create Ticket ด้วยข้อมูลถูกต้อง | คืน HTTP 201 พร้อม `{ ticket, replayed: false }`, บันทึก Ticket หนึ่งรายการ, requesterId ตรงกับ Header, Status `NEW` และ Ticket Number ไม่ซ้ำ | `server/tests/lab-02/create-ticket.api.test.ts` | Pass — lab2-staging |
| API-CREATE-02 | AC-08 | Required, trim และ length validation | คืน HTTP 400 พร้อม Field errors และไม่บันทึก Ticket | `server/tests/lab-02/create-ticket.api.test.ts` | Pass — lab2-staging |
| API-CREATE-03 | AC-09 | Missing/inactive Category หรือ Related System | คืน HTTP 400 และไม่บันทึก Ticket | `server/tests/lab-02/create-ticket.api.test.ts` | Pass — lab2-staging |
| API-CREATE-04 | AC-10 | Idempotent duplicate submission | Request แรกด้วย `submissionKey` ใหม่คืน 201 พร้อม `{ ticket, replayed: false }`; Request ซ้ำด้วย Requester/Key เดิมคืน 200 พร้อม `{ ticket, replayed: true }` และ Ticket ID เดิม โดย Database มี Ticket เพียงหนึ่งรายการ | `server/tests/lab-02/create-ticket.api.test.ts` | Pass — lab2-staging |
| API-CREATE-05 | AC-11 | Unexpected creation failure | คืน Safe 500 โดยไม่เปิดเผยข้อมูลภายในและไม่บันทึก Partial Ticket | `server/tests/lab-02/create-ticket.api.test.ts` | Pass — lab2-staging |
| API-LIST-01 | AC-14 | Requester-owned Ticket list | คืนเฉพาะ Ticket ของ Current Requester | `server/tests/lab-02/my-tickets.api.test.ts` | Pass — lab2-staging |
| API-LIST-02 | AC-15 | Case-insensitive search, filters และ stable sort | คืนเฉพาะรายการตรงเงื่อนไขตามลำดับที่กำหนด | `server/tests/lab-02/my-tickets.api.test.ts` | Pass — lab2-staging |
| API-LIST-03 | AC-16 | Pagination | คืน items, page, pageSize, totalOwnedItems, totalItems และ totalPages ถูกต้อง | `server/tests/lab-02/my-tickets.api.test.ts` | Pass — lab2-staging |
| API-LIST-04 | AC-17 | Invalid list query | คืน HTTP 400 พร้อม Safe Error สำหรับ Search/Filter/Sort/Pagination ที่ไม่ถูกต้อง | `server/tests/lab-02/my-tickets.api.test.ts` | Pass — lab2-staging |
| API-DETAIL-01 | AC-21 | Retrieve owned Ticket Detail | คืน HTTP 200 พร้อม Read-only Ticket data และ Attachment metadata | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass — lab2-staging |
| API-DETAIL-02 | AC-22 | Missing และ cross-owner Ticket | คืน Safe 404 และไม่เปิดเผย Ticket หรือ Owner data | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass — lab2-staging |
| API-ATT-01 | AC-24 | Upload valid Attachment | คืน HTTP 201 และบันทึก Active Metadata/Private File ถูกต้อง | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |
| API-ATT-02 | AC-25 | Unsupported type, MIME mismatch และขนาดเกิน 5 MB | คืน 415 หรือ 413 ตาม Contract และไม่สร้าง Metadata/File ค้าง | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |
| API-ATT-03 | AC-26 | Maximum five Active Attachments | ไฟล์ที่หกถูกปฏิเสธและ Active count ยังเป็นห้า | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |
| API-ATT-04 | AC-27 | Download active owned Attachment | คืน Safe Filename, Correct Content Type และ File content ที่ถูกต้อง | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |
| API-ATT-05 | AC-28 | Soft-remove with valid reason | บันทึก removedAt, removalReason และ removedByRequesterId โดยไม่ลบ Record | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |
| API-ATT-06 | AC-29 | Removed Attachment metadata/download | Metadata แสดง Removed; Download คืน 410 | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |
| API-ATT-07 | AC-30 | Cross-owner Attachment operations | Metadata, Download และ Removal คืน Safe 404 | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |
| API-ATT-08 | AC-13, AC-24 | File/metadata compensation | Metadata failure ลบไฟล์ที่เขียนไว้; Upload failure ไม่ Rollback Ticket | `server/tests/lab-02/attachments.api.test.ts` | Pass — lab2-staging |

### 2.3 UI Component, Style and Accessibility Tests

| Test ID | AC | What It Tests | Expected Result | Planned Test File | Status |
|---|---|---|---|---|---|
| UI-REQ-01 | AC-01, AC-02 | Initial Requester Selection | แสดงเฉพาะ Active options และยังไม่เปิด Ticket screens ก่อนเลือก | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Pass — lab2-staging |
| UI-REQ-02 | AC-03 | Continue with Active Requester | Application Shell แสดง Current Requester และโหลด requester-specific data | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Pass — lab2-staging |
| UI-REQ-03 | AC-04, AC-05 | Change/invalid restored Requester | ล้าง State เดิม ตรวจ ID ใหม่ และกลับ Selection เมื่อ Context ใช้ไม่ได้ | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Pass — lab2-staging |
| UI-REQ-04 | AC-06 | Requester Loading, Empty, Failure และ Retry | แสดง State และ Action ที่ถูกต้อง | `client/tests/lab-02/DevelopmentRequesterSelection.test.tsx` | Pass — lab2-staging |
| UI-CREATE-01 | AC-08 | Field-level validation | แสดงข้อความใกล้ Field และไม่เรียก Create API เมื่อข้อมูลไม่ถูกต้อง | `client/tests/lab-02/CreateTicket.test.tsx` | Pass — lab2-staging |
| UI-CREATE-02 | AC-10 | Submit busy state และ Retry identity | ปุ่ม Disabled/Busy และกดซ้ำไม่ได้; Retry Submission เดิมใช้ `submissionKey` เดิม และ Form ใหม่ใช้ Key ใหม่ | `client/tests/lab-02/CreateTicket.test.tsx` | Pass — lab2-staging |
| UI-CREATE-03 | AC-11 | API failure with retained values | แสดง Safe Error และค่า Form ยังอยู่ | `client/tests/lab-02/CreateTicket.test.tsx` | Pass — lab2-staging |
| UI-CREATE-04 | AC-12 | Successful confirmation | อ่าน `response.ticket` แล้วแสดง Ticket Number, Saved Values และ Next Action โดยรองรับ `replayed` ตาม Response contract | `client/tests/lab-02/CreateTicket.test.tsx` | Pass — lab2-staging |
| UI-CREATE-05 | AC-13 | Partial Attachment failure | Ticket ยังคงสำเร็จและ Retry เฉพาะไฟล์ที่ล้มเหลวได้ | `client/tests/lab-02/CreateTicket.test.tsx` | Pass — lab2-staging |
| UI-CREATE-06 | AC-09 | Reference-data loading states | Loading ต้อง Disable Submit; Success ทำให้ Form พร้อมใช้; Failure แสดง Safe Error และ Retry โดยยัง Submit ไม่ได้ | `client/tests/lab-02/CreateTicket.test.tsx` | Pass — lab2-staging |
| UI-LIST-01 | AC-18 | Empty list | เมื่อ `totalOwnedItems = 0` แสดง Empty state และ Create Ticket action | `client/tests/lab-02/MyTickets.test.tsx` | Pass — lab2-staging |
| UI-LIST-02 | AC-19 | No-results | เมื่อ `totalOwnedItems > 0` แต่ `totalItems = 0` แสดง No-results และ Clear Filters | `client/tests/lab-02/MyTickets.test.tsx` | Pass — lab2-staging |
| UI-LIST-03 | AC-20 | List failure | แสดง Safe Error และ Retry | `client/tests/lab-02/MyTickets.test.tsx` | Pass — lab2-staging |
| UI-LIST-04 | AC-15, AC-16 | Search, Filter, Sort and Pagination controls | การใช้ Controls ต้องส่ง Query ที่ถูกต้อง แสดง Results/Order ตาม Response และเปลี่ยน Page ได้ | `client/tests/lab-02/MyTickets.test.tsx` | Pass — lab2-staging |
| UI-DETAIL-01 | AC-21 | Owned Detail rendering | Fields เป็น Read-only และ Attachment metadata แยกจาก Actions | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass — lab2-staging |
| UI-DETAIL-02 | AC-23 | Detail failure | แสดง Safe Error และ Back to My Tickets | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass — lab2-staging |
| UI-ATT-01 | AC-24, AC-25, AC-26 | Attachment selection/upload states | แสดง Active, Invalid, Uploading และ Upload-failed states ถูกต้อง | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass — lab2-staging |
| UI-ATT-02 | AC-27, AC-28, AC-29 | Download, confirmation และ Removed state | Active Download ได้; Remove ต้องมี Reason; Removed ไม่มี Download | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass — lab2-staging |
| UI-STYLE-01 | AC-31, AC-33 | Zen Green classes, badges และ non-color states | Tokens/Classes และข้อความสถานะแสดงตาม `ui-spec.md` | `client/tests/lab-02/ZenGreenStyle.test.tsx` | Pass — lab2-staging |
| UI-A11Y-01 | AC-32, AC-34 | Keyboard, Visible Focus, labels และ error association | Control ใช้งานด้วย Keyboard และ Error เชื่อมกับ Field | `client/tests/lab-02/accessibility.test.tsx` | Pass — lab2-staging |

### 2.4 Responsive and End-to-End Tests

| Test ID | AC | What It Tests | Expected Result | Planned Test File | Status |
|---|---|---|---|---|---|
| RESP-01 | AC-31 | Required screens at Desktop, Tablet and Mobile | ไม่มี Clipping, Overlap, Hidden Action หรือ Horizontal Page Overflow | `e2e/lab-02/responsive.spec.ts` | Pass — lab2-staging |
| E2E-01 | AC-02, AC-03, AC-07, AC-12, AC-14, AC-21 | Select Requester, create Ticket, find it and open Detail | Official Ticket Number และข้อมูลจาก Database ตรงกันตลอด Flow | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass — lab2-staging |
| E2E-02 | AC-04, AC-14, AC-22, AC-30 | Switch Requester and enforce ownership | Ticket ของ Requester เดิมหายจาก List และ Direct Access ถูกปฏิเสธ | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass — lab2-staging |
| E2E-03 | AC-24, AC-27, AC-28, AC-29 | Attachment lifecycle | Upload/Download/Soft-remove ทำงานและ Removed Download ถูก Block | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass — lab2-staging |
| E2E-04 | AC-06, AC-11, AC-20, AC-23 | Safe failure states | ทุกหน้าที่กำหนดแสดง Safe Error, Retry/Back และรักษาข้อมูลตาม Contract | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass — lab2-staging |
| E2E-05 | AC-15, AC-16 | My Tickets controls flow | ผู้ใช้ Search, Filter, Sort และเปลี่ยน Page ผ่าน UI ได้ โดย Results, Order และ Pagination ตรงตามเงื่อนไข | `e2e/lab-02/my-tickets-controls.spec.ts` | Pass — lab2-staging |

### 2.5 Repository Evidence Path Verification

ตรวจ Exact Paths จาก Repository แล้ว โดยชื่อไฟล์ รวมตัวพิมพ์เล็ก/ใหญ่ และนามสกุลตรงกับไฟล์จริงทั้งหมด:

| Evidence | Exact Repository Path | Verification |
|---|---|---|
| Zen Green style test | [`client/tests/lab-02/ZenGreenStyle.test.tsx`](../../client/tests/lab-02/ZenGreenStyle.test.tsx) | Exists |
| Responsive test | [`e2e/lab-02/responsive.spec.ts`](../../e2e/lab-02/responsive.spec.ts) | Exists |
| Requester Ticket flow | [`e2e/lab-02/requester-ticket-flow.spec.ts`](../../e2e/lab-02/requester-ticket-flow.spec.ts) | Exists |
| My Tickets controls flow | [`e2e/lab-02/my-tickets-controls.spec.ts`](../../e2e/lab-02/my-tickets-controls.spec.ts) | Exists |
| Test paths referenced by this document | 19 unique paths | 19/19 exist |

Screenshot evidence จำนวน 25 ไฟล์ถูกรวมอยู่ใน Release PR นี้ สามารถตรวจสอบได้จาก Files changed และ Exact Paths ใน `ui-spec.md` โดยมีไฟล์จริงครบ 25/25 ไฟล์:

| Screenshot Directory | File Count | Repository Location |
|---|---:|---|
| Create Ticket และ Development Requester Selection | 13 | [`artifacts/lab-02/screenshots/create-ticket/`](../../artifacts/lab-02/screenshots/create-ticket/) |
| My Tickets | 8 | [`artifacts/lab-02/screenshots/my-tickets/`](../../artifacts/lab-02/screenshots/my-tickets/) |
| Ticket Detail และ Attachment | 4 | [`artifacts/lab-02/screenshots/ticket-detail/`](../../artifacts/lab-02/screenshots/ticket-detail/) |
| **รวม** | **25** | **25/25 files exist** |

รายชื่อและ Exact Path ของภาพทั้ง 25 ไฟล์อยู่ใน [`ui-spec.md` หัวข้อ Final Evidence Paths](ui-spec.md#final-evidence-paths)

## 3. Acceptance-Criterion Traceability

| AC | Planned Test Evidence |
|---|---|
| AC-01 | API-REQ-01, UI-REQ-01 |
| AC-02 | UI-REQ-01, E2E-01 |
| AC-03 | UI-REQ-02, E2E-01 |
| AC-04 | UI-REQ-03, E2E-02 |
| AC-05 | API-REQ-02, UI-REQ-03 |
| AC-06 | UI-REQ-04, E2E-04 |
| AC-07 | UNIT-01, API-CREATE-01, E2E-01 |
| AC-08 | UNIT-02, API-CREATE-02, UI-CREATE-01 |
| AC-09 | API-REF-01, API-CREATE-03, UI-CREATE-06 |
| AC-10 | API-CREATE-04, UI-CREATE-02 |
| AC-11 | API-CREATE-05, UI-CREATE-03, E2E-04 |
| AC-12 | UNIT-01, API-CREATE-01, UI-CREATE-04, E2E-01 |
| AC-13 | API-ATT-08, UI-CREATE-05 |
| AC-14 | API-LIST-01, E2E-01, E2E-02 |
| AC-15 | API-LIST-02, UI-LIST-04, E2E-05 |
| AC-16 | API-LIST-03, UI-LIST-04, E2E-05 |
| AC-17 | UNIT-02, API-LIST-04 |
| AC-18 | UI-LIST-01 |
| AC-19 | UI-LIST-02 |
| AC-20 | UI-LIST-03, E2E-04 |
| AC-21 | API-DETAIL-01, UI-DETAIL-01, E2E-01 |
| AC-22 | API-DETAIL-02, E2E-02 |
| AC-23 | UI-DETAIL-02, E2E-04 |
| AC-24 | UNIT-03, API-ATT-01, UI-ATT-01, E2E-03 |
| AC-25 | UNIT-03, API-ATT-02, UI-ATT-01 |
| AC-26 | UNIT-03, API-ATT-03, UI-ATT-01 |
| AC-27 | API-ATT-04, UI-ATT-02, E2E-03 |
| AC-28 | UNIT-04, API-ATT-05, UI-ATT-02, E2E-03 |
| AC-29 | API-ATT-06, UI-ATT-02, E2E-03 |
| AC-30 | API-ATT-07, E2E-02 |
| AC-31 | UI-STYLE-01, RESP-01 |
| AC-32 | UI-A11Y-01 |
| AC-33 | UI-STYLE-01 |
| AC-34 | UI-A11Y-01 |

## 4. Responsive and Visual Checklist

ตรวจจาก `ui-spec.md` และบันทึก Screenshot จริงเมื่อ UI พร้อม ห้ามทำเครื่องหมายผ่านจากภาพ Mockup หรือก่อน Inspect จริง

| Check | Desktop >= 992 px | Tablet 768-991 px | Mobile < 768 px | Evidence Path | Status |
|---|---|---|---|---|---|
| Application Shell และ Active Navigation | Pass | Pass | Pass | `artifacts/lab-02/screenshots/create-ticket/` | Pass — lab2-staging |
| Development Requester Selection และ States | Pass | Pass | Pass | `artifacts/lab-02/screenshots/create-ticket/` | Pass — lab2-staging |
| Create Ticket initial/validation/submitting/success/failure | Pass | Pass | Pass | `artifacts/lab-02/screenshots/create-ticket/` | Pass — lab2-staging |
| My Tickets table/card, controls, empty/no-results/failure | Pass | Pass | Pass | `artifacts/lab-02/screenshots/my-tickets/` | Pass — lab2-staging |
| Ticket Detail และ Attachment states | Pass | Pass | Pass | `artifacts/lab-02/screenshots/ticket-detail/` | Pass — lab2-staging |
| No clipping, overlap, hidden button or horizontal overflow | Pass | Pass | Pass | Same screen folders | Pass — lab2-staging |
| Editable/Read-only/Invalid/Disabled/Focused styles | Pass | Pass | Pass | Same screen folders | Pass — lab2-staging |
| Priority/Status badges and non-color indicators | Pass | Pass | Pass | Same screen folders | Pass — lab2-staging |

## 5. Test Commands

คำสั่งต่อไปนี้ใช้ตรวจชุดทดสอบอัตโนมัติของ Lab 2 และได้รับการยืนยันจากการรัน Staging Integration แล้ว:

```powershell
# Server unit and API/integration tests
cd .\server
npm.cmd test -- tests/lab-02

# Client component, style and accessibility tests
cd ..\client
npm.cmd test -- tests/lab-02

# End-to-end and responsive tests
cd ..\e2e
npm.cmd test
```

Full Regression command used for the Staging Integration result:

```powershell
cd .\server
npm.cmd test
npm.cmd run build

cd ..\client
npm.cmd test
npm.cmd run build
```

## 6. Staging Integration Test Results

ผลต่อไปนี้รันเมื่อวันที่ 4 September 2026 เวลา 19:55 น. จาก Source code ล่าสุดบน `lab2-staging` หลัง PR #33 ถูก Merge แล้ว ที่ commit [`a41bcc3`](https://github.com/guluJa/toktickit/commit/a41bcc32796424b2f34a4af8e88217f44e4b5872) ผ่าน Branch เอกสาร `docs/lab2-staging-documentation-update` ผลชุดนี้เป็น Staging Verification เท่านั้น ไม่ใช่ Final `main` verification

| Test Suite | Command | Result | Evidence |
|---|---|---|---|
| Server full test suite | `server: npm.cmd test` | Pass — 92 tests in 11 files | Terminal output for this branch and PR verification |
| Server build | `server: npm.cmd run build` | Pass | TypeScript build completed with exit code 0 |
| Client full test suite | `client: npm.cmd test` | Pass — 39 tests in 8 files | Terminal output for this branch and PR verification |
| Client build | `client: npm.cmd run build` | Pass | TypeScript and Vite build completed with exit code 0 |
| Playwright E2E/Responsive | `e2e: npm.cmd test` | Pass — 6 tests | Terminal output and `artifacts/lab-02/screenshots/` |

ข้อความ `stderr` ใน Safe-failure tests เป็น Error ที่ Test จงใจจำลองเพื่อยืนยันว่า API คืน Safe response โดยไม่เปิดเผย SQL, local path หรือ secret; Test files และ assertions ทั้งหมดผ่าน

Screenshot evidence ถูกสร้างจาก Browser flow จริงโดย `e2e/lab-02/responsive.spec.ts` และครอบคลุม Create Ticket, My Tickets, Ticket Detail, Empty, No-results, Failure และ Removed Attachment states

## 7. Staging Required-Test Completion

- จากการตรวจบน `lab2-staging` ไม่มี Required Test ถูก Skip, Disable หรือ Comment out
- Unit, API/Integration, UI Component, Style/Accessibility, Responsive และ E2E tests ผ่านครบใน Staging Integration
- Acceptance Criteria AC-01 ถึง AC-34 มี Automated Test evidence ตาม Traceability Matrix
- ไม่มี Required Scenario หรือ Lab 2 Product Scope ที่ Deferred
- Authentication, IT Staff workflow, Comments/Internal Notes, Actions Taken และ Status changes หลัง `NEW` เป็น Explicit Exclusions ของ Lab 2 ไม่ใช่งานค้าง

## 8. Final `main` Verification

**สถานะ: Pass — Final `main`**

Final Verification ใช้ Source code baseline จาก `main` หลัง Release PR #32 ถูก Peer Review และ Merge แล้ว โดยตรวจสอบที่ commit เดียวกันตลอดชุดการตรวจสอบ เอกสารและ Screenshot ใน Final Verification PR เป็นหลักฐานเพิ่มเติมเท่านั้น และไม่เปลี่ยน Product Source Code หรือ Automated Tests

| Evidence | Final Result |
|---|---|
| Verified `main` source commit at execution time | [`4c6dc52`](https://github.com/guluJa/toktickit/commit/4c6dc5283266b7f42666aaaa058a931ecc9b7975) |
| วันที่และเวลาที่รัน | 4 September 2026; เริ่มรันเวลา 22:58 น. (Asia/Bangkok) |
| VERIFY-01: Server, Client และ Playwright tests | Pass — Server 92 tests, Client 39 tests, Playwright E2E/Responsive 6 tests |
| VERIFY-02: Server และ Client builds | Pass — Server TypeScript build และ Client TypeScript/Vite build |
| Complete console output | [Final verification console transcript](../../artifacts/lab-02/final-verification/console-output.txt) จากการรันจริง โดยไม่มี Secret หรือค่าจาก `.env` |

ผลชุดนี้เป็นหลักฐานจาก Source code baseline ของ Final `main` โดยตรง ไม่ได้นำผลจาก `lab2-staging` มาแทนที่ หลังการตรวจสอบมีการบันทึกเอกสารและหลักฐานใน Branch `docs/lab2-final-verification` เท่านั้น

## 9. PDF Evidence Source — Answer Part 3

ใน PDF ใช้ Rendered `tests.md` เพื่อแสดง Planned-test tables, actual test-file paths, AC Traceability, ผล Staging Integration และผล Final `main` หลัง VERIFY-01/VERIFY-02 ผ่านจริง พร้อมภาพ Terminal output ที่อ่านได้ครบ โดย Repository และ Commit links ในเอกสารนี้เป็น Source of Truth
