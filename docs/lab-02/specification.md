# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Lab 2 พัฒนา TokTickIT ให้เป็น Requester Ticketing MVP แบบ Full Stack ผู้ใช้เลือก Development Requester เพื่อจำลองตัวตนสำหรับการทดสอบ จากนั้นสามารถสร้าง IT Support Ticket พร้อมแนบไฟล์ รับ Official Ticket Number จาก Backend ค้นหาและเปิดดูเฉพาะ Ticket ของตนเอง รวมถึงดาวน์โหลดหรือ Soft-remove Attachment ตามสิทธิ์ความเป็นเจ้าของ ระบบใช้ Responsive Zen Green UI และมี Automated Tests ที่เชื่อมโยงกับ Acceptance Criteria เพื่อยืนยันการทำงานอย่างครบถ้วน

## 2. Stakeholder Request Interpretation

เนื่องจาก Authentication จริงจะพัฒนาใน Lab 3 ระบบจึงใช้ Development Requester เป็นบริบทชั่วคราวสำหรับการทดสอบ ผู้ใช้ต้องสร้างและติดตามได้เฉพาะ Ticket ของ Requester ที่เลือก ข้อมูล Ticket, Reference Data และ Attachment Metadata เก็บใน PostgreSQL ขณะที่ Backend รับผิดชอบการสร้างค่าของระบบ ตรวจสอบ Validation ป้องกันการส่งข้อมูลซ้ำ และบังคับใช้ Ownership ทุกครั้ง ส่วน UI ต้องสื่อสารสถานะ Loading, Empty, No-results, Validation, Success และ Failure อย่างชัดเจนบน Desktop, Tablet และ Mobile

## 3. Scope

### Included

- Development Requester Selection และ Change Requester สำหรับการทดสอบ
- Create Ticket พร้อม Category, Related System, Summary, Requested Priority, Description และ Attachment
- Official Ticket Number และ Current Status NEW ที่ Backend กำหนด
- My Tickets ของ Requester ปัจจุบัน พร้อม Search, Filter, Sort และ Pagination
- Requester Ticket Detail แบบ Read-only
- Attachment upload, metadata, download และ soft removal
- Backend ownership protection สำหรับ Ticket และ Attachment
- Frontend และ Backend validation รวมถึง duplicate-submit prevention
- Loading, Empty, No-results, Validation, Submitting, Success และ Safe Error states
- Zen Green UI, responsive layouts และ accessibility
- Prisma migration, idempotent seed และ Automated Tests ที่ trace กลับไปยัง Acceptance Criteria

### Excluded

- Authentication จริง: login, logout, passwords, password hashing, sessions และ tokens
- Real role-based authorization
- IT Staff dashboard, queue, claiming, reassignment และ IT Priority
- Public Comments, Internal Notes และ Actions Taken
- Ticket status changes หลังสถานะเริ่มต้น NEW
- Resolve, Close, Reopen หรือ Cancel Ticket
- Administrator และ notification functions

Development Requester Selection เป็นเพียง Testing Context ไม่ใช่ Security หรือ Authentication

## 4. Functional Requirements

### Development Requester Context

- FR-01 ระบบต้องโหลดและแสดงเฉพาะ Active Development Requesters จาก PostgreSQL
- FR-02 หากยังไม่มี Current Requester ระบบต้องแสดง Development Requester Selection ก่อนเปิด Ticket screens
- FR-03 Selection screen ต้องอธิบายว่าเป็นกลไกทดสอบ ไม่ใช่ Login จริง และต้องมี Loading, Empty, Failure และ Retry states
- FR-04 ผู้ใช้ต้องเลือก Active Requester และกด Continue ก่อนเข้า Application Shell
- FR-05 Application Shell ต้องแสดง Current Requester และมี Change Requester action
- FR-06 ระบบต้องตรวจสอบ Requester ID ที่บันทึกไว้กับ Backend เมื่อเริ่ม Application
- FR-07 เมื่อเปลี่ยนหรือพบ Requester ที่ Missing/Inactive ระบบต้องล้าง Requester-specific state และโหลดบริบทใหม่

### Ticket Creation

- FR-08 Create Ticket ต้องแสดง Requester, Ticket Number, Ticket Date และ Current Status เป็น Read-only หรือ Pending values
- FR-09 Form ต้องโหลด Active Categories และ Active Related Systems จาก PostgreSQL
- FR-10 Requester ต้องเลือก Category, Related System และ Requested Priority พร้อมกรอก Summary และ Description
- FR-11 Requester ต้องสามารถเลือก Attachment ตามชนิด ขนาด และจำนวนที่อนุญาต
- FR-12 Frontend ต้องแสดง Field-level validation และ Backend ต้องตรวจ Validation ซ้ำ
- FR-13 ก่อน Submit Client ต้องสร้าง UUID `submissionKey` สำหรับ Submission นั้น ปุ่ม Submit ต้องแสดง Busy state และ Disable ระหว่าง Request โดยการ Retry Submission เดิมต้องใช้ Key เดิม
- FR-14 Backend ต้องบังคับ Idempotency จากคู่ `requesterId` และ `submissionKey` เพื่อไม่ให้ Submission เดิมสร้าง Ticket ซ้ำ พร้อมสร้าง Ticket Number ที่ไม่ซ้ำ กำหนด Current Status NEW และผูก Ticket กับ Current Requester
- FR-15 เมื่อสร้างสำเร็จ UI ต้องแสดง Official Ticket Number, Saved Values และ Next Action
- FR-16 เมื่อสร้างไม่สำเร็จ UI ต้องแสดง Safe Error และเก็บค่าที่ผู้ใช้กรอกไว้
- FR-17 หาก Ticket บันทึกสำเร็จแต่ Attachment บางไฟล์ Upload ไม่สำเร็จ Ticket ต้องยังคงอยู่และสามารถ Retry เฉพาะไฟล์ได้

### My Tickets

- FR-18 My Tickets ต้องแสดงเฉพาะ Ticket ของ Current Requester
- FR-19 Ticket list ต้องรองรับ Case-insensitive Search ด้วย Ticket Number และ Summary
- FR-20 Ticket list ต้องรองรับ Filter ด้วย Category, Related System, Requested Priority และ Current Status
- FR-21 Ticket list ต้องรองรับ Sort ด้วย Last Updated, Ticket Date และ Ticket Number
- FR-22 Ticket list ต้องรองรับ Pagination พร้อม Total Items และ Total Pages
- FR-23 My Tickets ต้องมี Loading, Empty, No-results, Failure, Retry และ Clear Filters states
- FR-24 ผู้ใช้ต้องสามารถเปิด Create Ticket และ Owned Ticket Detail จาก My Tickets

### Ticket Detail and Attachments

- FR-25 Backend ต้องคืน Ticket Detail เฉพาะเมื่อ Ticket เป็นของ Current Requester
- FR-26 Ticket Detail ต้องแสดง Ticket fields แบบ Read-only และแยก Ticket information ออกจาก Attachment actions
- FR-27 Ticket Detail ต้องมี Loading, Not-found, Failure และ Back to My Tickets states
- FR-28 Requester ต้อง Upload Attachment ให้ Owned Ticket ได้ภายใต้กฎที่กำหนด
- FR-29 Requester ต้องดู Attachment metadata และ Download Active Attachment ของ Owned Ticket ได้
- FR-30 Requester ต้อง Soft-remove Active Attachment หลังยืนยันและกรอก Removal Reason
- FR-31 Removed Attachment ต้องคง Metadata และ Removed state ไว้ แต่ห้าม Download
- FR-32 Backend ต้องปฏิเสธ Ticket และ Attachment access ของ Requester อื่นโดยไม่เปิดเผย Resource

### UI Quality and Test Evidence

- FR-33 UI ต้องใช้ Zen Green design rules และ Responsive layout สำหรับ Desktop, Tablet และ Mobile
- FR-34 Controls ต้องใช้งานด้วย Keyboard มี Visible Focus และไม่สื่อสถานะด้วยสีเพียงอย่างเดียว
- FR-35 Required fields, Validation messages, Busy/Disabled states และ Badge states ต้องแสดงสม่ำเสมอ
- FR-36 ทุก Acceptance Criterion ต้องเชื่อมกับ Planned Test และ Final Evidence อย่างน้อยหนึ่งรายการ

## 5. Business Rules

### Requester Context and Ownership

- BR-01 Development Requester Selector เป็น Testing Mechanism ไม่ใช่ Authentication
- BR-02 เฉพาะ Requester ที่มี isActive = true เท่านั้นที่แสดงใน Selector
- BR-03 Client เก็บเฉพาะ Selected Requester ID ใน localStorage และตรวจสอบกับ Backend เมื่อเริ่ม Application
- BR-04 Missing หรือ Inactive Requester ID ต้องถูกล้างและไม่สามารถใช้สร้างหรืออ่าน Ticket
- BR-05 Ticket หนึ่งเป็นของ Requester หนึ่งคน และ Requester หนึ่งคนมี Ticket ได้หลายรายการ
- BR-06 Requester-specific API ทุก Endpoint ต้องตรวจ Current Requester และ Ownership ใน Backend
- BR-07 Backend ใช้ Requester Context จาก Header และไม่ยอมให้ Ticket body กำหนดหรือเปลี่ยน requesterId
- BR-08 Cross-owner Ticket หรือ Attachment request ต้องคืน Safe Not-found response

### Ticket Fields, Defaults and Validation

- BR-09 Official Ticket Number สร้างโดย Backend มี Unique Constraint และใช้รูปแบบ TKT-YYYYMMDD-XXXXXX
- BR-10 Ticket Date ใช้ createdAt จาก Backend/Database และ Ticket ใหม่มี Current Status NEW
- BR-11 Summary ต้อง Trim มีความยาว 5-150 ตัวอักษร
- BR-12 Description ต้อง Trim มีความยาว 10-5000 ตัวอักษร
- BR-13 Requested Priority ต้องเป็น LOW, MEDIUM หรือ HIGH
- BR-14 Category และ Related System ต้องมีอยู่จริงและ Active
- BR-15 Requester, Ticket Number, Ticket Date และ Current Status เป็น System-controlled values
- BR-16 Frontend และ Backend ต้องใช้ Validation limits เดียวกัน
- BR-17 UI ต้อง Disable Submit ขณะ Request กำลังทำงาน Client ต้องใช้ `submissionKey` เดิมเมื่อ Retry Submission เดิม และสร้าง Key ใหม่เมื่อเริ่ม Submission ใหม่ ส่วน Backend ต้องสร้าง Ticket ภายใน Transaction และบังคับ Unique Constraint ที่ `(requesterId, submissionKey)` หากได้รับ Key เดิมจาก Requester เดิม ต้องคืน Ticket เดิมโดยไม่สร้างข้อมูลซ้ำ
- BR-18 หาก Reference Data โหลดไม่สำเร็จ Form ต้องไม่ Submit
- BR-19 เมื่อ Ticket creation ล้มเหลว ค่า Form ที่ถูกต้องต้องยังอยู่เพื่อแก้ไขหรือ Retry

### Search, Filter, Sort and Pagination

- BR-20 Search ต้อง Trim, Case-insensitive, ค้นหา Ticket Number หรือ Summary และยาวไม่เกิน 100 ตัวอักษร
- BR-21 Filters ที่รองรับคือ categoryId, relatedSystemId, requestedPriority และ currentStatus
- BR-22 Sort fields ที่รองรับคือ updatedAt, createdAt และ ticketNumber โดย direction เป็น asc หรือ desc
- BR-23 Default Sort คือ updatedAt desc และ Secondary Sort คือ id desc
- BR-24 Pagination เริ่ม Page 1, Default Page Size 10 และอนุญาต Page Size 10, 20 หรือ 50
- BR-25 Invalid Search, Filter, Sort หรือ Pagination parameter ต้องคืน HTTP 400
- BR-26 List API ต้องคืน `totalOwnedItems` เพื่อแยกสถานะอย่างชัดเจน: `totalOwnedItems = 0` หมายถึง Empty state ส่วน `totalOwnedItems > 0` แต่ `totalItems = 0` หมายถึง No-results จาก Search/Filters

### Attachments

- BR-27 ชนิดไฟล์ที่อนุญาตคือ JPG/JPEG, PNG, WEBP และ PDF
- BR-28 MIME Type และ File Extension ต้องสอดคล้องกับชนิดที่อนุญาต
- BR-29 ขนาดสูงสุดคือ 5 MB ต่อไฟล์ และ Ticket มี Active Attachments ได้ไม่เกิน 5 ไฟล์
- BR-30 Removed Attachment ไม่นับรวม Active Attachment limit
- BR-31 Original Filename ใช้เพื่อแสดงผลและต้อง Sanitize ส่วน Storage Key ต้องสร้างโดยระบบและไม่ซ้ำ
- BR-32 File content เก็บใน Private Upload Directory ที่อยู่นอก Public Web Root และถูก Ignore โดย Git ส่วน Metadata เก็บใน PostgreSQL
- BR-33 Attachment metadata ต้องมี Ticket, Original Filename, Storage Key, MIME Type, Size และ Upload Time
- BR-34 Upload และ Download อนุญาตเฉพาะเจ้าของ Ticket และ Active Attachment เท่านั้น
- BR-35 Lab 2 ไม่ทำ Inline Preview; Active Attachment ใช้ Download ส่วน Removed Attachment ห้าม Preview และ Download
- BR-36 Soft Removal ต้องได้รับ Confirmation และบันทึก removedAt, removalReason และ removedByRequesterId
- BR-37 Removal Reason ต้อง Trim มีความยาว 5-250 ตัวอักษร
- BR-38 Removed Attachment ต้องคง Metadata และแสดง Removed state
- BR-39 หากเขียนไฟล์สำเร็จแต่บันทึก Metadata ล้มเหลว ระบบต้องลบไฟล์ที่เขียนไว้เป็น Compensation
- BR-40 หาก Ticket creation สำเร็จแต่ Attachment upload ล้มเหลว Ticket ต้องไม่ Rollback และ Retry ต้องไม่สร้าง Ticket ใหม่
- BR-41 การ Remove Attachment ที่ Removed แล้วต้องไม่สร้าง Removal record ซ้ำ

### Safe Failure Behavior

- BR-42 API Error ต้องไม่เปิดเผย Stack Trace, Database details, Local Paths หรือ Secrets
- BR-43 Cross-requester access ต้องไม่เปิดเผย Resource existence หรือข้อมูลเจ้าของ
- BR-44 .env, Upload Directory, Uploaded Files และ Secrets ต้องไม่ถูก Commit เข้า Git
- BR-45 Lab 3 ต้องแทน Development Requester Header ด้วย Authenticated Identity โดยคง Ticket Ownership relationship เดิม

## 6. UI Specification Summary

รายละเอียดฉบับเต็มอยู่ใน docs/lab-02/ui-spec.md

### Design Language

- Primary Green: #006B3C
- Secondary Green: #0B7A46
- Pale Green: #EAF6EF
- Page Background: #F5F7F6
- Surface: White พร้อม subtle border และ restrained shadow
- Error: Dark red พร้อมข้อความ
- Warning: Amber พร้อมข้อความ
- Success: Green พร้อมข้อความ

### Application Shell

- แสดง TokTickIT identity, Create Ticket, My Tickets, Current Requester และ Change Requester
- แสดง Active Page อย่างชัดเจน
- Mobile ใช้ Responsive Navigation ที่ Keyboard ใช้งานได้

### Development Requester Selection

- มีคำอธิบายว่าใช้ทดสอบเท่านั้น
- มี Active Requester dropdown, Continue, Loading, Empty, Failure และ Retry states

### Create Ticket

- Read-only/Pending: Ticket Number, Ticket Date, Requester และ Current Status
- Editable: Category, Related System, Summary, Requested Priority, Description และ Attachment selection
- มี Required markers, Field-level messages, Submit busy state, Success confirmation และ Safe Error ที่เก็บ Form values

### My Tickets

- Desktop แสดง Ticket Number, Summary, Category, Requested Priority, Current Status และ Last Updated ใน Table
- Mobile แสดงข้อมูลเดียวกันใน Ticket Cards โดยไม่มี Horizontal Page Scrolling
- มี Search, Filters, Sort, Clear Filters, Pagination และ Create Ticket action
- Priority และ Status ใช้ Badge ที่มีข้อความและไม่พึ่งสีเพียงอย่างเดียว

### Ticket Detail and Attachment States

- จัดกลุ่ม Read-only Ticket fields แยกจาก Attachment actions
- Attachment แสดง Active, Uploading, Invalid, Upload-failed และ Removed states
- Removed Attachment แสดง Metadata และ Removal Reason แต่ไม่มี Download action

### Responsive Rules

- Desktop: viewport ตั้งแต่ 992 px ขึ้นไป ใช้ Multi-column layout และ sensible maximum width
- Tablet: 768-991 px ใช้ Two-column layout เมื่อเหมาะสม
- Mobile: ต่ำกว่า 768 px ให้ Fields stack, Buttons touch-friendly และไม่มี Horizontal Page Scrolling
- ทุกขนาดต้องไม่มี Clipped Labels, Overlapping Messages, Hidden Buttons หรือ Unreadable Attachment Names

Lab 2 รองรับ Create และ View modes ของ Ticket แต่ไม่รองรับ Ticket Edit mode

## 7. Data Changes

### 7.1 Enums

- RequestedPriority: LOW, MEDIUM, HIGH
- TicketStatus: NEW

### 7.2 Models and Nullability

#### RequesterUser

- id: Int, required, primary key, autoincrement
- name: String, required
- email: String, required, unique
- isActive: Boolean, required, default true
- createdAt: DateTime, required, default now
- updatedAt: DateTime, required, default now, automatically updated

#### Category

ต่อยอด Model จาก Lab 1:

- id: Int, required, primary key, autoincrement
- name: String, required, unique
- isActive: Boolean, required, default true
- createdAt: DateTime, required, default now
- updatedAt: DateTime, required, default now, automatically updated

#### RelatedSystem

- id: Int, required, primary key, autoincrement
- name: String, required, unique
- description: String, optional
- isActive: Boolean, required, default true
- createdAt: DateTime, required, default now
- updatedAt: DateTime, required, automatically updated

#### Ticket

- id: Int, required, primary key, autoincrement
- ticketNumber: String, required, unique
- requesterId: Int, required, foreign key
- submissionKey: String/UUID, required
- categoryId: Int, required, foreign key
- relatedSystemId: Int, required, foreign key
- summary: String, required, maximum 150 characters
- requestedPriority: RequestedPriority, required
- description: String/Text, required
- currentStatus: TicketStatus, required, default NEW
- createdAt: DateTime, required, default now
- updatedAt: DateTime, required, automatically updated

#### Attachment

- id: Int, required, primary key, autoincrement
- ticketId: Int, required, foreign key
- originalName: String, required
- storageKey: String, required, unique
- mimeType: String, required
- sizeBytes: Int, required
- uploadedAt: DateTime, required, default now
- removedAt: DateTime, optional
- removalReason: String, optional
- removedByRequesterId: Int, optional, foreign key

### 7.3 Relationships

- RequesterUser 1-to-many Ticket
- Category 1-to-many Ticket
- RelatedSystem 1-to-many Ticket
- Ticket 1-to-many Attachment
- RequesterUser 1-to-many removed Attachments ผ่าน removedByRequesterId

Required relations ใช้ Foreign Keys และไม่อนุญาตให้ลบ Reference Data ที่ยังถูก Ticket ใช้งานโดยไม่มีกลยุทธ์ Migration

### 7.4 Constraints and Indexes

- Unique: RequesterUser.email, Category.name, RelatedSystem.name, Ticket.ticketNumber, Ticket(requesterId, submissionKey) และ Attachment.storageKey
- Index: RequesterUser.isActive
- Index: Category.isActive
- Index: RelatedSystem.isActive
- Index: Ticket(requesterId, updatedAt)
- Index: Ticket(requesterId, currentStatus)
- Index: Ticket(categoryId)
- Index: Ticket(relatedSystemId)
- Index: Attachment(ticketId, removedAt)

ยังไม่เพิ่ม Full-text หรือ Trigram Index ใน Lab 2 เพราะข้อมูลทดสอบมีขนาดเล็ก โดยใช้ Ownership และ Sort indexes ที่ตรงกับ Query หลักก่อน

### 7.5 Migration Decisions

- Migration ต้องเพิ่ม Category.isActive ด้วย Default `true` และ Category.updatedAt ด้วย Default เวลาปัจจุบัน เพื่อให้ Category เดิมทั้งสี่รายการจาก Lab 1 Migrate ได้โดยไม่สูญหายและยังคง Active
- เพิ่ม RequestedPriority, TicketStatus, RequesterUser, RelatedSystem, Ticket และ Attachment โดยไม่ลบข้อมูลจาก Lab 1
- Migration files ต้องสร้างด้วย Prisma, ตรวจ SQL ที่สร้าง และ Commit เข้า Git
- Upload Directory และ Uploaded Files ไม่อยู่ใน Migration และไม่ Commit เข้า Git

### 7.6 Seed Data

Seed ต้อง Idempotent โดยใช้ Stable Unique Keys หรือ Upsert และมี:

- Categories: Account and Access, Hardware, Software, Network
- Related Systems อย่างน้อย 6 รายการ เช่น Email, Campus Wi-Fi, VPN, LEB2 App, Grade Submission App, Printer และ Corporate Laptop
- Active Development Requesters อย่างน้อย 4 คน
- Inactive Development Requester อย่างน้อย 1 คน

Inactive Requester ต้องไม่ปรากฏใน Selector

### 7.7 Design Justification

Ticket เก็บ requesterId เป็น Foreign Key แทนการคัดลอกชื่อหรือ Email เพื่อรักษา Referential Integrity และรองรับ Authentication ใน Lab 3 โดยไม่เปลี่ยน Ownership relationship ส่วน Attachment ใช้ removedAt และ Removal Metadata แทนการลบ Record จริงเพื่อเก็บ Audit Evidence และแสดง Metadata ของไฟล์ที่ถูกลบ

## 8. API Contract

รายละเอียดฉบับเต็มอยู่ใน docs/lab-02/api-spec.md

Requester-specific Endpoints ใช้ Header X-Development-Requester-Id ซึ่งเป็น Testing Context เท่านั้น Ticket creation body ไม่มี requesterId

### 8.1 Common Response Shapes

Success responses คืน JSON Resource หรือ Paginated Result ตาม Endpoint

Create Ticket ใช้ Response envelope เดียวกันทั้งการสร้างใหม่และ Idempotent Replay:

    {
      "ticket": { "id": 15, "ticketNumber": "TKT-20260825-A1B2C3" },
      "replayed": false
    }

HTTP 201 ใช้ `replayed: false` สำหรับ Ticket ใหม่ ส่วน HTTP 200 ใช้ `replayed: true` และคืน Ticket เดิมเมื่อได้รับ `submissionKey` เดิมจาก Requester เดิม โดย `ticket` เป็น Ticket Detail object ตาม API Contract

Safe Error:

    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request data is invalid.",
        "fields": {
          "summary": "Summary is required."
        }
      }
    }

fields เป็น Optional และ API ห้ามคืน Stack Trace, SQL, Local Path หรือ Secret

### 8.2 Endpoint Summary

| Method | Path | Request | Success | Main Errors |
|---|---|---|---|---|
| GET | /api/categories | None | 200 Active Category array | 500 |
| GET | /api/related-systems | None | 200 Active RelatedSystem array | 500 |
| GET | /api/development-requesters | None | 200 Active Requester array | 500 |
| GET | /api/development-requesters/:requesterId | requesterId | 200 Active Requester | 400, 403, 404, 500 |
| POST | /api/tickets | Requester header + submissionKey, categoryId, relatedSystemId, summary, requestedPriority, description | 201/200 `{ ticket, replayed }`; 200 คืน Ticket เดิมเมื่อ Replay | 400, 403, 409, 500 |
| GET | /api/tickets | Requester header + search/filter/sort/page query | 200 Paginated owned Tickets | 400, 403, 500 |
| GET | /api/tickets/:ticketId | Requester header + ticketId | 200 Owned Ticket Detail | 400, 403, 404, 500 |
| POST | /api/tickets/:ticketId/attachments | Requester header + multipart file | 201 Active Attachment metadata | 400, 403, 404, 409, 413, 415, 500 |
| GET | /api/tickets/:ticketId/attachments | Requester header + ticketId | 200 Active and Removed metadata | 400, 403, 404, 500 |
| GET | /api/attachments/:attachmentId | Requester header + attachmentId | 200 Owned Attachment metadata | 400, 403, 404, 500 |
| GET | /api/attachments/:attachmentId/download | Requester header + attachmentId | 200 Active file stream | 400, 403, 404, 410, 500 |
| DELETE | /api/attachments/:attachmentId | Requester header + removalReason | 200 Soft-removed metadata | 400, 403, 404, 409, 500 |

### 8.3 Ticket-list Query Contract

- search: optional trimmed text, maximum 100
- categoryId, relatedSystemId: optional positive integers
- requestedPriority: optional LOW, MEDIUM หรือ HIGH
- currentStatus: optional NEW
- sortBy: updatedAt, createdAt หรือ ticketNumber
- sortDirection: asc หรือ desc
- page: positive integer, default 1
- pageSize: 10, 20 หรือ 50, default 10
- default order: updatedAt desc แล้ว id desc

Paginated response:

    {
      "items": [],
      "page": 1,
      "pageSize": 10,
      "totalOwnedItems": 0,
      "totalItems": 0,
      "totalPages": 0
    }

Invalid Query คืน 400 ส่วน Missing หรือ Cross-owner Resource คืน 404 เพื่อไม่เปิดเผย Resource existence, Inactive Requester Context คืน 403, Removed Attachment download คืน 410, Unsupported Type คืน 415 และ Oversized File คืน 413

## 9. Acceptance Criteria

### Development Requester

- AC-01 กำหนดให้มี Active Requester เมื่อหน้า Selection โหลด ต้องแสดงเฉพาะ Active Requester เท่านั้น
- AC-02 กำหนดให้ยังไม่ได้เลือก Requester เมื่อเปิดหน้า Ticket ต้องแสดงหน้า Selection ก่อนเข้าสู่หน้า Ticket
- AC-03 กำหนดให้เลือก Active Requester แล้ว เมื่อกด Continue ต้องแสดง Requester นั้นใน Application Shell และโหลดข้อมูลเฉพาะของ Requester
- AC-04 กำหนดให้มี Current Requester อยู่ เมื่อเปลี่ยนเป็น Requester อื่น ต้องล้าง State เฉพาะของ Requester เดิมและโหลดข้อมูลของ Requester ใหม่
- AC-05 กำหนดให้ระบบกู้คืนหรือส่ง Missing/Inactive Requester ID ไปยัง API เมื่อระบบตรวจสอบ ID ต้องล้าง Selection หรือปฏิเสธ Request โดยไม่คืนข้อมูล Ticket
- AC-06 กำหนดให้การโหลด Requester ไม่มีข้อมูลหรือเกิดข้อผิดพลาด เมื่อหน้า Selection โหลด ต้องแสดง Empty/Safe Error state ที่ตรงกับเหตุการณ์และมี Retry action

### Ticket Creation

- AC-07 กำหนดให้ข้อมูล Ticket ถูกต้อง เมื่อ Requester ที่เลือกกด Submit ต้องบันทึก Ticket หนึ่งรายการด้วย `requesterId` ที่ตรงกัน สถานะเริ่มต้น `NEW` และ Official Ticket Number ที่ไม่ซ้ำ
- AC-08 กำหนดให้ข้อมูล Required หรือข้อมูลที่จำกัดความยาวไม่ถูกต้อง เมื่อกด Submit ต้องแสดง Field-level Error และ Frontend กับ Backend ต้องบังคับใช้กฎเดียวกัน
- AC-09 Reference Data ต้องผ่านสองกรณี: (1) เมื่อหน้า Create Ticket โหลด Categories และ Related Systems ต้องแสดง Loading state และ Disable Submit จนข้อมูลพร้อม; หากโหลดล้มเหลวต้องแสดง Safe Error, คง Submit เป็น Disabled และมี Retry action; เมื่อ Retry สำเร็จ Form ต้องเข้าสู่ Ready state และ (2) เมื่อ Create API ได้รับ Category หรือ Related System ที่ไม่มีอยู่หรือ Inactive ต้องปฏิเสธคำขอและไม่บันทึก Ticket
- AC-10 กำหนดให้ Submit หรือ Retry ด้วย `submissionKey` เดิม เมื่อ Backend ประมวลผล ต้องมี Ticket ของ Requester นั้นเพียงหนึ่งรายการ โดย Request แรกคืน HTTP 201 พร้อม `{ ticket, replayed: false }` และ Request ที่ Replay คืน Ticket เดิมด้วย HTTP 200 พร้อม `{ ticket, replayed: true }`
- AC-11 กำหนดให้การสร้าง Ticket ล้มเหลว เมื่อได้รับ Response ต้องแสดง Safe Error และคงค่า Form ที่ถูกต้องไว้
- AC-12 กำหนดให้สร้าง Ticket สำเร็จ เมื่อแสดง Confirmation ค่า Official Ticket Number, Saved Values และ Next Action ต้องอ่านจาก `response.ticket` ตาม Create Ticket Response contract
- AC-13 กำหนดให้บันทึก Ticket แล้วแต่ Upload Attachment ล้มเหลว เมื่อประมวลผลเสร็จ Ticket ต้องยังคงอยู่และต้อง Retry ไฟล์ที่ล้มเหลวได้โดยไม่สร้าง Ticket ใหม่

### My Tickets and Ticket Detail

- AC-14 กำหนดให้เลือก Requester A เมื่อหน้า My Tickets โหลด ต้องคืนเฉพาะ Ticket ของ Requester A
- AC-15 กำหนดให้ Search, Filter และ Sort ถูกต้อง เมื่อใช้งาน ต้องคืนเฉพาะ Ticket ที่ตรงเงื่อนไขและเป็นของ Requester โดยเรียงลำดับอย่างคงที่ตามที่ร้องขอ
- AC-16 กำหนดให้จำนวน Ticket ที่เป็นเจ้าของมากกว่า Page Size เมื่อขอ Page อื่น ต้องคืนรายการและ Pagination Metadata ที่ถูกต้อง
- AC-17 กำหนดให้ Search, Filter, Sort หรือ Pagination Parameter ไม่ถูกต้อง เมื่อเรียก List API ต้องคืน HTTP 400 พร้อม Safe Error
- AC-18 กำหนดให้ List API คืน `totalOwnedItems = 0` เมื่อหน้า My Tickets โหลด ต้องแสดง Empty state และ Create Ticket action
- AC-19 กำหนดให้ List API คืน `totalOwnedItems > 0` แต่ `totalItems = 0` เมื่อใช้ Search/Filters ต้องแสดง No-results และ Clear Filters
- AC-20 กำหนดให้การโหลดรายการล้มเหลว เมื่อหน้า My Tickets โหลด ต้องแสดง Safe Error และ Retry
- AC-21 กำหนดให้มี Ticket ที่ Requester เป็นเจ้าของ เมื่อเปิดหน้า Detail ต้องแสดง Field ที่กำหนดและ Attachment Metadata แบบ Read-only
- AC-22 กำหนดให้ Ticket ไม่มีอยู่หรือเป็นของ Requester อื่น เมื่อขอ Ticket Detail ต้องไม่คืนข้อมูล Ticket
- AC-23 กำหนดให้การโหลด Detail ล้มเหลว เมื่อหน้าโหลด ต้องแสดง Safe Error และมี Back to My Tickets

### Attachments

- AC-24 กำหนดให้ไฟล์เป็นชนิดที่อนุญาต มีขนาดไม่เกิน 5 MB และมี Active Attachment น้อยกว่าห้ารายการ เมื่อเจ้าของ Upload ต้องบันทึก File และ Metadata เป็น Active
- AC-25 กำหนดให้ไฟล์เป็น Unsupported Type, MIME/Extension ไม่ตรงกัน หรือมีขนาดเกิน 5 MB เมื่อเลือกหรือ Upload ต้องปฏิเสธไฟล์และไม่สร้าง Metadata
- AC-26 กำหนดให้มี Active Attachment ห้ารายการแล้ว เมื่อ Upload เพิ่ม ต้องปฏิเสธไฟล์และจำนวน Active Attachment ต้องยังเป็นห้า
- AC-27 กำหนดให้มี Active Attachment ที่ Requester เป็นเจ้าของ เมื่อขอ Download ต้องคืนไฟล์ด้วย Safe Filename และ Content Type ที่ถูกต้อง
- AC-28 กำหนดให้เจ้าของยืนยันการ Remove พร้อมเหตุผลที่ถูกต้อง เมื่อ Remove สำเร็จ ต้องบันทึก Removal Metadata โดยไม่ลบ Attachment Record
- AC-29 กำหนดให้ Attachment ถูก Remove แล้ว เมื่อโหลด Detail หรือขอ Download ต้องแสดง Metadata เป็น Removed state และต้องไม่อนุญาต Download
- AC-30 กำหนดให้ Attachment เป็นของ Requester อื่น เมื่อขอ Metadata, Download หรือ Removal ต้องไม่คืนข้อมูล Attachment

### Responsive and Accessibility

- AC-31 กำหนดให้ตรวจหน้าจอบน Desktop, Tablet และ Mobile เมื่อเปิดหน้าที่กำหนด ต้องไม่มีเนื้อหาถูกตัด การซ้อนทับ Action ที่ถูกซ่อน หรือ Horizontal Page Scrolling ที่ไม่ได้ตั้งใจ
- AC-32 กำหนดให้ผู้ใช้ใช้งานด้วย Keyboard เท่านั้น เมื่อ Navigate ต้องเข้าถึงและใช้งาน Interactive Control ทุกตัวได้พร้อมแสดง Visible Focus
- AC-33 กำหนดให้แสดง Error, Warning, Success, Required, Disabled หรือ Busy state ต้องมีข้อความหรือ Indicator ที่ไม่พึ่งสีเพียงอย่างเดียวและสื่อความหมายได้ชัดเจน
- AC-34 กำหนดให้ Field Validation ล้มเหลว เมื่อแสดง Error แต่ละข้อความต้องอยู่ใกล้และเชื่อมโยงกับ Control นั้นในเชิงโปรแกรม

## 10. Definition of Done

### Product Completion

- Included Scope ถูก Implement และ Excluded Scope ไม่ถูกเพิ่ม
- FR, BR และ AC สอดคล้องกับ UI, Data, API และ Test Plans
- ทุก AC เชื่อมกับ Test Evidence อย่างน้อยหนึ่งรายการ
- Unit, API/Integration, UI Component, UI Style, Responsive และ E2E tests ผ่านจาก Final main
- ไม่มี Required Test ถูก Skip, Disabled หรือ Commented out
- Prisma schema, reviewed Migration และ Idempotent Seed ถูกต้อง
- Ownership และ Cross-requester rejection ทำงานใน Backend
- Attachment validation, download, compensation และ soft removal ทำงานครบ
- Loading, Empty, No-results, Validation, Success และ Failure states ทำงานครบ
- Desktop, Tablet และ Mobile ผ่าน Visual Checklist
- Keyboard navigation, Focus และ non-color indicators ผ่าน
- README setup, migration, seed, run และ test commands เป็นปัจจุบัน
- Required Screenshots และ Test Evidence ถูกบันทึกใน Approved Paths

### Course Delivery

- Issues ครอบคลุม Specification, Data, APIs, UI, Tests, E2E, Visual Inspection และ Release Integration
- ทุก Issue ใช้ Branch และ Peer-reviewed PR เข้า lab2-staging; ไม่มี Direct Development บน main/lab2-staging
- PR เชื่อม Issue ผ่าน Development panel; Author ตอบ Review comments และ Reviewer เป็นผู้ Approve/Merge
- Release PR จาก lab2-staging เข้า main ผ่าน Review และ Final Board อยู่ Done
- เอกสาร Lab 2 ทั้งหกไฟล์และ PDF Answer Part 1-9 เป็นปัจจุบัน

## 11. Assumptions and Decisions

- AD-01 Client เก็บ Selected Requester ID ใน localStorage และตรวจสอบกับ Backend เมื่อเริ่ม Application
- AD-02 Requester-specific API ใช้ Header X-Development-Requester-Id เพื่อให้เปลี่ยนเป็น Authenticated Identity ใน Lab 3 ได้
- AD-03 Cross-owner Resource ใช้ Safe 404; Inactive Requester Context ใช้ 403; Removed Attachment download ใช้ 410
- AD-04 Summary ใช้ 5-150 ตัวอักษร, Description ใช้ 10-5000 และ Removal Reason ใช้ 5-250
- AD-05 Requested Priority ใช้ LOW, MEDIUM และ HIGH
- AD-06 Ticket Number ใช้ TKT-YYYYMMDD-XXXXXX พร้อม Unique Constraint และ Backend retry เมื่อเกิด Conflict
- AD-07 Search ใช้ Ticket Number/Summary; Filters ใช้ Category/System/Priority/Status; Default Sort ใช้ updatedAt desc และ id desc
- AD-08 Pagination เริ่ม Page 1, Default Page Size 10 และอนุญาต 10, 20 หรือ 50
- AD-09 Attachment content เก็บใน Private Local Upload Directory ที่กำหนดด้วย Environment Configuration และ Ignore โดย Git; Metadata เก็บใน PostgreSQL
- AD-10 Lab 2 ไม่ทำ Inline Preview และสร้าง Ticket ก่อน Upload Attachments เพื่อให้ Failed Upload Retry ได้โดยไม่สร้าง Ticket ซ้ำ

## 12. หลักฐานสำหรับ PDF — Answer Part 2

Answer Part 2 ใช้เอกสาร `specification.md` ฉบับนี้เป็นหลักฐานของ Engineering Contract โดยแสดง Scope, Functional Requirements, Business Rules, Acceptance Criteria และ Definition of Done ที่ใช้ควบคุมการพัฒนา Lab 2 พร้อมอ้างอิงไฟล์จริงใน Repository และประวัติ Issue/PR ที่ยืนยันว่า Contract ผ่านการ Review ก่อน Feature Implementation เสร็จสมบูรณ์
