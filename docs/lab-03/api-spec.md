# TokTickIT Lab 3 REST API Contract

Base path: `/api`

Success response ใช้ `{ "data": ... }` และ error ใช้ `{ "error": { "code", "message", "fields"? } }` ห้ามส่ง password, password hash, session token, filesystem path, SQL หรือ stack trace กลับ client

## Authentication
| Method | Endpoint | Result |
|---|---|---|
| POST | `/auth/login` | `200` พร้อม safe user และ HttpOnly session cookie; invalid/inactive เป็น `401 AUTHENTICATION_FAILED` |
| GET | `/auth/me` | `200` current user; missing cookie `401 AUTHENTICATION_REQUIRED`; invalid cookie `401 SESSION_INVALID` |
| POST | `/auth/logout` | `200` และ invalidate session; ไม่มี session เป็น `401 AUTHENTICATION_REQUIRED` |
| POST | `/auth/change-password` | `200` และล้าง `mustChangePassword`; invalid password เป็น `400 VALIDATION_ERROR` |

Session ใช้ opaque token, HttpOnly, SameSite=Lax และ bounded expiry ผู้ใช้ที่ติด first-login gate เรียกได้เฉพาะ `GET /auth/me`, `POST /auth/logout` และ `POST /auth/change-password`; protected route อื่นตอบ `403 PASSWORD_CHANGE_REQUIRED`

## Requester Routes
คง Lab 2 Ticket และ Attachment routes เดิม แต่ derive `requesterId` จาก authenticated session เพิ่ม `GET/POST /tickets/:id/comments` และ `POST /tickets/:id/resolved` โดย cross-owner resource ใช้ safe `404 TICKET_NOT_FOUND` และ role ที่ไม่ใช่ Requester ใช้ `403 ROLE_FORBIDDEN` ตาม operation

`POST /tickets/:id/resolved` รับ `{}` เป็น idempotent operation ตอบ `200` พร้อม `ticketId`, `requesterResolvedAt` และ `currentStatus` โดยไม่เปลี่ยน formal status

## IT Staff Routes
| Method | Endpoint | Authorization |
|---|---|---|
| GET | `/staff/tickets` | IT Staff และ Administrator; search/filter/sort/pagination |
| GET | `/staff/tickets/:id` | IT Staff และ Administrator; Internal Notes รวมเฉพาะ staff-visible roles |
| POST | `/staff/tickets/:id/assignment` | IT Staff เท่านั้น; owner เป็น active IT Staff/Administrator หรือ `null` |
| PATCH | `/staff/tickets/:id/priority` | IT Staff และ Administrator |
| PATCH | `/staff/tickets/:id/status` | IT Staff เท่านั้น; ใช้ transition matrix |
| GET/POST | `/staff/tickets/:id/comments` | GET สำหรับ IT Staff/Administrator; POST สำหรับ IT Staff |
| GET/POST | `/staff/tickets/:id/notes` | GET สำหรับ IT Staff/Administrator; POST สำหรับ IT Staff |

Invalid input ใช้ `400`, missing/invalid session `401`, forbidden role `403 ROLE_FORBIDDEN`, missing ticket `404 TICKET_NOT_FOUND`, transition conflict `409 STATUS_TRANSITION_NOT_ALLOWED` และ unexpected failure `500 INTERNAL_ERROR`

### Queue Query Contract

`GET /staff/tickets` รองรับ query parameters ดังนี้:

- `search`: ค้นใน `ticketNumber` หรือ `summary` แบบ case-insensitive
- `status`: กรองด้วย `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED` หรือ `CANCELLED`
- `requestedPriority` และ `itPriority`: กรองด้วย `LOW`, `MEDIUM` หรือ `HIGH`
- `ownerId`: กรองด้วย active owner ID หรือค่า `unassigned`
- `sortBy`: `ticketNumber`, `summary`, `createdAt`, `updatedAt`, `itPriority` หรือ `currentStatus`
- `sortOrder`: `asc` หรือ `desc`
- `page`: จำนวนเต็มเริ่มต้น `1`
- `pageSize`: `10`, `20` หรือ `50` โดยค่าเริ่มต้นคือ `10`

ค่าเริ่มต้นของการเรียงลำดับคือ `updatedAt desc` และเมื่อค่าซ้ำให้เรียงต่อด้วย `id asc` ผลสำเร็จตอบ `200` พร้อม `{data:[...],pagination:{page,pageSize,totalItems,totalPages}}` หาก query ไม่ถูกต้องตอบ `400 INVALID_QUERY`; หาก page เกิน `totalPages` ตอบ `400 PAGE_OUT_OF_RANGE` และไม่รัน query ที่มีผลข้างเคียง

## Administrator Routes
| Method | Endpoint | Result |
|---|---|---|
| GET | `/admin/users` | list/search และ optional role filter |
| POST | `/admin/users` | create user หนึ่ง role พร้อม initial password |
| PATCH | `/admin/users/:id` | แก้ name, email, role และ activation state |
| POST | `/admin/users/:id/initial-password` | ตั้ง initial password ใหม่และบังคับเปลี่ยนใน login ถัดไป |

เฉพาะ Administrator เท่านั้นที่ใช้ routes นี้ได้ Invalid fields เป็น `400 VALIDATION_ERROR`, duplicate email `409 DUPLICATE_EMAIL`, safety conflict `409 USER_UPDATE_CONFLICT`, missing user `404 USER_NOT_FOUND` และ unexpected failure `500 INTERNAL_ERROR` การ deactivate ต้อง revoke sessions เดิมของ target และ request ถัดไปตอบ `401 SESSION_INVALID`

## Common Security Rules
ใช้ `400` สำหรับ malformed input/query, `401` สำหรับ unauthenticated หรือ invalid session, `403` สำหรับ authenticated แต่ไม่มีสิทธิ์, safe `404` สำหรับ protected-other-owner, `409` สำหรับ duplicate/state conflict, `410 DEVELOPMENT_REQUESTERS_RETIRED` สำหรับ legacy route ใน production และ `500` สำหรับ unexpected failure `LAB2_COMPATIBILITY_MODE=true` ใช้ได้เฉพาะ non-production migration/regression tooling
