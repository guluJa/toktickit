# TokTickIT Lab 4: ข้อกำหนดหน้าจอ

สถานะ: Actions Taken UI, Workflow และ Dashboard merge แล้วใน PR #76/#77/#78; Full E2E/visual ของ Issue #73 อยู่ใน PR #79 และตรวจ Release candidate จาก staging ซ้ำแล้ว ผล Final-main ยัง Pending
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

ระหว่างโหลดไม่แสดงข้อมูลของคำขอก่อนหน้า ปุ่ม Refresh ถูกปิดขณะโหลด และผลตอบกลับเก่าต้องไม่ทับข้อมูลหลังเปลี่ยนผู้ใช้/Role ข้อผิดพลาดใช้ข้อความปลอดภัยพร้อม Retry/Refresh; forbidden ไม่แสดง metrics หรือรายการ Metric cards ใช้หนึ่งคอลัมน์บนมือถือ สองคอลัมน์บน tablet และสามคอลัมน์บน desktop พร้อม semantic headings, status/alert และ keyboard controls การตรวจภาพบน browser อยู่ใน Issue #73

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
- ปุ่มเปลี่ยน Ticket เป็น `RESOLVED`/`CLOSED` หรือ `CANCELLED` ใช้ Matrix และแสดง gate/conflict errors ใน Issue #71; ปุ่มเหล่านี้ไม่ได้เป็นสถานะ completion แยกของ Action
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

## 7. Visual Checklist

ตรวจบน feature working tree ของ Issue #73 จาก baseline `51bcf9c` วันที่ 4–5 ตุลาคม 2026; ไม่ใช่ checklist ของ Final-main ใช้ browser assertions ร่วมกับการตรวจภาพตัวแทนของฟอร์ม create/edit, Dashboard cards/empty/failure และ workflow แต่ละขนาด ไม่อ้างว่าตรวจภาพทุกไฟล์ด้วยตา หรือทำ WCAG certification

- [x] Zen Green tokens และ component conventions ต่อเนื่อง: STYLE-01 และภาพ metric/action panels
- [x] Dashboard navigation และ authenticated identity ถูกต้อง: E2E-03 ทั้ง Requester/IT Staff/Administrator รวมเมนูพับบน mobile
- [x] Metric cards มี label/value และ drill-down: API-05/06, E2E-03 และ `verification/dashboard-metrics.json`
- [x] Actions Taken แยก owner, performer และ read-only fields ชัดเจน: E2E-01, ภาพ `*-actions-panel.png`; Requester ไม่มี editor
- [x] Status/priority/follow-up ใช้ text และ non-color cues: STYLE-01, ภาพ workflow และ Dashboard breakdowns
- [x] Loading, empty, forbidden, validation, conflict และ failure อ่านง่าย: UI-01–05, AUTH-01 และ E2E-01–03; ภาพ Staff empty/failure เป็น controlled-response scenarios ตาม tests.md
- [x] Desktop/tablet/mobile ไม่มี clipping หรือ overlap ในหน้าจอที่ตรวจ: 1440×1000, 820×1180, 375×812; visual inspection และ browser button bounds/overlap checks
- [x] ไม่มี page-level horizontal overflow: browser assertions ทุก viewport ที่เก็บภาพ; container ที่ออกแบบให้ scroll แยกไม่ถือเป็น page overflow
- [x] Keyboard focus, labels, semantics และ error associations ผ่านการตรวจจริง: STYLE-01, Action description → Result/checkbox, Queue Search → Status และ keyboard Retry; เพิ่ม visible label ให้ Owner ID โดยไม่เปลี่ยน assignment behavior

Final-main visual checklist: Pending ต้องตรวจซ้ำหลัง Release ใน Issue #74

## 8. Evidence Paths ของ Issue #73

- artifacts/lab-04/screenshots/staff-dashboard/
- artifacts/lab-04/screenshots/requester-dashboard/
- artifacts/lab-04/screenshots/actions-taken/

ภาพเป็น native browser captures มีทั้งเต็มหน้าและภาพ panel/metrics ที่อ่านง่าย ไม่ใช้ภาพจากรุ่นเดิมอ้างแทนฟอร์มปัจจุบัน:

- Staff Dashboard: `populated-{desktop,tablet,mobile}.png`, ภาพ `*-metrics.png` และ `*-my-actions.png`; `empty-fixture-*`, `forbidden-mobile.png`, `safe-failure-mobile.png`
- Requester Dashboard: `populated-*`, `*-metrics.png` และ `empty-*` จาก Requester ที่ไม่มี Ticket จริง
- Actions Taken: `create-validation-*`, `edit-*` และ `workflow-reopen-*` พร้อม `*-actions-panel.png`; editor captures เห็น labels/fields/controls ไม่ใช่เฉพาะรายการ
- Regression รอบใหม่: `artifacts/lab-04/screenshots/regression-lab-03/` เก็บ authentication, queue/detail และ user management โดยไม่ทับภาพที่ส่งใน Lab 3

รายละเอียด viewport, controlled fault injection, console/network และขอบเขตการตรวจอยู่ใน tests.md ข้อ 16 ภาพชุดนี้เป็น feature-branch verification เดิมและไม่ถูกเขียนทับ ผล staging หลัง merge และภาพรอบใหม่อยู่ใน `artifacts/lab-04/release-candidate/3b7291e/` ตาม tests.md ข้อ 17 ส่วน Final-main ยัง Pending
