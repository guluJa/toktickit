# TokTickIT Lab 4: ข้อกำหนดระบบและเกณฑ์รับงาน

สถานะ: Contract ผ่าน review ใน PR #68; implementation และ hardening merge ครบใน PR #75–#79 กำลังตรวจ Release candidate ของ Issue #74; Final-main ยัง Pending
แหล่งอ้างอิง: SE Lab 4 Labsheet และผลตรวจ Lab 3 main
Baseline ที่ตรวจแล้ว: main commit da82338; executable Lab 3 verification commit 8755d21

เอกสารนี้กำหนดพฤติกรรมที่ต้องส่งใน Lab 4 ผลตรวจระหว่างพัฒนาบันทึกแยกใน `tests.md` และสถานะรีวิวบันทึกใน `reviewer.md` การ merge งานบางส่วนยังไม่ถือว่า Product Definition of Done หรือ Final-main ผ่านแล้ว

## 1. เป้าหมายของ Lab 4

ต่อยอด TokTickIT ให้รองรับการบันทึก Actions Taken ใต้ Ticket, Dashboard ตาม Role และ Ticket workflow ที่ตรวจสอบได้ โดยไม่ทำลาย Authentication, Authorization, Ticket, Attachment, Comment, Internal Note และ Regression behavior จาก Lab 1–3

## 2. ความต้องการของผู้ใช้

- IT Staff และ Administrator ที่มีสิทธิ์สามารถสร้างและแก้ไข Actions Taken ของ Ticket ได้
- Ticket หนึ่งรายการมี Actions Taken ได้ศูนย์ หนึ่ง หรือหลายรายการ
- Ticket มี Primary Owner ได้หนึ่งคน แต่ผู้ปฏิบัติงานของ Action อาจเป็น IT Staff คนอื่น
- Requester เห็นข้อมูลของ Ticket ของตนเองตามสิทธิ์ แต่ไม่สร้างหรือแก้ไข Action
- Requester ระบุได้ว่าปัญหาดูเหมือนแก้แล้ว แต่ไม่เปลี่ยน Formal Ticket Status
- ต้องมี Dashboard สำหรับ Requester และ IT Staff/Administrator
- Dashboard ต้องสรุปข้อมูลจาก Backend และเชื่อมไปยังหน้ารายละเอียดได้

## 3. ขอบเขตงาน

### งานที่รวมใน Lab 4

- ActionTaken model, additive migration, seed และ regression
- Action list/create/update พร้อม validation, authorization และ conflict handling
- Ticket workflow และ resolution gate
- Requester, IT Staff และ Administrator dashboard metrics
- Dashboard drill-down, loading, empty, forbidden และ safe failure
- Responsive/accessibility/Zen Green extension
- Unit, API, UI, workflow, migration, performance-smoke, responsive และ E2E tests
- Lab 1–3 regression และ Final-main evidence

### งานที่ไม่รวมใน Lab 4

- SLA clock, escalation engine และ on-call scheduling
- Email, SMS, LINE, push notification, MFA, SSO และ self-registration
- Inventory, purchasing, payroll, billing และ multi-tenant operation
- User deletion, bulk import/export และ cloud deployment
- Feature ที่ไม่อยู่ใน Contract หรือ Issue ที่ได้รับอนุมัติ

### 3.1 ข้อกำหนดการทำงาน (FR)

| ID | Requirement | Trace to AC |
|---|---|---|
| FR-01 | Ticket รองรับ Actions Taken แบบ zero/one/many พร้อม owner, performer, follow-up และ attachment notes | AC-01–AC-05 |
| FR-02 | Backend บังคับใช้สิทธิ์ Requester, IT Staff และ Administrator | AC-02, AC-03, AC-15 |
| FR-03 | Ticket workflow ใช้ Status Matrix และ Resolution Gate ที่ตรวจสอบได้ | AC-06, AC-07 |
| FR-04 | Action และ Status update รองรับ optimistic concurrency และ safe conflict | AC-08 |
| FR-05 | Requester และ Staff/Admin Dashboard แสดง metrics และ drill-down ตามสิทธิ์ | AC-09, AC-10 |
| FR-06 | Migration, legacy preservation, seed และ recovery safety ทำงานแบบ additive | AC-11 |
| FR-07 | UI มี loading, empty, forbidden, validation, conflict, responsive, accessibility และ recoverable-save states | AC-13, AC-14, AC-16 |
| FR-08 | Regression ของ Lab 1–3 ไม่ถูกทำลาย | AC-15 |
| FR-09 | การส่ง Action ซ้ำจากการกดซ้ำหรือ recoverable network failure ต้องถูกป้องกันหรือจัดการอย่างปลอดภัย | AC-16 |

### 3.2 กฎการทำงาน (BR)

| ID | Rule | Trace to AC |
|---|---|---|
| BR-01 | Action แต่ละรายการอยู่ใต้ Ticket เดียวผ่าน `ticketId`; `performedById` มาจาก session ของผู้สร้างและห้ามรับจาก Client | AC-01, AC-02 |
| BR-02 | `Ticket.ownerId` เป็น Primary Owner เดียวของ Ticket; Assignment/reassignment ยังคงใช้กติกา Lab 3 และไม่สร้าง Owner ซ้ำใน Action | AC-01, AC-15 |
| BR-03 | Action ที่ `followUpRequired=true` ถือว่ายังมีงานค้าง; ไม่ขวาง RESOLVED แต่ขวาง CLOSED จนกว่าจะเคลียร์ follow-up และยังแก้ Action บน RESOLVED ได้ | AC-05, AC-07 |
| BR-04 | `RESOLVED/CLOSED → REOPENED` ต้องมี `reopenReason` ที่ trim แล้วไม่ว่าง | AC-06 |
| BR-05 | Action ใช้ `ActionTaken.version`; Status workflow ใช้ `Ticket.version`; Backend ต้องตรวจ conflict แบบ atomic และห้ามเกิด partial write โดยกลไกฐานข้อมูลจริงเป็น implementation decision | AC-08 |
| BR-06 | Dashboard เก็บเวลาเป็น UTC, ใช้ Asia/Bangkok กับช่วง 7 วัน, จำกัด limit 1–100 และเรียงรายการด้วย tie-breaker ที่กำหนด | AC-09, AC-10 |
| BR-07 | Action ไม่มี Delete, ไม่มี separate completion state และไม่มี edit-history model เพิ่มใน Lab 4; ใช้ `updatedAt/version` เท่านั้น. Comments/Internal Notes ของ Lab 3 ยังคง append-only; การแก้ Action ไม่ลบหรือ reorder รายการ | AC-04, AC-08, AC-15 |
| BR-08 | ระหว่างการบันทึกต้องมี saving guard; เมื่อผล POST ไม่ทราบแน่ชัดต้องคง submission-uncertain และอ่าน Action ทุกหน้าตาม pagination ก่อนให้ผู้ใช้ตัดสินใจ การพบข้อความเหมือนกันไม่พิสูจน์ว่าเป็นคำขอเดิม ห้ามแจ้งสำเร็จหรือ retry อัตโนมัติ และไม่รับรอง server-side deduplication | AC-16 |

## 4. ข้อมูลและความสัมพันธ์

### 4.1 Fields ของ ActionTaken

ชื่อ Prisma model: `ActionTaken`; ผู้ปฏิบัติงานอ้างถึง `RequesterUser` ตาม model เดิม

| Field | Rule |
|---|---|
| id | Primary key |
| ticketId | Required foreign key ไปยัง Ticket |
| actionAt | Required server timestamp; เก็บเป็น UTC |
| description | Required trimmed text; ห้ามว่าง |
| result | Required trimmed text; ห้ามว่าง |
| performedById | Required; ได้จาก authenticated session เท่านั้น |
| followUpRequired | Required Boolean |
| followUpNote | เมื่อ followUpRequired เป็น true ต้องเป็นข้อความที่ trim แล้วไม่ว่าง; เมื่อเป็น false ต้องเป็น `null` |
| attachmentNotes | Optional trimmed text; เป็นคำอธิบายไฟล์/รูปที่ควรตรวจ ไม่ใช่การ upload ใหม่โดยอัตโนมัติ |
| createdAt | Server-managed timestamp |
| updatedAt | Server-managed timestamp |
| version | Backend-managed optimistic-concurrency value; เริ่มที่ 1 และเพิ่มทีละหนึ่งเมื่อ update |

Primary Ticket Owner ใช้ Ticket.ownerId เดิมและไม่ทำซ้ำใน ActionTaken เพื่อไม่ให้ข้อมูล Owner สองชุดขัดกัน การตอบกลับ API แสดง ticketOwner เป็นข้อมูลอ่านอย่างเดียว และแสดง performedBy จาก ActionTaken

`id`, `ticketId`, `performedById` และ `version` ใช้ Prisma `Int` ซึ่งตรงกับ PostgreSQL `INTEGER`; ค่าที่ Client ส่งต้องอยู่ในช่วง 1–2147483647 เวลาของ Action ใช้ Prisma `DateTime @db.Timestamp(3)` และเก็บเป็น UTC ส่วนข้อความใช้ `String @db.Text` โดย notes เป็น nullable และ `followUpRequired` เป็น Boolean

เหตุผลการออกแบบฐานข้อมูล:

1. เก็บ Primary Owner ที่ `Ticket.ownerId` เพียงจุดเดียว และเก็บผู้สร้าง Action ที่ `performedById` ซึ่งอาจเป็นคนละคนกัน วิธีนี้ลดข้อมูล Owner ซ้ำและรักษาความสัมพันธ์เดิม
2. ใช้ foreign key ไปยัง `Ticket.id` และ `RequesterUser.id` พร้อม `onDelete: Restrict` เพื่อไม่ให้การลบ parent ทำให้หลักฐาน Actions หาย ส่วน `version` ใช้ตรวจการแก้ข้อมูลเก่าโดยไม่ใช้เวลาจาก Client
3. ใช้ index `(ticketId, actionAt, id)` สำหรับรายการใต้ Ticket และ `(performedById, actionAt, id)` สำหรับรายการของผู้ปฏิบัติงาน ส่วน Dashboard ใช้ index ของ Ticket เดิมตาม owner/status/updatedAt แล้วตรวจ performance ใน Issue #72

### 4.2 Zero/one/many behavior

- Ticket ที่ไม่มี Action แสดง empty state และยังเปิดดู Ticket ได้
- Ticket ที่มีหนึ่ง Action แสดงรายการเดียวพร้อมรายละเอียดครบ
- Ticket ที่มีหลาย Action เรียงตาม actionAt จากเก่าไปใหม่ โดยใช้ id เป็น tie-breaker
- ห้ามลบ Action หรือจัดลำดับใหม่จาก Client
- การ Update แก้ fields ที่อนุญาตโดยคง ID, ผู้สร้าง และเวลา Action เดิม; ระบบไม่ได้เก็บข้อความก่อนแก้เป็น edit history

การแก้ Action ไม่ใช่การทำเครื่องหมาย completion แยกต่างหาก; สถานะการติดตามงานใช้ `followUpRequired` และ `followUpNote` เท่านั้น

### 4.3 Ticket workflow version

`Ticket.version` เป็นค่า integer ที่ Backend จัดการสำหรับ optimistic concurrency ของ Status workflow โดยเริ่มที่ `1` สำหรับ Ticket เดิมและ Ticket ใหม่ และเพิ่มทีละหนึ่งเมื่อ Status update สำเร็จ การเปลี่ยน Status ต้องตรวจ `Ticket.version` ใน transaction เดียวกับ transition; ค่าเก่าห้ามเขียนทับข้อมูลใหม่

## 5. Role and Authorization Contract

Backend เป็นผู้ตัดสินสิทธิ์ขั้นสุดท้าย การซ่อนหรือ disable control ใน Client เป็นเพียง usability

| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| อ่าน Action ของ Ticket ตนเอง | ได้ | ไม่ใช้ route นี้ | ไม่ใช้ route นี้ |
| อ่าน Action ใน Staff Ticket Detail | ไม่ได้ | ได้ตาม Ticket access | ได้แบบอ่าน |
| สร้าง Action | ไม่ได้ | ได้ตาม Ticket access | ได้ตาม Ticket access |
| แก้ Action | ไม่ได้ | ได้ตาม policy และ version | ได้ตาม policy และ version |
| ลบ Action | ไม่ได้ | ไม่ได้ | ไม่ได้ |
| เปลี่ยน Ticket status | ไม่ได้ | ได้ตาม matrix | คงสิทธิ์ Lab 3: ไม่ได้ จนกว่าจะอนุมัติการเปลี่ยน |
| แก้ IT Priority | ไม่ได้ | ได้ | ได้ |
| Assignment/เปลี่ยน Owner | ไม่ได้ | ได้ตาม Lab 3 และต้องเลือกผู้ใช้ active | ไม่ได้ตาม Lab 3 |
| ดู Dashboard ของตนเอง | ได้เฉพาะ Requester | ได้เฉพาะ Staff | ได้เฉพาะ Admin/Staff metrics |

ทุก Action ต้องตรวจ session, active user, role, Ticket access และ ownership policy ใน Backend

## 6. Ticket Status Transition Matrix

ตารางนี้เริ่มจาก Matrix ของ Lab 3 และเพิ่มเฉพาะ `REOPENED → IN_PROGRESS` ที่จำเป็นต่อ lifecycle ของ Lab 4; ทุก transition ต้องมี Test ครบ

| From | To ที่อนุญาต | Actor | เงื่อนไข |
|---|---|---|---|
| NEW | OPEN | IT Staff | Ticket มีข้อมูลถูกต้องและเข้าถึงได้ |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED | IT Staff | ต้องเป็น transition ที่ policy อนุญาต |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED | IT Staff | RESOLVED ต้องผ่าน resolution gate |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED | IT Staff | ต้องตรวจข้อมูล Requester/Action ตาม gate |
| RESOLVED | CLOSED, REOPENED | IT Staff | RESOLVED ยังแก้ follow-up ได้; CLOSED ต้องไม่มี Action ที่ยัง `followUpRequired=true` และต้องไม่ขัดกับ conflict หรือ stale update |
| CLOSED | REOPENED | IT Staff | ต้องส่ง `reopenReason` ที่ trim แล้วไม่ว่าง |
| REOPENED | IN_PROGRESS | IT Staff | ใช้ Ticket.version ล่าสุดและเข้าถึง Ticket ได้; เป็นทางกลับเข้าสู่การดำเนินงานหลังการเปิดกลับ |
| CANCELLED | ไม่มี | ไม่มี | Terminal state |

Transition ที่ไม่อยู่ในตารางตอบ 409 STATUS_TRANSITION_NOT_ALLOWED และต้องไม่เปลี่ยนข้อมูล

ใน Contract นี้ `CLOSED` และ `CANCELLED` เป็น terminal สำหรับการแก้ Action; `RESOLVED` ยังเป็นสถานะที่ Staff/Admin แก้ follow-up ได้ก่อนขอ CLOSED. การเพิ่ม `REOPENED → IN_PROGRESS` เป็นการปรับ Status Matrix ที่ Labsheet Lab 4 ขอให้กำหนดเพื่อให้ lifecycle เดินต่อได้ ไม่ใช่การสร้าง feature นอก Issue #67; route เดิมและสิทธิ์ Backend ของ Lab 3 ยังคงใช้

## 7. Resolution Gate and Conflict

### 7.1 Requester indication

Requester endpoint สำหรับ Problem Appears Resolved บันทึก requesterResolvedAt เท่านั้น ไม่เปลี่ยน currentStatus

### 7.2 Resolution gate

ก่อน IT Staff เปลี่ยนเป็น RESOLVED ต้องมี:

- Current status เป็น IN_PROGRESS หรือ WAITING_FOR_REQUESTER
- Ticket ต้องมี Primary Owner ที่ active เสมอ โดย `ownerId` ต้องอ้างถึงผู้ใช้ที่ active และเป็น role ที่ Lab 3 อนุญาตให้เป็น Ticket owner
- มี ActionTaken อย่างน้อยหนึ่งรายการที่มี description และ result ครบ
- `RESOLVED` ทำได้เมื่อมี Action อย่างน้อยหนึ่งรายการที่มี description และ result ครบ แม้บาง Action จะมี `followUpRequired=true`; ค่า true ยังคงแสดงว่างานติดตามยังค้างอยู่
- Request มี `Ticket.version` ล่าสุด

หาก gate ไม่ผ่านตอบ 409 RESOLUTION_GATE_FAILED

การเปลี่ยนเป็น CLOSED ทำได้เฉพาะจาก RESOLVED ตาม Status Matrix และต้องไม่มี Action ที่ยังมี follow-up ค้าง หากยังมีอย่างน้อยหนึ่งรายการเป็น `true` ให้ตอบ `409 RESOLUTION_GATE_FAILED`; Staff ต้องแก้ Action เป็น `false` พร้อม `followUpNote=null` ก่อน retry

### 7.3 Stale update

Client ต้องส่ง `ActionTaken.version` เมื่อ Update Action และส่ง `Ticket.version` เมื่อเปลี่ยน workflow หาก version ไม่ตรงกับ Database:

การสร้าง/แก้ Action และการเปลี่ยน Status ของ Ticket เดียวกันต้องถูกประมวลผลแบบ atomic โดยตรวจ gate/version ก่อนยืนยันผลลัพธ์ หาก Ticket กลายเป็น CLOSED หรือ CANCELLED ก่อน Action mutation จะยืนยันผล ให้ตอบ `409 ACTION_STATE_CONFLICT` และไม่เขียน Action; หาก Action mutation ยืนยันผลก่อน Status mutation ต้องอ่านข้อมูล Action ล่าสุดและประเมิน Resolution Gate ใหม่ กลไกที่ใช้ทำให้ atomic เป็น implementation decision และไม่กำหนดวิธีฐานข้อมูลเฉพาะ

- ตอบ 409 STALE_UPDATE
- ไม่เขียนทับข้อมูลใหม่
- ให้ Client โหลด version และข้อมูลล่าสุดจาก GET รายการ Actions หรือ Ticket Detail ตาม resource ที่เกิด conflict; ไม่ต้องคาดเดา version จากเวลา `updatedAt`
- Client ต้องแสดง conflict state และให้ผู้ใช้โหลดข้อมูลใหม่

## 8. Dashboard Contract

ฐานเวลา: เก็บ timestamp ใน UTC; API รับ/ส่ง ISO 8601; การคำนวณ “วันนี้” ใช้ timezone Asia/Bangkok และช่วงเวลาแบบ half-open [start, end)

### 8.1 Requester metrics

- openCount: Ticket ของ Requester ที่อยู่ใน NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER หรือ REOPENED
- waitingForRequesterCount: Ticket ที่ currentStatus เป็น WAITING_FOR_REQUESTER
- resolvedCount: Ticket ที่ currentStatus เป็น RESOLVED หรือ CLOSED
- recentlyUpdatedCount: จำนวน Ticket ของ Requester ที่ updatedAt อยู่ในช่วง 7 วันล่าสุด
- recentTickets: รายการของ `recentlyUpdatedCount` สำหรับ drill-down
- recentlyResolvedCount: Ticket ที่ currentStatus เป็น RESOLVED หรือ CLOSED และ updatedAt อยู่ในช่วง 7 วันล่าสุด
- recentlyResolvedTickets: รายการ Ticket ที่เข้าเงื่อนไข recentlyResolvedCount สำหรับ drill-down
- recentlyUpdated ใช้ช่วงคงที่ `[asOf - 7 days, asOf)` ใน Asia/Bangkok; รายการ `recentTickets` และ `recentlyResolvedTickets` เรียง `updatedAt DESC, id DESC` จำกัดค่าเริ่มต้น 20 รายการ และไม่เกิน 100 รายการ
- drillDown: ส่ง ticketId ไป Detail หรือ query ของ My Tickets เดิม (`currentStatus`, `sortDirection`, `pageSize=10`) โดยไม่เปลี่ยน API/response เดิม; ลิงก์หลายสถานะแยกตามสถานะ

### 8.2 Staff metrics

- สำหรับ Dashboard ให้ถือ `RESOLVED`, `CLOSED` และ `CANCELLED` เป็นสถานะที่ไม่ใช่งานเปิด แม้ `RESOLVED` จะยังอนุญาตให้แก้ follow-up ใน Ticket Detail ได้
- unassignedCount: Ticket ที่ ownerId เป็น null และไม่ใช่ RESOLVED/CANCELLED/CLOSED
- mineCount: Ticket ที่ ownerId เท่ากับ authenticated Staff และไม่ใช่ RESOLVED/CANCELLED/CLOSED
- byStatus: จำนวน Ticket ที่ Staff เห็นได้ แยกตาม TicketStatus; ต้องคืน key ของทุก status ที่กำหนดพร้อมค่า 0 เมื่อไม่มีข้อมูล
- byPriority: จำนวน Ticket ที่ Staff เห็นได้ แยกตาม IT Priority; ต้องคืน `LOW`, `MEDIUM`, `HIGH` พร้อมค่า 0 เมื่อไม่มีข้อมูล
- highPriorityCount: Ticket ที่ IT Priority เป็น HIGH และไม่ใช่ RESOLVED/CANCELLED/CLOSED
- recentlyUpdatedCount: จำนวน Ticket ที่ updatedAt อยู่ในช่วง 7 วันล่าสุด
- recentTickets: รายการ Ticket ของช่วง recentlyUpdated สำหรับ drill-down
- recentlyResolvedCount: Ticket ที่ currentStatus เป็น RESOLVED หรือ CLOSED และ `updatedAt` อยู่ในช่วง 7 วันล่าสุด
- recentlyResolvedTickets: รายการตาม metric เดียวกัน
- recentActions: Actions Taken ของผู้ใช้ที่ authenticate อยู่ (`performedById` เท่ากับ session user) และ `actionAt` อยู่ในช่วง 7 วันล่าสุด
- recentTickets และ recentlyResolvedTickets เรียง `updatedAt DESC, id DESC` จำกัดค่าเริ่มต้น 20 รายการและไม่เกิน 100 รายการ; เมื่อไม่มีข้อมูลให้คืนรายการว่างและค่า metric เป็น 0
- recentActions เรียง `actionAt DESC, id DESC` ใช้ limit เดียวกัน และคืนรายการว่างเมื่อไม่มีข้อมูล
- drillDown: Dashboard link object ไปยัง Queue query เดิม (`status`, `sortOrder`, `pageSize=10`) สำหรับรายการคิว และไปยัง Staff Ticket Detail ด้วย `ticketId` สำหรับ Ticket/Action ทุกแถว; Queue `pageSize` ไม่ขึ้นกับ Dashboard `limit` และ Queue ที่ไม่มีตัวกรองเวลาอาจแสดงรายการกว้างกว่า metric 7 วัน

### 8.3 Administrator metrics

Administrator อ่าน Staff metrics ชุดเดียวกับ IT Staff ผ่าน `/api/staff/dashboard`; ไม่เพิ่ม activeUserCount หรือ route ใหม่ใน Lab 4 นี้

ทุก Dashboard ต้องมี metric definitions ใน API spec, empty state เมื่อค่าเป็นศูนย์ และไม่ส่งข้อมูล Ticket ที่ Role ไม่มีสิทธิ์

## 9. Migration, Legacy Data, Seed and Recovery

- ใช้ additive migration เท่านั้น ห้าม reset หรือลบฐานข้อมูลเดิม
- Ticket, User, Attachment, Comment และ Internal Note เดิมต้องรักษา ID และ foreign key
- Migration ต้องเพิ่ม `Ticket.version` แบบ additive และ backfill Ticket เดิมเป็น `1` โดยไม่เปลี่ยน ID หรือข้อมูลธุรกิจเดิม
- Ticket เดิมที่ไม่มี Action ถือเป็น valid zero-action state ไม่สร้าง Action ปลอมโดยไม่มีเหตุผล
- เพิ่ม index สำหรับ ticketId, actionAt, performedById และ dashboard query ที่จำเป็นตามชนิดข้อมูลในข้อ 4.1
- Seed ต้อง idempotent และสร้าง Action fixtures แบบ 0/1/many
- Seed ต้องมี Ticket หลาย Status, Priority, owner/unassigned และ Dashboard metric ที่ทั้งศูนย์และไม่ศูนย์
- Migration preservation และ repeated seed เป็นคนละการตรวจ Seed ปัจจุบันสืบทอดการอัปเดต named fixtures ของ Lab 3 ซึ่งอาจคืน name/role/owner/priority และข้อความให้เป็นค่าตัวอย่าง จึงไม่ใช้ผล seed ซ้ำเป็นหลักฐานว่าค่าที่ผู้ใช้แก้ใน Development จะไม่เปลี่ยน การขยาย fixtures ใน Issues #71–#72 ต้องแยกข้อมูลตัวอย่างใหม่และตรวจผลกระทบต่อข้อมูลเดิม
- Migration test ต้องตรวจ preserved IDs, row counts, foreign keys, Action references, `Ticket.version` และ repeated seed
- Recovery plan ต้อง backup ฐานข้อมูล E2E ก่อน migration, ตรวจ precondition และหยุดก่อนเขียนเมื่อไม่ผ่าน; หาก verification ล้มเหลวให้ restore backup, ตรวจ row count/foreign key/version และบันทึกผลก่อน retry. ห้ามใช้ Development database เป็นพื้นที่ recovery
- Backup/restore เป็นหลักฐานและขั้นตอนตรวจสอบฐานข้อมูล E2E แบบแยก ไม่ใช่ Product API หรือการอนุญาตให้ใช้ `prisma migrate reset` กับ Development database

## 10. Acceptance Criteria

- AC-01: IT Staff ที่มีสิทธิ์สร้าง ActionTaken ใต้ Ticket ที่ถูกต้องได้ โดย performer มาจาก session
- AC-02: Administrator สร้างและแก้ Action ตาม policy ได้ แต่ไม่สามารถลบหรือปลอม performer
- AC-03: Requester อ่าน Action ของ Ticket ตนเองได้ตาม field visibility และแก้ไม่ได้
- AC-04: Ticket รองรับ zero, one และ many Actions พร้อมลำดับที่เสถียร
- AC-05: Follow-Up Required บังคับ Follow-Up Note ตาม validation rule
- AC-06: Ticket status ทุก transition ผ่าน Matrix รวม `REOPENED → IN_PROGRESS` และ transition ที่ไม่อนุญาตตอบ 409
- AC-07: RESOLVED ผ่าน resolution gate และ Requester indication ไม่เปลี่ยน formal status; CLOSED ปฏิเสธเมื่อยังมี follow-up ค้าง
- AC-08: Stale update ตอบ 409 และไม่เขียนทับข้อมูลใหม่
- AC-09: Requester Dashboard คืนเฉพาะ metrics/Tickets ของ Requester ปัจจุบัน
- AC-10: Staff/Admin Dashboard ใช้สูตรที่ระบุและ drill-down ได้
- AC-11: Migration รักษา Lab 3 data และ seed ซ้ำได้โดยไม่ซ้ำ/หาย
- AC-12: API มี request/response shape, status code และ safe error ตาม api-spec.md
- AC-13: UI ครบ loading, empty, forbidden, validation, conflict และ safe failure
- AC-14: UI ผ่าน responsive, keyboard focus, labels, semantics และ non-color cues
- AC-15: Regression ของ Lab 1–3 ผ่านและไม่มี feature เดิมเสีย
- AC-16: การกดบันทึกซ้ำหรือ recoverable network failure ไม่ทำให้ผู้ใช้สูญเสียข้อมูลที่กรอก; เมื่อผล POST ไม่ทราบแน่ชัด UI ต้องคงฟอร์มและ submission-uncertain, ตรวจ Actions ครบทุกหน้ารวมการ refresh เมื่อคำขอเดิมอาจบันทึกภายหลัง, ไม่ถือว่าข้อความเหมือนกันเป็นหลักฐานยืนยัน, ไม่แจ้งสำเร็จหรือ retry อัตโนมัติ และเตือนความเสี่ยงรายการซ้ำก่อนผู้ใช้เลือกสร้างใหม่; Contract นี้ไม่รับรอง Idempotency-Key หรือการรวมคำขอซ้ำใน Backend

คอลัมน์ Final ของ AC-01 ถึง AC-16 ยังเป็น Planned ผลระหว่างพัฒนาอยู่ใน `tests.md` ข้อ 7–16; PR #79 ผ่าน Peer Review และ merge แล้ว ผล Release candidate จาก staging `3b7291e` อยู่ในข้อ 17 โดยไม่ใช้แทน Final-main ของ Issue #74

## 11. Product Definition of Done

- Contract, API spec, UI spec และ Test Plan ผ่านการทบทวนก่อน implementation
- Additive migration, legacy preservation และ idempotent seed ผ่านจริง
- Backend authorization ครบทุก protected Action, Dashboard และ workflow route
- ทุก AC เชื่อมกับ test file จริงและผล Final-main
- Server, Client, build, migration, performance-smoke, responsive และ E2E ผ่าน
- Reviewer record มี comment, response, approval และ merge SHA ที่เกิดขึ้นจริง
- AI-use บันทึกเฉพาะ Prompt ที่ใช้จริง
- ไม่มี secret, credential, cookie, token หรือ database URL ใน Repository/evidence
- Final PDF ใช้ Answer Part 1–9 และ working links ตาม Labsheet

สถานะ DoD ปัจจุบัน: Planned; ยังไม่มี Final Result

## 12. Assumptions and Open Decisions

ค่าช่วงเวลา 7 วัน, timezone `Asia/Bangkok`, limit และ Resolution Gate เป็นการตัดสินใจของ Contract ที่ผ่าน peer review ไม่ใช่ค่าที่ Labsheet กำหนดตายตัว

Labsheet ข้อ 8.3 กำหนด Action fields และ create/view/edit ชัดเจน แต่ rubric Answer Part 6 ใช้คำว่า assign/complete/cancel และ inactive-assignee rejection ส่วน Part 7 ใช้ append-only โดยไม่ได้แจกแจง Action lifecycle เพิ่ม Contract นี้ผูก assign/inactive-assignee กับ Ticket Owner ของ Lab 3, complete/cancel กับ Ticket Status ของ Issue #71 และคง Comments/Internal Notes แบบ append-only; Actions แก้ fields ได้แต่ลบหรือเปลี่ยนผู้สร้างไม่ได้ตามข้อ 4.1–4.2 นี่เป็นการตีความที่ผ่าน peer review ใน PR #68 ไม่ใช่ข้อยืนยันจากอาจารย์/TA หรือคำรับรองคะแนน ให้สาธิตแต่ละรายการตามการจับคู่นี้ใน Issue #73 และอธิบายตรงกันในรายงาน

- Assumption A-01: ActionTaken ไม่มี ownerId ซ้ำกับ Ticket; owner ใช้ Ticket.ownerId และ performer ใช้ performedById
- Assumption A-02: Update Action อนุญาตให้แก้ข้อมูล แต่ห้ามลบและห้าม reorder
- Assumption A-03: ใช้ `ActionTaken.version` สำหรับ Action update และ `Ticket.version` สำหรับ Status workflow
- Decision D-01 (Lab 4): เพิ่ม `REOPENED → IN_PROGRESS` เพื่อให้ lifecycle เดินต่อได้ตามเป้าหมาย Lab 4; ใช้สิทธิ์ IT Staff, `Ticket.version` และ route เดิม. การเปลี่ยนนี้อยู่ใน Issue #67 Contract ไม่ใช่ implementation ของ Issue ถัดไป
- Decision D-02: Administrator ใช้สิทธิ์แบบ IT Staff เฉพาะขอบเขต Actions Taken ตาม Lab 4, อ่าน Staff Dashboard ได้ แต่ยังเปลี่ยน Ticket status ไม่ได้ตาม Lab 3 baseline
- Decision D-03 (resolved): RESOLVED ต้องมี Action ที่มี description/result ครบและยังแสดง follow-up ได้; CLOSED ต้องรอให้ทุก follow-up ถูกเคลียร์
- Decision D-04 (resolved): Dashboard ใช้ Asia/Bangkok, ช่วง 7 วันล่าสุด และช่วงเวลาแบบ [start, end)
- Decision D-05 (resolved): ใช้ `updatedAt` และ `version` สำหรับการแก้ไข/ตรวจ stale update; ไม่เพิ่ม edit-history model ใน Lab 4 นี้
- Decision D-06: ใช้ saving guard และ submission-uncertain/reconciliation flow; การเทียบเนื้อหา Action เป็นเพียง candidate ไม่ใช่หลักฐานของ POST เดิม จึงไม่แจ้งสำเร็จหรือ retry อัตโนมัติเมื่อไม่ทราบผลลัพธ์ และไม่กำหนด Idempotency-Key หรือ server-side deduplication เพราะ Labsheet กำหนด safe handling แต่ไม่กำหนดกลไกเฉพาะ
