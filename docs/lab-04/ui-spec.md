# TokTickIT Lab 4: ข้อกำหนดหน้าจอ

หน้าจอ Lab 4 ต่อเนื่องจาก Zen Green และ role navigation ของ Lab 3 ผลทดสอบบน main อยู่ใน tests.md ข้อ 5 และผลตรวจ Visual/Accessibility อยู่ในข้อ 7
Baseline: Zen Green, role navigation, accessibility และ responsive conventions จาก docs/lab-03/ui-spec.md

## 1. Application Shell

- แสดง authenticated user, role badge และ Logout
- แสดง Dashboard ตาม Role
- Requester เปิด Requester Dashboard จาก navigation; IT Staff และ Administrator เปิด Staff Dashboard route เดียวกัน คงหน้าตั้งต้น Create Ticket/Staff Queue/User Management ของ Lab 3
- คง Staff Queue, Ticket Detail, My Tickets, User Management และ Create Ticket จาก Lab 3
- ห้ามคืน Development Requester selector ใน production flow
- Navigation active state ต้องสื่อสารด้วยข้อความ/โครงสร้าง ไม่พึ่งสีเพียงอย่างเดียว

## 2. New Screens and Modes

### 2.1 IT Staff Dashboard

โหมด:

- loading
- populated
- empty metrics
- forbidden
- server failure

Controls:

- Metric cards
- Recently Updated Tickets
- Recently Resolved Tickets
- Unassigned Tickets
- My Assigned Tickets
- Filter/drill-down links ไป Queue และ Detail
- Recently Resolved ใช้ช่วง 7 วันล่าสุดตาม `updatedAt`; Recent Actions แสดงเฉพาะ Action ของผู้ใช้ที่ authenticate อยู่และใช้ช่วง 7 วันล่าสุดตาม `actionAt`
- รายการ Dashboard ใช้ limit เดียวกับ API, เรียง `updatedAt DESC, id DESC` หรือ `actionAt DESC, id DESC` ตามรายการ และแสดง empty state เมื่อไม่มีรายการ
- ลิงก์ใช้ Dashboard link object เดียวกับ API: Ticket/Action เปิด Staff Ticket Detail ด้วย `ticketId`; metric card เปิด Queue ด้วย `status`, `sortBy=updatedAt`, `sortOrder=desc`, `page=1`, `pageSize=10` และเพิ่ม `ownerId` เฉพาะ card ที่กรอง Owner; `pageSize` ของ Queue ไม่ขึ้นกับ Dashboard `limit`
- เมื่อ `byStatus` หรือ `byPriority` ไม่มีข้อมูล ให้แสดงทุก label พร้อมค่า 0 ไม่ซ่อน card และแสดง empty state ของรายการ
- Keyboard accessible controls

### 2.2 Requester Dashboard

โหมด:

- loading
- populated
- zero-ticket empty state
- failure

ต้องแสดงเฉพาะข้อมูลของ authenticated Requester และ drill-down ด้วย `ticketId` ไปยัง My Tickets/Detail เดิมของตนเอง

Metric link ไป My Tickets ใช้ `currentStatus` (ไม่ใช่ `status`), `sortBy=updatedAt`, `sortDirection=desc`, `page=1`, `pageSize=10`; Client ของ Dashboard ต้องรองรับ status ที่ใช้ในลิงก์โดยไม่เปลี่ยนพฤติกรรมหน้ารายการเดิม. เมตริกที่รวมหลายสถานะมีลิงก์แยกตามสถานะ และรายการช่วง 7 วันใน Dashboard อาจมีจำนวนน้อยกว่า My Tickets ที่เปิดจากลิงก์ เพราะ API เดิมไม่มีตัวกรองวันที่

My Tickets รับ query ของ Dashboard link และรองรับทุก TicketStatus โดยคง All Statuses/NEW และค่าเริ่มต้นของผู้ที่เปิด My Tickets ตามปกติ Staff Queue รับ query ของ link โดยแสดงค่าตัวกรองให้ตรงกัน เมื่อเปิดหน้ารายการจาก navigation ตามปกติจะกลับไปใช้ค่าเริ่มต้นเดิม

Metric ขั้นต่ำต้องมี Open Tickets, Waiting for Requester, Recently Updated และ Recently Resolved โดย Recently Resolved แสดงจำนวนและรายการ Ticket ที่เป็น RESOLVED/CLOSED และ updatedAt อยู่ในช่วงเวลาที่ Contract กำหนด

Dashboard แสดงเวลา Asia/Bangkok และอธิบายว่า Recently Resolved อ้าง `updatedAt` ของ Ticket ที่ปัจจุบัน RESOLVED/CLOSED ไม่ใช่เวลาที่ resolve จริง หน้าจอใช้ยอดรวมจาก Backend โดยไม่คำนวณจากรายการที่จำกัด limit; ปุ่ม drill-down ส่ง link object เดิมไปหน้าปลายทาง

ระหว่างโหลดไม่แสดงข้อมูลของคำขอก่อนหน้า ปุ่ม Refresh ถูกปิดขณะโหลด และผลตอบกลับเก่าต้องไม่ทับข้อมูลหลังเปลี่ยนผู้ใช้/Role ข้อผิดพลาดใช้ข้อความปลอดภัยพร้อม Retry/Refresh; forbidden ไม่แสดง metrics หรือรายการ Metric cards ใช้หนึ่งคอลัมน์บนมือถือ สองคอลัมน์บน tablet และสามคอลัมน์บน desktop พร้อม semantic headings, status/alert และ keyboard controls ผลตรวจภาพและ accessibility อยู่ในข้อ 7–8

### 2.3 Actions Taken ใน Staff Ticket Detail

ต้องมี:

- รายการ Action เรียงตาม actionAt/id
- Empty state เมื่อไม่มี Action
- Create form
- Edit form
- Saving/success/failure
- Submission-uncertain เมื่อ timeout หรือไม่ทราบผล POST: คงข้อมูลและโหลด Actions ทุกหน้าตาม pagination (`actionAt ASC, id ASC`), จากนั้นให้ผู้ใช้ refresh ตรวจซ้ำได้เมื่อคำขอเดิมอาจบันทึกภายหลัง. รายการที่ข้อความเหมือนกันเป็นเพียง candidate แม้พบภายหลัง; ทั้งกรณีพบและไม่พบต้องคง uncertain ไม่แจ้งว่าสำเร็จ เพราะไม่มีตัวระบุที่ผูกกับ POST เดิม. ถ้าโหลดไม่สำเร็จให้แสดง safe failure และเก็บข้อมูลเดิม. ห้าม retry POST อัตโนมัติ; หากผู้ใช้เลือกสร้างใหม่ต้องเตือนว่าอาจเกิดรายการซ้ำ
- Validation ของ description, result และ follow-up
- Conflict state เมื่อ version เก่า
- Performer read-only จาก session
- Ticket Owner read-only จาก Ticket
- Follow-Up Note
- Attachment Notes
- Controls เปลี่ยน Ticket เป็น `RESOLVED`/`CLOSED` หรือ `CANCELLED` ใช้ Status Matrix และแสดง gate/conflict errors ตาม API contract; เป็น Ticket workflow ไม่ใช่สถานะ completion แยกของ Action
- ห้ามมี Delete action

### 2.4 Requester Ticket Detail

Requester อ่าน Actions ของ Ticket ตนเองได้ตาม visibility policy แต่ไม่เห็น edit/create controls และไม่เห็นข้อมูลภายในที่ไม่อนุญาต

## 3. Role Behavior

| Role | UI ที่เห็น |
|---|---|
| Requester | Requester Dashboard, Create Ticket, My Tickets, own Detail และ read-only Actions |
| IT Staff | Staff Dashboard, Staff Queue, Staff Detail และ Action create/edit |
| Administrator | Staff Dashboard เดียวกับ IT Staff, User Management, อ่าน Staff Detail และแก้ IT Priority ตาม Lab 3; สร้าง/แก้ Action ตาม Lab 4 แต่เปลี่ยน Ticket status, assignment, Public Comment หรือ Internal Note ไม่ได้ |

บน Ticket ที่อยู่ RESOLVED ผู้มีสิทธิ์ยังแก้ follow-up เพื่อเตรียม CLOSED ได้; Ticket ที่ CLOSED หรือ CANCELLED เป็น read-only สำหรับ Action. หลัง CLOSED/RESOLVED ถูกเปิดกลับเป็น REOPENED แล้ว IT Staff เปลี่ยนต่อเป็น IN_PROGRESS ได้ตาม Status Matrix

Frontend restrictions ต้องมี Backend authorization รองรับเสมอ

## 4. Visual and Feedback States

ทุกหน้าจอใหม่ต้องกำหนด:

- loading indicator
- empty/no-results
- validation message ใกล้ field
- forbidden message ที่ไม่เปิดเผยข้อมูล
- conflict message พร้อม reload และ explicit retry ที่ปลอดภัยหลังผู้ใช้ตรวจข้อมูลล่าสุด
- safe failure
- success feedback ผ่าน aria-live หรือ role=status
- saving guard ป้องกัน double submit
- หากคำขอหมดเวลา/ตอบกลับไม่ชัดเจน ต้องคงข้อมูลในฟอร์มและเข้าสู่ submission-uncertain; UI ต้องอ่านรายการครบทุกหน้าและ refresh ก่อนให้ผู้ใช้ตัดสินใจสร้างใหม่. กรณีคำขอเดิมบันทึกสำเร็จภายหลัง ให้แสดง Action ที่โหลดพบเป็น candidate แต่ไม่ยืนยันว่าเป็นผลของคำขอเดิมหรือแจ้ง success โดยอัตโนมัติ; ห้าม retry อัตโนมัติและเตือนความเสี่ยงรายการซ้ำ

## 5. Responsive Rules

- Desktop >= 992px: dashboard cards และ content columns ที่อ่านง่าย
- Tablet 768–991px: cards/columns ปรับตามพื้นที่; ห้าม page-level horizontal overflow
- Mobile < 768px: cards และ form หนึ่งคอลัมน์; action buttons ยังกดได้สะดวก
- ตารางหรือรายการที่กว้างให้เลื่อนภายใน container เท่านั้น
- ห้าม label, metric, Action result หรือ attachment note ถูกตัด/ซ้อน

## 6. Accessibility Rules

- ทุก input มี visible label
- Validation error เชื่อมด้วย aria-describedby
- Focus มองเห็นได้หลัง Tab
- ลำดับ keyboard เป็นธรรมชาติ
- Button มี accessible name
- Metric และ status อ่านได้โดยไม่ใช้สีเพียงอย่างเดียว
- Private/Internal content มีข้อความอธิบายชัดเจน
- Loading/saving ใช้ role=status หรือ aria-live
- Lists/tables/cards ใช้ semantic structure เหมาะสม

## 7. ผลตรวจ Visual และ Accessibility

ตรวจ Product main `08328cd` วันที่ 12 ตุลาคม 2026 ด้วย Chromium ร่วมกับ component tests, browser assertions และภาพตัวแทน

- [x] ใช้ Zen Green และรูปแบบ controls เดียวกับหน้าจอเดิม
- [x] Dashboard มี label/value, role navigation และ drill-down ที่ตรงกับข้อมูล Backend
- [x] Actions Taken แยก Ticket Owner, performer และ read-only fields; มี create/edit และรายการ 0/1/หลาย Actions
- [x] Requester อ่าน shared content และ Actions ของตนเอง โดยไม่มี editor หรือ Internal Notes
- [x] Status, priority และ follow-up มีข้อความกำกับ ไม่สื่อด้วยสีเพียงอย่างเดียว
- [x] Loading, empty, forbidden, validation, conflict และ safe failure แสดงถูกต้องและคงข้อมูลฟอร์มเมื่อแก้ไขได้
- [x] Keyboard operation, visible focus, labels และ error associations ผ่านการตรวจ
- [x] Desktop 1440×1000, tablet 820×1180 และ mobile 375×812 ไม่มี clipping, overlap หรือ page-level horizontal overflow ในขอบเขตที่ตรวจ
- [x] ภาพตัวแทนที่ตรวจอ่านได้ และแสดง fields/controls ที่เกี่ยวข้อง

กรณี failure/forbidden บางภาพใช้ controlled responses ส่วน Requester empty ใช้บัญชีไม่มี Ticket จริง การตรวจนี้ไม่ใช่ WCAG certification หรือการรับรองทุก browser/device ผลและขอบเขตการทดสอบอยู่ใน `tests.md` ข้อ 5

## 8. ภาพประกอบ

ภาพหลักเก็บจากรอบ hardening; Product และ browser tests ไม่เปลี่ยนจาก `af6fe86` ถึง final main `08328cd` และมีผลทดสอบ main แยกใน tests.md

| หน้าจอ | ที่เก็บภาพ | เนื้อหา |
|---|---|---|
| Staff Dashboard | `artifacts/lab-04/screenshots/staff-dashboard/` | Metrics, current-user Actions, populated/empty/forbidden/failure และ desktop/tablet/mobile |
| Requester Dashboard | `artifacts/lab-04/screenshots/requester-dashboard/` | Owned metrics, recent Tickets, empty state และ desktop/tablet/mobile |
| Actions Taken / Workflow | `artifacts/lab-04/screenshots/actions-taken/` | Create validation, edit, follow-up, workflow และภาพฟอร์ม/controls |
| การทำงานเดิม | `artifacts/lab-04/screenshots/regression-lab-03/` | Authentication, Queue/Detail และ User Management ที่ตรวจต่อเนื่องใน Lab 4 |
| หลาย Actions และ Requester read-only | `artifacts/lab-04/evidence/final-main/08328cd/supplemental/screenshots/actions-taken/` | ภาพเสริมจาก final Product: สาม Actions, performer ต่างจาก Owner, shared content และ Requester read-only ทั้งสามขนาด |

ภาพเสริมมีผลทดสอบแยกจาก original-main suite และใช้ helper ตรวจ accessible name ของ native file input ตาม provenance ใน `supplemental/run.json` ไม่เปลี่ยน Product
