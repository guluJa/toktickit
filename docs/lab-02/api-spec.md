# Lab 2 REST API Specification

เอกสารนี้กำหนด REST API Contract ของ TokTickIT Lab 2 ให้สอดคล้องกับ `specification.md`, `ui-spec.md` และ `tests.md` ทุก Requester-specific Endpoint ต้องบังคับ Requester Context และ Ownership ใน Backend

## 1. Conventions

- Base path: `/api`
- Media type สำหรับ JSON: `application/json`
- Date/time: ISO 8601 UTC string
- ID: Positive integer
- Requester-specific requests ใช้ Header:

```http
X-Development-Requester-Id: 1
```

Header นี้เป็น Testing Context เท่านั้น ไม่ใช่ Authentication และ Ticket request body ห้ามมี `requesterId`

### Requester Context Errors

- Header หายหรือไม่ใช่ Positive Integer: HTTP 400
- Requester ไม่มีอยู่หรือ Inactive: HTTP 403
- Ticket/Attachment ไม่มีอยู่หรือเป็นของ Requester อื่น: Safe HTTP 404

## 2. Common Shapes

### 2.1 Safe Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request data is invalid.",
    "fields": {
      "summary": "Summary must contain 5 to 150 characters."
    }
  }
}
```

- `error.code`: Stable machine-readable code
- `error.message`: Safe user-readable message
- `error.fields`: Optional map สำหรับ Field/Parameter errors
- Error response ห้ามมี Stack Trace, SQL, Database detail, Local Path หรือ Secret

### 2.2 Reference Data

```json
{
  "id": 1,
  "name": "Hardware"
}
```

Related System อาจมี `description`; API ส่งเฉพาะ Active records และเรียง `name asc`, `id asc`

### 2.3 Ticket Summary

```json
{
  "id": 15,
  "ticketNumber": "TKT-20260825-A1B2C3",
  "summary": "Laptop cannot connect to Wi-Fi",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Campus Wi-Fi" },
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-25T03:20:00.000Z",
  "updatedAt": "2026-08-25T03:20:00.000Z"
}
```

### 2.4 Ticket Detail

```json
{
  "id": 15,
  "ticketNumber": "TKT-20260825-A1B2C3",
  "requester": {
    "id": 1,
    "name": "Narin Chaiyasit",
    "email": "narin@example.test"
  },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Campus Wi-Fi" },
  "summary": "Laptop cannot connect to Wi-Fi",
  "requestedPriority": "MEDIUM",
  "description": "The connection disconnects after a few minutes.",
  "currentStatus": "NEW",
  "createdAt": "2026-08-25T03:20:00.000Z",
  "updatedAt": "2026-08-25T03:20:00.000Z",
  "attachments": []
}
```

### 2.5 Attachment Metadata

```json
{
  "id": 8,
  "ticketId": 15,
  "originalName": "wifi-error.png",
  "mimeType": "image/png",
  "sizeBytes": 245760,
  "state": "ACTIVE",
  "uploadedAt": "2026-08-25T03:22:00.000Z",
  "removedAt": null,
  "removalReason": null
}
```

`storageKey`, Private Local Path และ `removedByRequesterId` ไม่ส่งให้ Client โดยตรง

## 3. Status and Error Codes

| Status | Use |
|---|---|
| 200 | Retrieval, download metadata response หรือ successful soft removal |
| 201 | Ticket หรือ Attachment created |
| 400 | Missing/malformed Header, invalid body/query/path parameter |
| 403 | Development Requester ไม่มีอยู่หรือ Inactive |
| 404 | Resource ไม่มีอยู่หรือเป็นของ Requester อื่น |
| 409 | State/unique conflict เช่น Remove ซ้ำ |
| 410 | Download Removed Attachment |
| 413 | Attachment เกิน 5 MB |
| 415 | Unsupported type หรือ MIME/extension mismatch |
| 500 | Safe unexpected server error |

## 4. Reference and Requester Endpoints

### 4.1 GET `/api/categories`

Purpose: คืน Active Categories สำหรับ Form และ Filter

- Requester Header: ไม่ต้องใช้
- Success: HTTP 200

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" }
]
```

Errors: Safe 500

### 4.2 GET `/api/related-systems`

Purpose: คืน Active Related Systems สำหรับ Form และ Filter

- Requester Header: ไม่ต้องใช้
- Success: HTTP 200

```json
[
  { "id": 1, "name": "Email", "description": "University email service" }
]
```

Errors: Safe 500

### 4.3 GET `/api/development-requesters`

Purpose: คืน Active Development Requesters สำหรับ Selection screen

- Requester Header: ไม่ต้องใช้
- Success: HTTP 200

```json
[
  { "id": 1, "name": "Narin Chaiyasit", "email": "narin@example.test" }
]
```

Inactive Requesters ต้องไม่อยู่ใน Response; Errors: Safe 500

### 4.4 GET `/api/development-requesters/:requesterId`

Purpose: ตรวจ Requester ID ที่เก็บใน Client เมื่อเริ่ม Application

- `requesterId`: Positive integer
- Success: HTTP 200 พร้อม Active Requester
- Invalid ID: 400
- Missing Requester: 404
- Inactive Requester: 403

## 5. Ticket Endpoints

### 5.1 POST `/api/tickets`

Purpose: สร้าง Ticket หนึ่งรายการให้ Current Requester

Headers:

```http
Content-Type: application/json
X-Development-Requester-Id: 1
```

Request body:

```json
{
  "submissionKey": "550e8400-e29b-41d4-a716-446655440000",
  "categoryId": 2,
  "relatedSystemId": 2,
  "summary": "Laptop cannot connect to Wi-Fi",
  "requestedPriority": "MEDIUM",
  "description": "The connection disconnects after a few minutes."
}
```

Validation:

- `submissionKey`: Required UUID ที่ Client สร้างสำหรับหนึ่ง Submission
- `categoryId`, `relatedSystemId`: Required Positive Integer และอ้างถึง Active record
- `summary`: Required, trim, 5-150 characters
- `requestedPriority`: `LOW`, `MEDIUM` หรือ `HIGH`
- `description`: Required, trim, 10-5000 characters
- Body ห้ามกำหนด `requesterId`, `ticketNumber`, `currentStatus`, `createdAt` หรือ `updatedAt`

Success:

- HTTP 201 เมื่อสร้าง Ticket ใหม่ โดย `ticket` เป็น Ticket Detail object และ `replayed` เป็น `false`
- HTTP 200 เมื่อ Requester เดิมส่ง `submissionKey` เดิมซ้ำ โดย `ticket` เป็น Ticket Detail object รายการเดิมและ `replayed` เป็น `true`

ตัวอย่าง Response envelope (โครงสร้างเดียวกันสำหรับทั้ง HTTP 201 และ HTTP 200):

```json
{
  "ticket": {
    "id": 15,
    "ticketNumber": "TKT-20260825-A1B2C3",
    "requester": {
      "id": 1,
      "name": "Narin Chaiyasit",
      "email": "narin@example.test"
    },
    "category": { "id": 2, "name": "Hardware" },
    "relatedSystem": { "id": 2, "name": "Campus Wi-Fi" },
    "summary": "Laptop cannot connect to Wi-Fi",
    "requestedPriority": "MEDIUM",
    "description": "The connection disconnects after a few minutes.",
    "currentStatus": "NEW",
    "createdAt": "2026-08-25T03:20:00.000Z",
    "updatedAt": "2026-08-25T03:20:00.000Z",
    "attachments": []
  },
  "replayed": false
}
```

Field `replayed` อยู่ระดับบนสุดข้าง `ticket` เสมอ Frontend ต้องอ่านข้อมูล Ticket จาก `response.ticket`

Backend ต้อง:

- ใช้ Requester ID จาก Header
- บังคับ Unique Constraint ที่ `(requesterId, submissionKey)` ภายใน Transaction
- สร้าง Unique `TKT-YYYYMMDD-XXXXXX`
- กำหนด `currentStatus` เป็น `NEW`
- ใช้ Database timestamps

Errors:

- 400: Invalid body หรือ inactive/missing Reference Data
- 403: Invalid Requester context
- 409: Ticket Number conflict ที่ Retry ภายในขอบเขตที่กำหนดแล้วยังไม่สำเร็จ
- 500: Safe unexpected error; ห้ามเหลือ Partial Ticket

Attachment ไม่อยู่ใน Request นี้ โดย Upload หลัง Ticket creation สำเร็จ

### 5.2 GET `/api/tickets`

Purpose: คืน Paginated Tickets ของ Current Requester เท่านั้น

Query parameters:

| Parameter | Required | Rule |
|---|---|---|
| `search` | No | Trim, case-insensitive, Ticket Number/Summary, max 100 |
| `categoryId` | No | Positive integer |
| `relatedSystemId` | No | Positive integer |
| `requestedPriority` | No | `LOW`, `MEDIUM`, `HIGH` |
| `currentStatus` | No | `NEW` |
| `sortBy` | No | `updatedAt`, `createdAt`, `ticketNumber`; default `updatedAt` |
| `sortDirection` | No | `asc`, `desc`; default `desc` |
| `page` | No | Positive integer; default 1 |
| `pageSize` | No | 10, 20, 50; default 10 |

Secondary sort ใช้ `id desc` เพื่อให้ลำดับคงที่

Success: HTTP 200

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalOwnedItems": 0,
  "totalItems": 0,
  "totalPages": 0
}
```

`items` ใช้ Ticket Summary shape; Page ที่เกินช่วงคืน `items: []` พร้อม Metadata จริง โดย `totalOwnedItems` คือจำนวน Ticket ทั้งหมดของ Current Requester ก่อนใช้ Search/Filters ส่วน `totalItems` คือจำนวนที่ตรงกับเงื่อนไขปัจจุบัน

Errors: 400 Invalid Query, 403 Invalid Requester context, Safe 500

### 5.3 GET `/api/tickets/:ticketId`

Purpose: คืน Ticket Detail ที่ Current Requester เป็นเจ้าของ

- `ticketId`: Positive integer
- Success: HTTP 200 พร้อม Ticket Detail และ Attachment Metadata ทั้ง Active/Removed
- Errors: 400 Invalid ID, 403 Invalid Requester context, Safe 404 Missing/Cross-owner, Safe 500

## 6. Attachment Endpoints

### 6.1 POST `/api/tickets/:ticketId/attachments`

Purpose: Upload หนึ่ง Attachment ให้ Owned Ticket

Headers:

```http
Content-Type: multipart/form-data
X-Development-Requester-Id: 1
```

Multipart field: `file`

Validation:

- Allowed extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- MIME และ Extension ต้องสอดคล้องกัน
- Maximum 5 MB (`5 * 1024 * 1024` bytes)
- Active Attachments หลัง Upload ต้องไม่เกินห้า
- Original Filename ต้อง Sanitize; Storage Key สร้างโดย Backend และไม่ซ้ำ

Success: HTTP 201 พร้อม Active Attachment Metadata

Errors:

- 400: Missing file/invalid ID
- 403: Invalid Requester context
- 404: Missing/Cross-owner Ticket
- 409: Active attachment limit conflict
- 413: File too large
- 415: Unsupported/mismatched file type
- 500: Safe error; หากเขียน File แล้วแต่ Metadata ล้มเหลวต้องลบ File เป็น Compensation

### 6.2 GET `/api/tickets/:ticketId/attachments`

Purpose: คืน Attachment Metadata ของ Owned Ticket

- Success: HTTP 200 `{ "items": [...] }`
- รวม Active และ Removed Metadata เรียง `uploadedAt asc`, `id asc`
- Errors: 400, 403, Safe 404, Safe 500

### 6.3 GET `/api/attachments/:attachmentId`

Purpose: คืน Owned Attachment Metadata

- Success: HTTP 200 พร้อม Metadata
- Errors: 400, 403, Safe 404, Safe 500

### 6.4 GET `/api/attachments/:attachmentId/download`

Purpose: Download Active Owned Attachment

- Success: HTTP 200 File stream
- `Content-Type`: MIME ที่ตรวจสอบและบันทึกไว้
- `Content-Disposition`: Attachment พร้อม Safe Filename
- Errors: 400, 403, Safe 404, 410 Removed Attachment, Safe 500

API ต้อง Resolve File ผ่าน Storage Key ที่ระบบสร้าง ห้ามรับ Local Path จาก Client

### 6.5 DELETE `/api/attachments/:attachmentId`

Purpose: Soft-remove Active Owned Attachment

Request body:

```json
{
  "removalReason": "The wrong screenshot was attached."
}
```

Validation: Required, trim, 5-250 characters

Success: HTTP 200 พร้อม Removed Attachment Metadata โดยบันทึก:

- `removedAt`: Server time
- `removalReason`: Trimmed value
- `removedByRequesterId`: Current Requester

Record และ Metadata ต้องยังอยู่ แต่ Download ถูก Block

Errors: 400 Invalid reason/ID, 403 Invalid Requester context, Safe 404 Missing/Cross-owner, 409 Already Removed, Safe 500

## 7. Ownership and Data Exposure Rules

- Requester-specific Query ต้อง Filter `requesterId` ใน Database Query ไม่ใช่ Filter หลังโหลดข้อมูล
- Ticket body ห้าม Override Requester Context
- Attachment Ownership ตรวจผ่าน `Attachment -> Ticket -> requesterId`
- Cross-owner และ Missing Ticket/Attachment ใช้ Response รูปแบบเดียวกันแบบ Safe 404
- Response ห้ามส่ง Storage Key, Local Path, Internal Prisma error หรือข้อมูล Requester อื่น

## 8. Traceability Summary

| Capability | Main AC | Planned API Test |
|---|---|---|
| Active Requesters | AC-01, AC-05 | API-REQ-01, API-REQ-02 |
| Reference Data | AC-09 | API-REF-01 |
| Create Ticket | AC-07-AC-12 | API-CREATE-01-API-CREATE-05 |
| My Tickets | AC-14-AC-17 | API-LIST-01-API-LIST-04 |
| Ticket Detail | AC-21-AC-22 | API-DETAIL-01-API-DETAIL-02 |
| Attachment lifecycle | AC-13, AC-24-AC-30 | API-ATT-01-API-ATT-08 |
