# TokTickIT Lab 3 REST API Contract

เอกสารนี้กำหนด API contract สำหรับ Lab 3 ให้สอดคล้องกับ specification, ui-spec และ tests ทุก endpoint เป็น contract สำหรับการ implement ในลำดับถัดไป

## 1. Conventions and Response Envelope

- Base path: /api
- JSON media type: application/json
- Date/time: ISO 8601 UTC string
- ID: positive integer
- Session: opaque server-side token ใน HttpOnly cookie ชื่อ toktickit_session
- ทุก protected endpoint ตรวจ session, active state, role และ ownership ที่ Backend
- ห้ามส่ง password, password hash, session token, storage key, local path, SQL หรือ stack trace กลับ Client

Success response ของ Authentication, Staff และ Administrator routes ใช้ `data` envelope เดียวกัน ส่วน Requester Ticket/Attachment routes ในหัวข้อ 4–5 รักษา Lab 2-compatible response shape ตามที่ระบุราย route ด้านล่าง โดย shape ที่ระบุไว้ของแต่ละ route เป็น normative contract:

```json
{ "data": { "resource": "..." } }
```

List response ใช้รูปแบบเดียวกันทุก list endpoint:

```json
{
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 0,
      "totalPages": 0
    }
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data is invalid.",
    "fields": { "fieldName": "Reason for the field error." }
  }
}
```

### 1.1 Shared response schemas

The following schemas are normative. Every endpoint that returns the corresponding resource MUST use exactly these fields and MUST omit password, passwordHash, session tokens, storage keys, local paths and stack traces.

`SafeUser`

```json
{
  "id": 1,
  "name": "Example User",
  "email": "user@example.test",
  "role": "REQUESTER",
  "isActive": true,
  "mustChangePassword": false
}
```

`TicketSummary`

```json
{
  "id": 15,
  "ticketNumber": "TKT-20260910-00000015",
  "summary": "Laptop cannot connect to Wi-Fi",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Network Access" },
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "OPEN",
  "owner": null,
  "createdAt": "2026-09-10T10:00:00.000Z",
  "updatedAt": "2026-09-10T10:00:00.000Z"
}
```

สำหรับ Staff Queue หาก `owner` ไม่เป็น `null` ต้องส่งเฉพาะ `{ "id": number, "name": string, "role": UserRole }` เท่านั้น ห้ามส่ง `email`, `isActive` หรือ `mustChangePassword`

`TicketDetail` is the following complete shape (it includes all `TicketSummary` fields):

```json
{
  "id": 15,
  "ticketNumber": "TKT-20260910-00000015",
  "summary": "Laptop cannot connect to Wi-Fi",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Network Access" },
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "OPEN",
  "owner": null,
  "createdAt": "2026-09-10T10:00:00.000Z",
  "updatedAt": "2026-09-10T10:00:00.000Z",
  "requester": { "id": 1, "name": "Example User", "email": "user@example.test" },
  "description": "The connection disconnects after a few minutes.",
  "requesterResolvedAt": null,
  "attachments": [],
  "comments": []
}
```

`PublicComment` and `InternalNote` use the same shape; their visibility is controlled by authorization:

```json
{
  "id": 21,
  "author": { "id": 2, "name": "Support User" },
  "content": "The issue is still occurring.",
  "createdAt": "2026-09-10T10:05:00.000Z"
}
```

`AttachmentMetadata`

```json
{
  "id": 31,
  "originalName": "network-error.png",
  "mimeType": "image/png",
  "sizeBytes": 38400,
  "uploadedAt": "2026-09-10T10:00:00.000Z",
  "removedAt": null,
  "removalReason": null
}
```

For a removed attachment, `removedAt` and `removalReason` are populated and download is unavailable. `storedFilename` and any storage path are never returned.

## 2. Authentication

### 2.1 POST /api/auth/login

Request body:

```json
{ "email": "user@example.test", "password": "user supplied password" }
```

Validation: email และ password เป็น required string, trim/lowercase email, email ยาวไม่เกิน 254 ตัวอักษร และห้ามส่ง field ที่ใช้กำหนด role หรือ identity

Success 200:

```json
{
  "data": {
    "user": {
      "id": 1, "name": "Example User", "email": "user@example.test",
      "role": "REQUESTER", "isActive": true, "mustChangePassword": true
    }
  }
}
```

ส่ง Set-Cookie เป็น HttpOnly, SameSite=Lax และมี bounded expiry โดยไม่เปิดเผย token ใน JSON

Errors: 400 VALIDATION_ERROR เมื่อข้อมูลไม่ครบ/รูปแบบไม่ถูกต้อง, 401 AUTHENTICATION_FAILED เมื่อ credentials ไม่ถูกต้องหรือ user inactive, 500 INTERNAL_ERROR

### 2.2 GET /api/auth/me

ไม่มี request body หรือ query

Success 200: `{ "data": { "user": SafeUser } }`

Errors: 401 AUTHENTICATION_REQUIRED เมื่อไม่มี cookie, 401 SESSION_INVALID เมื่อ cookie หมดอายุ/ถูกยกเลิก/user inactive, 500 INTERNAL_ERROR

### 2.3 POST /api/auth/logout

ไม่มี request body

Success 200 (idempotent): { "data": { "loggedOut": true } } พร้อมล้าง cookie และลบ session ปัจจุบันถ้ามี

Errors: 500 INTERNAL_ERROR เฉพาะ unexpected failure และห้ามเปิดเผยรายละเอียดฐานข้อมูล

### 2.4 POST /api/auth/change-password

Request body:

```json
{ "newPassword": "New-Password1!", "confirmPassword": "New-Password1!" }
```

Validation: ทั้งสอง field เป็น required string, ยาว 12-128 ตัวอักษร, มี lowercase, uppercase, digit และ symbol และต้องตรงกัน

Success 200: `{ "data": { "user": SafeUser } }` with `mustChangePassword=false`.

Errors: 401 AUTHENTICATION_REQUIRED/SESSION_INVALID, 400 VALIDATION_ERROR, 500 INTERNAL_ERROR

ระหว่าง first-login gate อนุญาต GET /auth/me, POST /auth/logout และ POST /auth/change-password เท่านั้น; protected endpoint อื่นตอบ 403 PASSWORD_CHANGE_REQUIRED

## 3. Reference Data

### 3.1 GET /api/categories

ไม่มี body/query; คืนเฉพาะ active categories เรียง name asc, id asc

Success 200: `[{ "id": 1, "name": "Hardware" }]` (raw array; ไม่ห่อ `data` เพื่อคง Lab 2-compatible reference-data response)

Errors: 500 INTERNAL_ERROR

### 3.2 GET /api/related-systems

ไม่มี body/query; คืนเฉพาะ active related systems เรียง name asc, id asc

Success 200: `[{ "id": 1, "name": "Email", "description": "Mail service" }]` (raw array; ไม่ห่อ `data` เพื่อคง Lab 2-compatible reference-data response)

Errors: 500 INTERNAL_ERROR

## 4. Requester Ticket and Comment Routes

ทุก route ในส่วนนี้ derive requesterId จาก authenticated session เท่านั้น ห้ามรับ requesterId จาก body/query และ cross-owner resource ต้องตอบ safe 404

### 4.1 POST /api/tickets

Request body:

```json
{
  "submissionKey": "550e8400-e29b-41d4-a716-446655440000",
  "categoryId": 2, "relatedSystemId": 2,
  "summary": "Laptop cannot connect to Wi-Fi",
  "requestedPriority": "MEDIUM",
  "description": "The connection disconnects after a few minutes."
}
```

Validation: submissionKey เป็น UUID; categoryId/relatedSystemId เป็น positive integer ที่อ้าง active record; summary trim 5-150 ตัวอักษร; description trim 10-5000 ตัวอักษร; requestedPriority เป็น LOW/MEDIUM/HIGH; reject requesterId, ticketNumber, status และ timestamps จาก Client

Success 201 เมื่อสร้างใหม่ หรือ 200 เมื่อ replay submissionKey เดิม: `{ "ticket": TicketDetail, "replayed": false }` (Requester-compatible response; ไม่ห่อ `data`)

Errors: 400 VALIDATION_ERROR, 401 authentication/session error, 403 PASSWORD_CHANGE_REQUIRED/ROLE_FORBIDDEN, 404 REFERENCE_NOT_FOUND, 409 TICKET_NUMBER_CONFLICT หรือ duplicate submission conflict, 500 INTERNAL_ERROR โดย transaction ที่ล้มเหลวต้องไม่เหลือ partial ticket

### 4.2 GET /api/tickets

Query: search, categoryId, relatedSystemId, requestedPriority, currentStatus, sortBy, sortDirection, page และ pageSize; defaults updatedAt desc, page 1, pageSize 10

Validation: search ยาวไม่เกิน 100, IDs เป็น positive integer, enum ถูกต้อง, page เป็น positive integer, pageSize เป็น 10/20/50; invalid query ตอบ 400 INVALID_TICKET_LIST_QUERY

Success 200: `{ "items": [TicketSummary], "page": 1, "pageSize": 10, "totalOwnedItems": 0, "totalItems": 0, "totalPages": 0 }` (Requester-compatible response; ไม่ห่อ `data`) โดยคืนเฉพาะ Ticket ของ authenticated Requester; page 1 ที่ไม่มีผลลัพธ์ตอบ items: [] และ totalItems: 0 ไม่ใช่ error

Errors: 401, 403 PASSWORD_CHANGE_REQUIRED, 400 INVALID_TICKET_LIST_QUERY, 500 INTERNAL_ERROR

### 4.3 GET /api/tickets/:ticketId

ไม่มี body/query; ticketId ต้องเป็น positive integer

Success 200: `TicketDetail` โดยตรง (Requester-compatible response; ไม่ห่อ `data`); the detail includes `AttachmentMetadata` for active and removed attachments.

Errors: 400 INVALID_TICKET_ID, 401, 403, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

### 4.4 GET /api/tickets/:ticketId/comments

ไม่มี body/query และต้องเป็น owned ticket

เส้นทางนี้เป็น Requester workspace โดยเฉพาะ ผู้ใช้ IT Staff หรือ Administrator ต้องใช้ `GET /api/staff/tickets/:ticketId/comments` ตามหัวข้อ 6.6 เพื่ออ่าน Public Comments ของ Ticket ที่ตนมีสิทธิ์เห็น

Success 200: `{ "data": { "items": [PublicComment] } }`

Errors: 400 INVALID_TICKET_ID, 401, 403, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

### 4.5 POST /api/tickets/:ticketId/comments

Request body: { "content": "The issue is still occurring." }

Validation: content เป็น trimmed non-empty string ยาวไม่เกิน 5,000 ตัวอักษร; author และ ticket มาจาก session/path

เส้นทางนี้รับเฉพาะ Requester เจ้าของ Ticket ส่วน IT Staff ใช้ `POST /api/staff/tickets/:ticketId/comments` เพื่อเพิ่ม Public Comment และ Administrator ใช้ staff endpoint สำหรับอ่านตามสิทธิ์ (ไม่มีสิทธิ์เพิ่ม comment ตาม authorization matrix)

Success 201: `{ "data": { "comment": PublicComment } }`

Errors: 400 INVALID_TICKET_ID/VALIDATION_ERROR, 401, 403, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

### 4.6 POST /api/tickets/:ticketId/resolved

Request body: {} เท่านั้น; ticketId เป็น positive integer

Success 200: `{ "data": { "resolved": true, "requesterResolvedAt": "...", "currentStatus": "IN_PROGRESS" } }`; ทำซ้ำได้และไม่เปลี่ยน formal status

Errors: 400 INVALID_TICKET_ID, 401, 403, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

## 5. Attachment Routes

### 5.1 POST /api/tickets/:ticketId/attachments

Request เป็น multipart/form-data field `file` (ไฟล์เดียวต่อ request) และไม่รับ requesterId

Validation: .jpg/.jpeg/.png/.webp/.pdf เท่านั้น, MIME ต้องตรง extension, แต่ละไฟล์ไม่เกิน 5 MiB, active attachments รวมไม่เกิน 5, backend sanitize filename และสร้าง storage key

Success 201: `AttachmentMetadata` โดยตรง (Requester-compatible response; upload route รับไฟล์เดียวต่อ request)

Errors: 400 INVALID_TICKET_ID/ATTACHMENT_REQUIRED, 401, 403, safe 404 TICKET_NOT_FOUND, 409 ATTACHMENT_LIMIT_REACHED, 413 ATTACHMENT_TOO_LARGE, 415 UNSUPPORTED_ATTACHMENT_TYPE, 500 INTERNAL_ERROR พร้อม compensation cleanup หาก metadata creation ล้มเหลว

### 5.2 GET /api/tickets/:ticketId/attachments

ไม่มี body/query

Success 200: `{ "items": [AttachmentMetadata] }` (Requester-compatible response; ไม่ห่อ `data`) รวม Active และ Removed เรียง uploadedAt asc, id asc

Errors: 400 INVALID_TICKET_ID, 401, 403, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

### 5.3 GET /api/attachments/:attachmentId

ไม่มี body/query; attachmentId ต้องเป็น positive integer และ Attachment ต้องอยู่ใน Ticket ของ authenticated Requester

Success 200: `AttachmentMetadata` โดยตรง (Requester-compatible response; ไม่ห่อ `data`)

Errors: 400 INVALID_ATTACHMENT_ID, 401, 403, safe 404 ATTACHMENT_NOT_FOUND, 500 INTERNAL_ERROR

### 5.4 GET /api/attachments/:attachmentId/download

ไม่มี body/query; ตรวจ ownership ผ่าน Ticket

Requester ดาวน์โหลดได้เฉพาะ Attachment ของ Ticket ตนเอง ส่วน IT Staff และ Administrator ดาวน์โหลดได้เมื่อมีสิทธิ์เปิด Staff Ticket Detail ของ Ticket นั้นในฐานะ read-only viewer. Staff และ Administrator ไม่มีสิทธิ์ใช้ endpoint upload หรือ remove ใน Issue นี้

Success 200: file stream พร้อม stored MIME และ safe Content-Disposition

Errors: 400 INVALID_ATTACHMENT_ID, 401, 403, safe 404 ATTACHMENT_NOT_FOUND, 410 ATTACHMENT_REMOVED, 500 INTERNAL_ERROR; Removed file ห้ามถูกเปิดหรือ stream

### 5.5 DELETE /api/attachments/:attachmentId

Request body: { "removalReason": "The wrong screenshot was attached." }

Validation: reason เป็น trimmed non-empty string ยาว 5-250 ตัวอักษร; removed-by identity มาจาก authenticated Requester ไม่รับจาก Client

Success 200: `AttachmentMetadata` โดยตรง (Requester-compatible response; ไม่ห่อ `data`); record และ metadata ยังคงอยู่ แต่ Download ถูก block

Errors: 400 INVALID_ATTACHMENT_ID/INVALID_REMOVAL_REASON, 401, 403, safe 404 ATTACHMENT_NOT_FOUND, 409 ATTACHMENT_ALREADY_REMOVED, 500 INTERNAL_ERROR

## 6. IT Staff Queue and Ticket Routes

ทุก route ต้องมี active IT_STAFF หรือ ADMINISTRATOR ตาม authorization matrix และห้ามส่ง Internal Notes ให้ Requester

### 6.1 GET /api/staff/tickets

ไม่มี body. Query parameters:

- search: case-insensitive ใน ticketNumber หรือ summary
- status: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, CANCELLED
- requestedPriority และ itPriority: LOW, MEDIUM, HIGH
- ownerId: active owner ID หรือ unassigned
- sortBy: ticketNumber, summary, createdAt, updatedAt, itPriority, currentStatus
- sortOrder: asc หรือ desc
- page: positive integer, default 1
- pageSize: 10, 20 หรือ 50, default 10

Validation: unknown parameter, enum ไม่ถูกต้อง, page ไม่เป็น positive integer หรือ pageSize ไม่รองรับ ตอบ 400 INVALID_QUERY

Success 200:

```json
{
  "data": {
    "items": [TicketSummary],
    "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 }
  }
}
```

Default ordering คือ updatedAt desc และ tie-breaker id asc. หาก page=1 ไม่มีผลลัพธ์ ต้องตอบ 200 พร้อม items ว่างเสมอ; เฉพาะ page ที่มากกว่าช่วงที่มีจริงจึงตอบ 400 PAGE_OUT_OF_RANGE

Errors: 401 AUTHENTICATION_REQUIRED/SESSION_INVALID, 403 ROLE_FORBIDDEN/PASSWORD_CHANGE_REQUIRED, 400 INVALID_QUERY/PAGE_OUT_OF_RANGE, 500 INTERNAL_ERROR

### 6.2 GET /api/staff/tickets/:ticketId

ไม่มี body/query; ticketId เป็น positive integer

Success 200: `{ "data": { "ticket": TicketDetail, "comments": [PublicComment], "internalNotes": [InternalNote] } }`

Errors: 400 INVALID_ID, 401, 403 ROLE_FORBIDDEN, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

### 6.3 POST /api/staff/tickets/:ticketId/assignment

Request body: { "ownerId": 12 } หรือ { "ownerId": null }

Validation: ownerId ต้องอ้าง active IT Staff หรือ Administrator; เฉพาะ IT Staff แก้ assignment ได้

Success 200: `{ "data": { "ticket": TicketDetail } }`

Errors: 400 VALIDATION_ERROR, 401, 403 ROLE_FORBIDDEN, safe 404 TICKET_NOT_FOUND/USER_NOT_FOUND, 409 USER_UPDATE_CONFLICT, 500 INTERNAL_ERROR

### 6.4 PATCH /api/staff/tickets/:ticketId/priority

Request body: { "itPriority": "HIGH" }; ค่าเป็น LOW/MEDIUM/HIGH เท่านั้น

Success 200: `{ "data": { "ticket": TicketDetail } }`

Errors: 400 VALIDATION_ERROR, 401, 403 ROLE_FORBIDDEN, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

### 6.5 PATCH /api/staff/tickets/:ticketId/status

Request body: { "status": "IN_PROGRESS" }; ต้องผ่าน transition matrix ใน specification.md

Success 200: `{ "data": { "ticket": TicketDetail } }`

Errors: 400 VALIDATION_ERROR, 401, 403 ROLE_FORBIDDEN, safe 404 TICKET_NOT_FOUND, 409 STATUS_TRANSITION_NOT_ALLOWED, 500 INTERNAL_ERROR

### 6.6 Staff comments and notes

GET /api/staff/tickets/:ticketId/comments และ GET /api/staff/tickets/:ticketId/notes ไม่มี body และตอบ 200 ด้วย `{ "data": { "items": [PublicComment|InternalNote] } }`. POST ของแต่ละ route รับ `{ "content": "..." }` เป็น trimmed non-empty string ยาวไม่เกิน 5,000 ตัวอักษร และตอบ 201 ด้วย `{ "data": { "comment": PublicComment } }` หรือ `{ "data": { "note": InternalNote } }` ตาม route

GET อนุญาต IT Staff/Administrator; POST อนุญาต IT Staff เท่านั้น. Errors: 400 VALIDATION_ERROR, 401, 403 ROLE_FORBIDDEN, safe 404 TICKET_NOT_FOUND, 500 INTERNAL_ERROR

## 7. Administrator User-management Routes

ทุก route ต้องใช้ authenticated active Administrator; non-admin ตอบ 403 ROLE_FORBIDDEN โดยไม่เปิดเผยข้อมูลผู้ใช้

### 7.1 GET /api/admin/users

Query: `search` (name/email, case-insensitive, 1-254 characters), `role` (`REQUESTER|IT_STAFF|ADMINISTRATOR`), `isActive` (`true|false`), `page` (positive integer, default `1`) และ `pageSize` (integer 1-100, default `20`). รูปแบบ query ไม่ถูกต้องตอบ 400 `INVALID_QUERY`; page ที่มากกว่าจำนวนหน้าจริงตอบ 400 `PAGE_OUT_OF_RANGE`

Success 200: `{ "data": { "items": [SafeUser], "pagination": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 0 } } }`; รายการเรียง `name asc, id asc` และไม่คืน `passwordHash`, password หรือ session fields

Errors: 401, 403 `ROLE_FORBIDDEN`, 400 `INVALID_QUERY`/`PAGE_OUT_OF_RANGE`, 500 `INTERNAL_ERROR`

### 7.2 POST /api/admin/users

Request body:

```json
{ "name": "New Staff", "email": "staff@example.test", "role": "IT_STAFF", "isActive": true, "initialPassword": "Initial-Password1!" }
```

Validation: `name` เป็น trimmed string ยาว 1-150 ตัวอักษร, `email` เป็น valid string ยาวไม่เกิน 254 ตัวอักษรและ unique แบบ case-insensitive, `role` ต้องเป็น `REQUESTER|IT_STAFF|ADMINISTRATOR`, `isActive` ต้องเป็น Boolean, และ `initialPassword` ต้องผ่าน policy 12-128 ตัวอักษร; ห้าม client กำหนด id หรือ session fields. Invalid role, invalid `isActive` หรือ field type ตอบ `400 VALIDATION_ERROR`.

Success 201: `{ "data": { "user": SafeUser } }` โดย User ใหม่มี `mustChangePassword=true` และ `isActive` ตาม request

Errors: 400 VALIDATION_ERROR, 401, 403 ROLE_FORBIDDEN, 409 DUPLICATE_EMAIL, 500 INTERNAL_ERROR

### 7.3 PATCH /api/admin/users/:userId

Request body รับเฉพาะ field ต่อไปนี้ และต้องมีอย่างน้อยหนึ่ง field: `name` (optional trimmed string 1-150), `email` (optional valid string ไม่เกิน 254 ตัวอักษรและ unique แบบ case-insensitive), `role` (optional `REQUESTER|IT_STAFF|ADMINISTRATOR`) และ `isActive` (optional Boolean). ห้ามส่ง `id`, `passwordHash`, `mustChangePassword`, `lastLoginAt`, session fields หรือ unknown fields. `userId` ต้องเป็น positive integer. Administrator ห้าม deactivate ตนเองหรือทำให้จำนวน active Administrator เป็นศูนย์

Success 200: `{ "data": { "user": SafeUser } }`

Errors: 400 `INVALID_ID` เมื่อ `userId` ไม่ใช่ positive integer, 400 `VALIDATION_ERROR` สำหรับ body ไม่ถูกต้อง, 401, 403 `ROLE_FORBIDDEN`, safe 404 `USER_NOT_FOUND`, 409 `DUPLICATE_EMAIL`/`USER_UPDATE_CONFLICT`, 500 `INTERNAL_ERROR`. การ deactivate ต้อง revoke sessions ของ target และ request ถัดไปตอบ 401 `SESSION_INVALID`

### 7.4 POST /api/admin/users/:userId/initial-password

Request body: { "initialPassword": "Initial-Password1!" }

Validation: password policy; ตั้ง mustChangePassword=true และไม่คืน password/hash

Success 200: `{ "data": { "user": SafeUser } }` โดย `mustChangePassword=true`

Errors: 400 `INVALID_ID` เมื่อ `userId` ไม่ใช่ positive integer, 400 `VALIDATION_ERROR` สำหรับ body ไม่ถูกต้อง, 401, 403 `ROLE_FORBIDDEN`, safe 404 `USER_NOT_FOUND`, 500 `INTERNAL_ERROR`

## 8. Global Status and Security Rules

| Status | Meaning |
|---|---|
| 200 | Retrieval/update, idempotent logout/resolved หรือ page-1 empty list |
| 201 | Ticket, comment, note หรือ attachment created |
| 400 | Malformed body/path/query, invalid enum, validation หรือ out-of-range page |
| 401 | Missing/invalid/expired session |
| 403 | First-login gate หรือ authenticated user ไม่มีสิทธิ์ |
| 404 | Missing/protected resource แบบ safe response |
| 409 | Duplicate, transition, ownership หรือ safety conflict |
| 410 | Removed attachment download หรือ retired Development Requester route |
| 413 | Attachment เกิน 5 MiB |
| 415 | Unsupported/mismatched media type |
| 500 | Unexpected failure แบบ safe message |

`LAB2_COMPATIBILITY_MODE=true` ใช้เฉพาะ non-production regression/migration tooling; เมื่อปิด mode หรืออยู่ production ห้ามใช้ `X-Development-Requester-Id` bypass authentication และ `/api/development-requesters` ตอบ 410 DEVELOPMENT_REQUESTERS_RETIRED
