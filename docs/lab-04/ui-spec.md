# TokTickIT Lab 4 UI Specification

สถานะ: Draft / Planned; ยังไม่มี Lab 4 UI ใน Source Code
Baseline: Zen Green, role navigation, accessibility และ responsive conventions จาก docs/lab-03/ui-spec.md

## 1. Application Shell

- แสดง authenticated user, role badge และ Logout
- แสดง Dashboard ตาม Role
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
- ลิงก์ Ticket และ Action ไป `/staff/tickets/:ticketId`; ลิงก์คิวใช้ query ที่กรองตาม metric
- Keyboard accessible controls

### 2.2 Requester Dashboard

โหมด:

- loading
- populated
- zero-ticket empty state
- failure

ต้องแสดงเฉพาะข้อมูลของ authenticated Requester และ drill-down ด้วย `ticketId` ไปยัง My Tickets/Detail เดิมของตนเอง

Metric ขั้นต่ำต้องมี Open Tickets, Waiting for Requester, Recently Updated และ Recently Resolved โดย Recently Resolved แสดงจำนวนและรายการ Ticket ที่เป็น RESOLVED/CLOSED และ updatedAt อยู่ในช่วงเวลาที่ Contract กำหนด

### 2.3 Actions Taken ใน Staff Ticket Detail

ต้องมี:

- รายการ Action เรียงตาม actionAt/id
- Empty state เมื่อไม่มี Action
- Create form
- Edit form
- Saving/success/failure
- Submission-uncertain เมื่อ timeout หรือไม่ทราบผล POST: คงข้อมูล, โหลดรายการ Actions ล่าสุดเพื่อ reconcile และห้าม retry POST อัตโนมัติ; ผู้ใช้ต้องยืนยันก่อนสร้างรายการใหม่
- Validation ของ description, result และ follow-up
- Conflict state เมื่อ version เก่า
- Performer read-only จาก session
- Ticket Owner read-only จาก Ticket
- Follow-Up Note
- Attachment Notes
- Status controls for complete (`RESOLVED`/`CLOSED`) and cancel (`CANCELLED`) follow the Matrix and show gate/conflict errors
- ห้ามมี Delete action

### 2.4 Requester Ticket Detail

Requester อ่าน Actions ของ Ticket ตนเองได้ตาม visibility policy แต่ไม่เห็น edit/create controls และไม่เห็นข้อมูลภายในที่ไม่อนุญาต

## 3. Role Behavior

| Role | UI ที่เห็น |
|---|---|
| Requester | Requester Dashboard, Create Ticket, My Tickets, own Detail และ read-only Actions |
| IT Staff | Staff Dashboard, Staff Queue, Staff Detail และ Action create/edit |
| Administrator | Staff Dashboard เดียวกับ IT Staff, User Management, Staff Detail read-only ตาม Lab 3 และ Action create/edit ตาม Lab 4 policy; เปลี่ยน Ticket status ไม่ได้ |

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
- หากคำขอหมดเวลา/ตอบกลับไม่ชัดเจน ต้องคงข้อมูลในฟอร์มและเข้าสู่ submission-uncertain; UI ต้อง reload รายการก่อนให้ผู้ใช้ยืนยันการส่งใหม่ และไม่อ้างว่า Backend รวมคำขอซ้ำให้เอง

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

สถานะเริ่มต้นทุกข้อ: Planned

- [ ] Zen Green tokens และ component conventions ต่อเนื่อง
- [ ] Dashboard navigation และ authenticated identity ถูกต้อง
- [ ] Metric cards มี label/value และ drill-down
- [ ] Actions Taken แยก owner, performer และ read-only fields ชัดเจน
- [ ] Status/priority/follow-up ใช้ text และ non-color cues
- [ ] Loading, empty, forbidden, validation, conflict และ failure อ่านง่าย
- [ ] Desktop/tablet/mobile ไม่มี clipping หรือ overlap
- [ ] ไม่มี page-level horizontal overflow
- [ ] Keyboard focus, labels, semantics และ aria-live ผ่านการตรวจจริง

## 8. Planned Evidence Paths

- artifacts/lab-04/screenshots/staff-dashboard/
- artifacts/lab-04/screenshots/requester-dashboard/
- artifacts/lab-04/screenshots/actions-taken/

ยังไม่มีภาพหรือผล visual inspection ของ Lab 4 จึงห้ามเปลี่ยน checklist เป็น Pass ก่อน Final-main run
