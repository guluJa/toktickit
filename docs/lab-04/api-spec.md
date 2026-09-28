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
- Backend เป็นผู้ตรวจ authentication, role, ownership, validation และ conflict
- ห้ามคืน password, passwordHash, token, cookie, SQL, stack trace หรือ internal path

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
- 401: `AUTH_REQUIRED` หรือ `SESSION_INVALID`
- 404: `TICKET_NOT_FOUND` หรือ safe owner-not-found response
- 500: `INTERNAL_ERROR` แบบไม่เปิดเผยรายละเอียด

Requester ใช้ POST/PATCH/DELETE กับ Action ไม่ได้

## 5. Staff/Admin Action Routes

### GET /api/staff/tickets/:ticketId/actions

IT Staff และ Administrator อ่าน Actions ของ Ticket ที่ตนมีสิทธิ์เห็นได้

- 200: `{ data: { items: ActionTaken[], pagination: { page, pageSize, totalItems, totalPages } } }`
- 400: `VALIDATION_ERROR` เมื่อ page/pageSize ไม่ถูกต้อง
- 401: `AUTH_REQUIRED` หรือ `SESSION_INVALID`
- 403: `ROLE_FORBIDDEN` หรือ `TICKET_FORBIDDEN`
- 404: `TICKET_NOT_FOUND`
- 500: `INTERNAL_ERROR` แบบไม่เปิดเผยรายละเอียด

### POST /api/staff/tickets/:ticketId/actions

IT Staff และ Administrator สร้าง Action ได้ตาม authorization policy

- 201: { data: { action: ActionTaken } }
- 400: VALIDATION_ERROR
- 401: AUTH_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN หรือ TICKET_FORBIDDEN
- 404: TICKET_NOT_FOUND
- 409: ACTION_CONFLICT หรือ ACTION_STATE_CONFLICT

performedBy ต้องมาจาก session ของผู้เรียก ไม่ใช่ request body

### PATCH /api/staff/tickets/:ticketId/actions/:actionId

IT Staff และ Administrator แก้ Action ได้เมื่อ version ตรงกัน

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
- 401: AUTH_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN หรือ TICKET_FORBIDDEN
- 404: ACTION_NOT_FOUND หรือ TICKET_NOT_FOUND
- 409: STALE_UPDATE หรือ ACTION_CONFLICT

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

`version` ต้องเป็นค่า `Ticket.version` ล่าสุดที่อ่านจาก Backend ไม่ใช่ `ActionTaken.version` และไม่ใช่ `updatedAt` ที่ Client สร้างเอง เมื่อสำเร็จ Backend เปลี่ยน Status และเพิ่ม `Ticket.version` เป็น 4 ใน transaction เดียวกัน

เมื่อ `status` เป็น `REOPENED` ต้องส่ง `reopenReason` ที่ trim แล้วไม่ว่างเพิ่มใน body; Status อื่นต้องไม่ส่ง `reopenReason` หรือส่งเป็น `null`

ตัวอย่าง `CLOSED → REOPENED`:

    {
      "status": "REOPENED",
      "version": 3,
      "reopenReason": "Requester reported the same issue again."
    }

- 200: `{ data: { ticket: StaffTicket } }` โดย `ticket.version` เป็นค่าหลัง update
- 400: VALIDATION_ERROR
- 401: AUTH_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN
- 404: TICKET_NOT_FOUND
- 409: `STATUS_TRANSITION_NOT_ALLOWED`, `RESOLUTION_GATE_FAILED` หรือ `STALE_UPDATE`
- เมื่อ version ไม่ตรง ต้องตอบ `{ error: { code: "STALE_UPDATE", message, fields: { expectedVersion, actualVersion } } }` และต้องไม่เปลี่ยน Status หรือ version

### POST /api/tickets/:ticketId/resolved

คง Requester indication จาก Lab 3:

- 200: { data: { resolved: true, requesterResolvedAt, currentStatus } }
- ต้องไม่เปลี่ยน currentStatus เป็น RESOLVED

## 7. Dashboard Routes

### GET /api/requester/dashboard

ใช้ได้เฉพาะ authenticated REQUESTER และคำนวณจาก Ticket ของตนเอง

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

`recentTickets` และ `recentlyResolvedTickets` ใช้รายการสรุปที่มี `id`, `ticketNumber`, `summary`, `currentStatus`, `requestedPriority`, `itPriority`, `updatedAt` และ `detailLink`; ห้ามมีข้อมูลของ Requester คนอื่น

- 200: success, รวม empty metrics ได้
- 401: AUTH_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN

### GET /api/staff/dashboard

ใช้ได้โดย IT Staff และ Administrator ตาม role policy

Response:

    {
      "data": {
        "timezone": "Asia/Bangkok",
        "asOf": "2026-01-01T09:00:00Z",
        "metrics": {
          "unassignedCount": 0,
          "mineCount": 0,
          "highPriorityCount": 0,
          "recentlyUpdatedCount": 0
        },
        "byStatus": {},
        "byPriority": {},
        "recentTickets": [],
        "recentActions": [],
        "links": []
      }
    }

Metrics ต้องประกอบด้วย unassignedCount, mineCount, byStatus, byPriority, highPriorityCount, recentlyUpdatedCount และ drill-down links

`recentTickets` แต่ละรายการต้องมี `id`, `ticketNumber`, `summary`, `currentStatus`, `requestedPriority`, `itPriority`, `owner`, `updatedAt` และ `detailLink` โดย `owner` เป็น SafeUser หรือ `null`

`recentActions` แต่ละรายการต้องมี `id`, `ticketId`, `actionAt`, `description`, `result`, `performedBy` และ `detailLink` โดย `performedBy` เป็น SafeUser

- 200: success
- 401: AUTH_REQUIRED หรือ SESSION_INVALID
- 403: ROLE_FORBIDDEN

Administrator ใช้ GET /api/staff/dashboard ตาม role policy เดียวกัน ไม่สร้าง `/api/admin/dashboard` แยกใน Lab 4 เวอร์ชันนี้ เพื่อลด route ซ้ำและคงสิทธิ์ Dashboard ที่ตรวจสอบได้จาก Backend

## 8. Validation and Safe Errors

- 400 VALIDATION_ERROR: field missing, type ผิด, trimmed text ว่าง, `followUpRequired=true` แต่ไม่มี followUpNote, `followUpRequired=false` แต่ followUpNote ไม่เป็น `null` หรือ `status=REOPENED` แต่ไม่มี reopenReason
- 401 AUTH_REQUIRED หรือ SESSION_INVALID: ไม่มีหรือใช้ session ไม่ได้
- 403 ROLE_FORBIDDEN หรือ TICKET_FORBIDDEN: role/ownership ไม่อนุญาต
- 404 TICKET_NOT_FOUND หรือ ACTION_NOT_FOUND: ไม่พบ resource หรือใช้ safe response
- 405 METHOD_NOT_ALLOWED: operation ถูกห้าม เช่น Delete Action
- 409 STATUS_TRANSITION_NOT_ALLOWED: transition ไม่อยู่ใน matrix
- 409 RESOLUTION_GATE_FAILED: gate ก่อน Resolved ไม่ผ่าน
- 409 STALE_UPDATE: version ไม่ตรง
- 409 ACTION_CONFLICT: conflict อื่นที่ระบุใน Contract
- 500 INTERNAL_ERROR: error ปลอดภัยและไม่เผยรายละเอียดภายใน

## 9. Query and Date Rules

- Dashboard default recentlyUpdated ใช้ช่วง 7 วันล่าสุด
- Requester recentlyResolved ใช้ currentStatus เป็น RESOLVED/CLOSED และ updatedAt อยู่ในช่วง 7 วันล่าสุด
- Action list routes รับ query `page` และ `pageSize` ตาม Pagination convention; ไม่รับค่า metric count จาก Client
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
