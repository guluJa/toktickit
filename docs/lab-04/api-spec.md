# TokTickIT Lab 4 REST API Contract

สถานะ: Draft / Planned; ยังไม่มี Lab 4 route ใน Source Code
Baseline: ใช้ response envelope และ security conventions ของ docs/lab-03/api-spec.md

## 1. Conventions

- Base path: /api
- Success: { data: ... }
- Error: { error: { code, message, fields? } }
- Session: HttpOnly toktickit_session cookie
- Timestamp: ISO 8601; เก็บใน UTC
- Pagination: `{ page, pageSize, totalItems, totalPages }`; ค่าเริ่มต้น `page=1`, `pageSize=20`, สูงสุด `pageSize=100`
- Action list ทั้ง Requester และ Staff เรียง `actionAt ASC, id ASC` ทุกหน้า; `pageSize` เป็นจำนวนเต็ม 1–100 เพื่อให้การอ่านหลายหน้ามีขอบเขตชัดเจน
- Dashboard lists: ค่าเริ่มต้น `limit=20`, สูงสุด `limit=100`; `recentTickets`/`recentlyResolvedTickets` sort ด้วย `updatedAt DESC, id DESC` และ `recentActions` sort ด้วย `actionAt DESC, id DESC`
- Backend เป็นผู้ตรวจ authentication, role, ownership, validation และ conflict
- ห้ามคืน password, passwordHash, token, cookie, SQL, stack trace หรือ internal path

Dashboard link shape: `{ "rel": "recentTickets|recentlyResolved|recentActions|ticketDetail", "target": "requester-tickets|staff-queue|requester-ticket-detail|staff-ticket-detail", "ticketId": integer?, "query": object? }`. `ticketDetail` ใช้ `ticketId`; metric link ใช้ `query` ที่นำไปยังรายการเดิมของ Lab 3 และไม่สร้าง route ใหม่

## 2. Existing Lab 1–3 API Compatibility

ต้องคง API เดิมของ Authentication, Requester Ticket, Attachment, Comments, Requester Resolved, Staff Queue, Staff Ticket Detail และ Administrator User Management ตาม docs/lab-03/api-spec.md

Lab 4 ห้ามเปลี่ยน response shape เดิมโดยไม่มี migration ของ contract และ regression test

## 3. ActionTaken Schema

### 3.1 Response object

ActionTaken response ต้องมี:

- id: integer
- ticketId: integer
- actionAt: ISO timestamp
- description: string
- result: string
- performedBy: SafeUser
- followUpRequired: boolean
- followUpNote: string or null
- attachmentNotes: string or null
- ticketOwner: SafeUser or null
- createdAt: ISO timestamp
- updatedAt: ISO timestamp
- version: integer

performedBy และ ticketOwner ต้องเป็น safe user object ตาม Lab 3; ห้ามส่ง passwordHash, session fields หรือข้อมูลลับ

Requester เห็นเฉพาะ `id`, `ticketId`, `actionAt`, `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `performedBy`, `ticketOwner`, `createdAt`, `updatedAt` และ `version` ของ Ticket ตนเองตาม visibility policy; ไม่มี field สำหรับแก้ไข. IT Staff และ Administrator ที่มีสิทธิ์เข้าถึง Ticket แก้ Action ของผู้ปฏิบัติงานคนอื่นได้เฉพาะ field ใน PATCH body และ version ล่าสุด โดย `performedBy` ยังคงเป็นผู้สร้างเดิมและห้าม impersonate

Baseline model name: `performedById` เป็น foreign key ไปยัง Prisma model `RequesterUser.id` (คำว่า User ใน Contract ก่อนหน้านี้เป็นคำเชิงแนวคิดเท่านั้น); response ใช้ `SafeUser` ตาม Lab 3

### 3.2 Create request

POST body (เวลาของ Action และ version ถูกสร้าง/ควบคุมโดย Backend):

    {
      "description": "Checked the network connection.",
      "result": "Connection restored.",
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": null
    }

Client ห้ามส่ง actionAt, performedById, createdAt, updatedAt, version หรือ ticketOwner; Backend สร้าง actionAt/createdAt/updatedAt เป็น UTC และกำหนด version เริ่มต้นเป็น 1

## 4. Requester Action Routes

### GET /api/tickets/:ticketId/actions

ใช้ได้เฉพาะ Requester ที่เป็นเจ้าของ Ticket และคืน Action fields ตาม visibility policy

- 200: `{ data: { items: ActionTaken[], pagination: { page, pageSize, totalItems, totalPages } } }`
- 400: `VALIDATION_ERROR` เมื่อ page/pageSize ไม่ถูกต้อง
- 401: `AUTHENTICATION_REQUIRED` หรือ `SESSION_INVALID` ตามชื่อ error ของ Lab 3 baseline
- 404: `TICKET_NOT_FOUND` หรือ safe owner-not-found response
- 500: `INTERNAL_ERROR` แบบไม่เปิดเผยรายละเอียด

Requester ใช้ POST/PATCH/DELETE กับ Action ไม่ได้

## 5. Staff/Admin Action Routes

### GET /api/staff/tickets/:ticketId/actions

IT Staff และ Administrator อ่าน Actions ของ Ticket ที่ตนมีสิทธิ์เห็นได้

- 200: `{ data: { items: ActionTaken[], pagination: { page, pageSize, totalItems, totalPages } } }`
- 400: `VALIDATION_ERROR` เมื่อ page/pageSize ไม่ถูกต้อง
- 401: `AUTHENTICATION_REQUIRED` หรือ `SESSION_INVALID`
- 403: `ROLE_FORBIDDEN` หรือ `TICKET_FORBIDDEN`
- 404: `TICKET_NOT_FOUND`
- 500: `INTERNAL_ERROR` แบบไม่เปิดเผยรายละเอียด

### POST /api/staff/tickets/:ticketId/actions

IT Staff และ Administrator สร้าง Action ได้ตาม authorization policy

- 201: { data: { action: ActionTaken } }
- 400: VALIDATION_ERROR
- 401: AUTHENTICATION_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN หรือ TICKET_FORBIDDEN
- 404: TICKET_NOT_FOUND
- 409: `ACTION_STATE_CONFLICT` เมื่อ Ticket เป็น CLOSED/CANCELLED หรือเกิด concurrent mutation ที่ทำให้เขียน Action ต่อไม่ได้

performedBy ต้องมาจาก session ของผู้เรียก ไม่ใช่ request body

Contract นี้ไม่กำหนด `Idempotency-Key` หรือ server-side deduplication สำหรับคำขอ POST ที่ถูกส่งซ้ำจาก network retry. ระหว่างรอให้ UI แสดง saving guard; หาก timeout หรือไม่ทราบผลลัพธ์ ให้เข้าสู่ `submission-uncertain`, คงข้อมูลในฟอร์มและเรียก GET รายการ Actions ล่าสุดเพื่อ reconcile ก่อน ผู้ใช้จึงค่อยยืนยันการสร้างรายการใหม่อย่างชัดเจนได้ และ UI ห้าม retry POST อัตโนมัติ เพราะคำขอเดิมอาจบันทึกสำเร็จภายหลัง

การ reconcile หลัง POST timeout ใช้ `GET /api/staff/tickets/:ticketId/actions?page=<n>&pageSize=100` อ่าน pagination และตรวจทุกหน้าจนถึง `totalPages` (รายการเรียง `actionAt ASC, id ASC`); เมื่อรอคำขอเดิมที่อาจบันทึกภายหลังให้ refresh รายการและ pagination อีกครั้ง ไม่สรุปจากหน้าแรกหรือหน้าเดียว. Action ที่ description/result/notes เหมือนกันเป็นเพียง candidate เพราะอาจเป็นรายการเก่า; GET ไม่มี request identifier ที่พิสูจน์ว่าเป็นผลของ POST ที่ timeout. จึงคง `submission-uncertain` แม้พบ candidate หรือยังไม่พบรายการ และไม่แสดงข้อความว่าสร้างสำเร็จ. ถ้า GET ล้มเหลว ให้แสดง safe failure และเก็บข้อมูลเดิม. UI ห้ามส่ง POST ซ้ำอัตโนมัติ; การสร้างใหม่ต้องเป็นการตัดสินใจของผู้ใช้หลังตรวจรายการล่าสุดและได้รับคำเตือนว่าอาจซ้ำ. ยืนยันสำเร็จโดยอัตโนมัติได้เฉพาะเมื่อได้รับ `201` พร้อม `action.id` จาก POST เดิมจริง ไม่ใช้การเทียบข้อความหรือเวลาแทน. Test ต้องครอบคลุมรายการเก่าที่ข้อความเหมือนกัน, คำขอเดิมที่บันทึกสำเร็จภายหลัง, หลายหน้า และ GET ล้มเหลว

### PATCH /api/staff/tickets/:ticketId/actions/:actionId

IT Staff และ Administrator แก้ Action ได้เมื่อ version ตรงกัน และ Ticket ยังไม่อยู่ใน CLOSED หรือ CANCELLED; RESOLVED ยังแก้ follow-up ได้เพื่อเตรียมปิด Ticket

Request body:

    {
      "description": "Updated description",
      "result": "Updated result",
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": null,
      "version": 1
    }

อนุญาตให้แก้เฉพาะ `description`, `result`, `followUpRequired`, `followUpNote` และ `attachmentNotes` พร้อม `version` ล่าสุดเท่านั้น `id`, `ticketId`, `performedBy`, `actionAt`, `createdAt` และ `updatedAt` เป็น Server-managed หรือมาจาก path จึงแก้จาก Client ไม่ได้

- 200: { data: { action: ActionTaken } }
- 400: VALIDATION_ERROR
- 401: AUTHENTICATION_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN หรือ TICKET_FORBIDDEN
- 404: ACTION_NOT_FOUND หรือ TICKET_NOT_FOUND
- 409: `STALE_UPDATE` หรือ `ACTION_STATE_CONFLICT`

### DELETE /api/staff/tickets/:ticketId/actions/:actionId

ไม่เปิดใช้งานใน Contract นี้ การเรียกต้องตอบ `405 METHOD_NOT_ALLOWED` เสมอ

## 6. Ticket Workflow Routes

### PATCH /api/staff/tickets/:ticketId/status

คง route เดิมจาก Lab 3 และบังคับ Status Matrix, resolution gate และ `Ticket.version` concurrency rule ของ Lab 4

Request body:

    {
      "status": "RESOLVED",
      "version": 3
    }

`version` ต้องเป็นค่า `Ticket.version` ล่าสุดที่อ่านจาก Backend จาก `GET /api/staff/tickets/:ticketId` หรือ `GET /api/tickets/:ticketId` response (`ticket.version`) ไม่ใช่ `ActionTaken.version` และไม่ใช่ `updatedAt` ที่ Client สร้างเอง เมื่อสำเร็จ Backend เปลี่ยน Status และเพิ่ม `Ticket.version` ใน transaction เดียวกัน

เมื่อ `status` เป็น `REOPENED` ต้องส่ง `reopenReason` ที่ trim แล้วไม่ว่างเพิ่มใน body; Status อื่นต้องไม่ส่ง `reopenReason` หรือส่งเป็น `null`. หลังจาก Ticket อยู่ `REOPENED` แล้ว IT Staff ใช้ route เดิมเปลี่ยนเป็น `IN_PROGRESS` ได้ตาม Matrix และต้องใช้ `Ticket.version` ล่าสุด

ตัวอย่าง `CLOSED → REOPENED`:

    {
      "status": "REOPENED",
      "version": 3,
      "reopenReason": "Requester reported the same issue again."
    }

- 200: `{ data: { ticket: StaffTicket } }` โดย `ticket.version` เป็นค่าหลัง update
- 400: VALIDATION_ERROR
- 401: AUTHENTICATION_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN
- 404: TICKET_NOT_FOUND
- 409: `STATUS_TRANSITION_NOT_ALLOWED`, `RESOLUTION_GATE_FAILED` หรือ `STALE_UPDATE`
- เมื่อ version ไม่ตรง ต้องตอบ `{ error: { code: "STALE_UPDATE", message, fields: { expectedVersion, actualVersion } } }` และต้องไม่เปลี่ยน Status หรือ version
- Status mutation และ Action mutation ของ Ticket เดียวกันต้องถูกตรวจและยืนยันแบบ atomic ตาม specification; ไม่มี partial success หากอีก mutation ทำให้ gate หรือ version ไม่ผ่าน กลไกฐานข้อมูลที่ใช้เป็น implementation decision
- `CLOSED` ทำได้เฉพาะจาก `RESOLVED`; หากยังมี Action ที่ `followUpRequired=true` การขอ `CLOSED` ต้องตอบ `409 RESOLUTION_GATE_FAILED` ส่วน `RESOLVED` ยังทำได้เมื่อมี Action ที่ valid และจะแสดง follow-up ที่ยังค้างอยู่

### POST /api/tickets/:ticketId/resolved

คง Requester indication จาก Lab 3:

- 200: { data: { resolved: true, requesterResolvedAt, currentStatus } }
- ต้องไม่เปลี่ยน currentStatus เป็น RESOLVED

### Lab 3 assignment compatibility

`POST /api/staff/tickets/:ticketId/assignment` ยังคงใช้ request `{ "ownerId": integer | null }` และ response envelope/error ของ `docs/lab-03/api-spec.md`; เฉพาะ IT Staff แก้ assignment ได้. `ownerId` ต้องเป็นผู้ใช้ที่ active และเป็น IT Staff หรือ Administrator ตาม baseline หากเป็น inactive user หรือ role อื่นให้ตอบ `404 USER_NOT_FOUND` และไม่เปลี่ยน Owner; Administrator ยังได้ `403 ROLE_FORBIDDEN`. คำว่า complete ในการสาธิตหมายถึงการเปลี่ยน Ticket เป็น `RESOLVED`/`CLOSED` ตาม Matrix ไม่ใช่สถานะของ Action เพิ่มใหม่ ส่วน cancel ใช้ `PATCH /api/staff/tickets/:ticketId/status` กับ `CANCELLED` ตาม Matrix

## 7. Dashboard Routes

### GET /api/requester/dashboard

ใช้ได้เฉพาะ authenticated REQUESTER และคำนวณจาก Ticket ของตนเอง รับ query `limit` ตาม Dashboard list convention

Response:

    {
      "data": {
        "timezone": "Asia/Bangkok",
        "asOf": "2026-01-01T09:00:00Z",
        "metrics": {
          "openCount": 0,
          "waitingForRequesterCount": 0,
          "resolvedCount": 0,
          "recentlyUpdatedCount": 0,
          "recentlyResolvedCount": 0
        },
        "recentTickets": [],
        "recentlyResolvedTickets": [],
        "links": []
      }
    }

`recentTickets` และ `recentlyResolvedTickets` ใช้รายการสรุปที่มี `id`, `ticketNumber`, `summary`, `currentStatus`, `requestedPriority`, `itPriority`, `updatedAt` และ `detailLink` ซึ่งเป็น Dashboard link ที่มี `target=requester-ticket-detail` กับ `ticketId`; metric link ต้องพาไปยังรายการ My Tickets เดิมของ Lab 3 และห้ามมีข้อมูลของ Requester คนอื่น

- 200: success, รวม empty metrics ได้
- 401: AUTHENTICATION_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN

### GET /api/staff/dashboard

ใช้ได้โดย IT Staff และ Administrator ตาม role policy และรับ query `limit` ตาม Dashboard list convention

Response:

    {
      "data": {
        "timezone": "Asia/Bangkok",
        "asOf": "2026-01-01T09:00:00Z",
        "metrics": {
          "unassignedCount": 0,
          "mineCount": 0,
          "highPriorityCount": 0,
          "recentlyUpdatedCount": 0,
          "recentlyResolvedCount": 0
        },
        "byStatus": {
          "NEW": 0,
          "OPEN": 0,
          "IN_PROGRESS": 0,
          "WAITING_FOR_REQUESTER": 0,
          "RESOLVED": 0,
          "CLOSED": 0,
          "REOPENED": 0,
          "CANCELLED": 0
        },
        "byPriority": { "LOW": 0, "MEDIUM": 0, "HIGH": 0 },
        "recentTickets": [],
        "recentlyResolvedTickets": [],
        "recentActions": [],
        "links": []
      }
    }

Metrics ต้องประกอบด้วย unassignedCount, mineCount, byStatus, byPriority, highPriorityCount, recentlyUpdatedCount, recentlyResolvedCount และ drill-down links. `byStatus` ต้องมี key ของทุก TicketStatus และ `byPriority` ต้องมี `LOW`, `MEDIUM`, `HIGH` แม้ไม่มีข้อมูล โดยใช้ค่า 0

`recentTickets` แต่ละรายการต้องมี `id`, `ticketNumber`, `summary`, `currentStatus`, `requestedPriority`, `itPriority`, `owner`, `updatedAt` และ `detailLink` โดย `owner` เป็น SafeUser หรือ `null`

`recentlyResolvedTickets` ใช้รายการ Ticket ที่เป็น RESOLVED/CLOSED และ `updatedAt` อยู่ในช่วง 7 วันล่าสุด โดยมี `id`, `ticketNumber`, `summary`, `currentStatus`, `requestedPriority`, `itPriority`, `owner`, `updatedAt` และ `detailLink` ซึ่งเป็น Dashboard link ที่มี `target=staff-ticket-detail` กับ `ticketId`.

`recentActions` คือ Actions ของผู้ใช้ที่ authenticate อยู่ (`performedBy.id` เท่ากับ session user) ในช่วง 7 วันล่าสุด แต่ละรายการมี `id`, `ticketId`, `actionAt`, `description`, `result`, `performedBy` และ `detailLink` โดย `performedBy` เป็น SafeUser และ `detailLink` เป็น Dashboard link ที่มี `target=staff-ticket-detail` กับ `ticketId`. `recentTickets` และ `recentlyResolvedTickets` เรียง `updatedAt DESC, id DESC`; `recentActions` เรียง `actionAt DESC, id DESC`; ทั้งหมดใช้ `limit` เดียวกันและคืน empty array ได้

Query ของ metric link คง API เดิมของ Lab 3: Requester ใช้ `GET /api/tickets?currentStatus=<status>&sortBy=updatedAt&sortDirection=desc&page=1&pageSize=10` และ Staff ใช้ `GET /api/staff/tickets?status=<status>&sortBy=updatedAt&sortOrder=desc&page=1&pageSize=10` โดยเพิ่ม `ownerId=<id|unassigned>` เฉพาะลิงก์ My Assigned/Unassigned. ไม่เปลี่ยนชื่อ query หรือ response ของ My Tickets เดิม; Client ของ Dashboard ต้องส่ง `currentStatus` และรองรับ status ที่ใช้ในลิงก์ โดยคงหน้าจอ My Tickets เดิม. `pageSize=10` เป็นค่าที่ Queue ทั้งสองรองรับและไม่ขึ้นกับ Dashboard `limit=1–100`: `limit` จำกัดเฉพาะรายการที่ฝังใน Dashboard ไม่ใช่จำนวนแถวใน Queue ปลายทาง. สำหรับ metric ที่รวมหลาย status ให้ทำลิงก์แยกตาม status ที่เกี่ยวข้อง (Recently Resolved แยก `RESOLVED`/`CLOSED`); Recent Actions และแถว Ticket เปิด Detail ด้วย `ticketId`. Queue เดิมไม่มีตัวกรองช่วง 7 วัน จึงเป็นหน้ารายการที่กว้างกว่า metric ล่าสุด ไม่อ้างว่าจำนวนแถวใน Queue เท่ากับ count ของ Dashboard; รายการ Dashboard เองยังต้องตรงกับช่วง 7 วัน

Lab 3 Backend รองรับ `currentStatus` หลายค่าแล้ว แต่ Client `MyTicketsQuery` และตัวเลือกใน My Tickets ปัจจุบันจำกัดเพียง `NEW`; งาน Dashboard ใน Issue ถัดไปต้องขยาย Client ให้รับ status จาก link object และนำ query ไปใช้เมื่อเปิด My Tickets โดยยังคง default/filter เดิมไว้. นี่เป็นแผนความเข้ากันได้ ไม่ใช่การแก้ Client ใน PR #68

- 200: success
- 401: AUTHENTICATION_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN

Administrator ใช้ GET /api/staff/dashboard ตาม role policy เดียวกัน ไม่สร้าง `/api/admin/dashboard` แยกใน Lab 4 เวอร์ชันนี้ เพื่อลด route ซ้ำและคงสิทธิ์ Dashboard ที่ตรวจสอบได้จาก Backend

## 8. Validation and Safe Errors

- 400 VALIDATION_ERROR: field missing, type ผิด, trimmed text ว่าง, `followUpRequired=true` แต่ไม่มี followUpNote, `followUpRequired=false` แต่ followUpNote ไม่เป็น `null` หรือ `status=REOPENED` แต่ไม่มี reopenReason
- 401 AUTHENTICATION_REQUIRED หรือ SESSION_INVALID: ไม่มีหรือใช้ session ไม่ได้; `AUTHENTICATION_FAILED` ใช้กับ Login ที่ credentials ไม่ถูกต้องหรือ account inactive ตาม Lab 3 baseline
- 403 ROLE_FORBIDDEN หรือ TICKET_FORBIDDEN: role/ownership ไม่อนุญาต
- 404 TICKET_NOT_FOUND, ACTION_NOT_FOUND หรือ USER_NOT_FOUND: ไม่พบ resource/assignee หรือใช้ safe response
- 405 METHOD_NOT_ALLOWED: operation ถูกห้าม เช่น Delete Action
- 409 STATUS_TRANSITION_NOT_ALLOWED: transition ไม่อยู่ใน matrix
- 409 RESOLUTION_GATE_FAILED: gate ก่อน RESOLVED หรือ CLOSED ไม่ผ่าน
- 409 STALE_UPDATE: version ไม่ตรง
- 409 ACTION_STATE_CONFLICT: Ticket อยู่ใน CLOSED/CANCELLED หรือ mutation พร้อมกันทำให้ Action เขียนต่อไม่ได้
- 500 INTERNAL_ERROR: error ปลอดภัยและไม่เผยรายละเอียดภายใน

## 9. Query and Date Rules

- Dashboard `recentTickets`, `recentlyResolvedTickets` และ `recentActions` ใช้ช่วงคงที่ `[asOf - 7 days, asOf)` ตาม timezone Asia/Bangkok; Client ไม่ส่ง start/end เองใน Lab 4
- Requester recentlyResolved ใช้ currentStatus เป็น RESOLVED/CLOSED และ updatedAt อยู่ในช่วง 7 วันล่าสุด
- Staff recentlyResolved ใช้ currentStatus เป็น RESOLVED/CLOSED และ updatedAt อยู่ในช่วง 7 วันล่าสุด; Staff recentActions ใช้ `performedBy.id` ของ session และ `actionAt` ในช่วงเดียวกัน
- Action list routes รับ query `page` และ `pageSize` ตาม Pagination convention; ไม่รับค่า metric count จาก Client
- Dashboard routes รับ `limit` เป็นจำนวนเต็ม 1–100; ค่าอื่นตอบ `400 VALIDATION_ERROR`
- ช่วงวันที่ใช้ [start, end) และรับ ISO 8601
- “วันนี้” แปลง Asia/Bangkok local midnight เป็น UTC ก่อน query
- ไม่ให้ Client ส่ง metric count เพื่อบังคับผลลัพธ์

## 10. Planned API Tests

ไฟล์ที่วางแผนไว้ตาม Labsheet:

- server/tests/lab-04/actions-taken.api.test.ts
- server/tests/lab-04/ticket-workflow.api.test.ts
- server/tests/lab-04/requester-dashboard.api.test.ts
- server/tests/lab-04/staff-dashboard.api.test.ts

สถานะทุก route และ response ในเอกสารนี้: Planned; ยังไม่มี implementation หรือผลรันจริง
