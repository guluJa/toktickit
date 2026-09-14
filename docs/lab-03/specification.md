# TokTickIT Lab 3 Sprint 3 Engineering Contract

สถานะ: Contract ก่อนเริ่ม implementation

## 1. Sprint Goal
แทนที่ Development Requester selector ของ Lab 2 ด้วยการเข้าสู่ระบบจริงและการควบคุมสิทธิ์ตาม role พร้อมเพิ่ม workflow สำหรับ IT Staff และหน้าจอ User Management สำหรับ Administrator โดยรักษา Ticket, Attachment และ Requester ownership เดิมไว้

## 2. Stakeholder Request
ผู้ใช้ต้องเข้าสู่ระบบด้วย email และ password ผู้ใช้ที่ได้รับ initial password ต้องเปลี่ยน password ก่อนเข้าใช้งานปกติ Requester ยังคงจัดการเฉพาะ Ticket ของตนเอง IT Staff จัดการคิวและการดำเนินงานของ Ticket ส่วน Administrator จัดการบัญชีผู้ใช้แบบเรียบง่าย

## 3. Scope
### Included
- Login, logout, current user และ mandatory first-login password change
- Role เดียวต่อผู้ใช้: Requester, IT Staff หรือ Administrator
- Server-side authentication, authorization และ ownership checks
- การ migrate ข้อมูล Requester ของ Lab 2 ไปสู่ User identity โดยไม่ทำลายข้อมูลเดิม
- Requester Ticket และ Attachment regression โดยใช้ authenticated identity
- IT Staff queue/detail, owner assignment, IT Priority, status workflow, Public Comments และ Internal Notes
- Administrator user list, search, optional role filter, create, edit, activate/deactivate และ reset initial password
- REST API contract, UI contract, tests, migration evidence และ final verification
- Zen Green, responsive design และ accessibility ต่อเนื่องจาก Lab 2

### Excluded
- Email invitation, password-reset email, MFA, social login, SSO และ self-registration
- Actions Taken, SLA, escalation, notifications, dashboards และ KPI analytics
- Multi-tenant, departments, profile photo, multiple roles และ account history
- User deletion, bulk operation, import/export และ advanced identity-management workflow
- Production deployment หรือ cloud infrastructure changes

## 4. Functional Requirements
- **FR-01** Active user ที่มี credentials ถูกต้องสามารถ login และได้รับ authenticated session
- **FR-02** ระบบรองรับ logout, current-user retrieval และ invalidation ของ session
- **FR-03** ผู้ใช้ที่มี initial password ต้องเปลี่ยน password ที่ถูกต้องก่อนเข้า protected application routes
- **FR-04** Application shell แสดงชื่อและ role ของผู้ใช้ และแสดงเฉพาะ navigation ที่ role นั้นได้รับอนุญาต
- **FR-05** Requester operations ใช้ identity จาก authenticated session ไม่รับ ownership จาก requester ID ของ client
- **FR-06** Requester สร้าง ดู และจัดการเฉพาะ Ticket และ Attachment ของตนเอง รวมถึง Public Comments และ resolved indication
- **FR-07** IT Staff เรียกดู queue ที่ค้นหา กรอง เรียงลำดับ และแบ่งหน้าได้
- **FR-08** IT Staff เปิดรายละเอียด Ticket, claim/reassign owner, ตั้ง IT Priority, เปลี่ยน status และเพิ่ม Public Comments/Internal Notes ได้
- **FR-09** Administrator จัดการบัญชีผู้ใช้ตามขอบเขตขั้นต่ำที่กำหนด และดู staff ticket information ได้ตาม authorization matrix
- **FR-10** Public Comments และ Internal Notes แยกการมองเห็นอย่างชัดเจนและเป็น append-only
- **FR-11** ทุก protected operation ตรวจ authentication, role, ownership, validation, missing resource, conflict และ unexpected failure ที่ backend
- **FR-12** ระบบต้องรักษา Lab 2 data และให้ seed ทำงานซ้ำได้อย่างปลอดภัย

## 5. Business Rules
- **BR-01** เฉพาะ active user ที่ credentials ถูกต้องเท่านั้นที่ login ได้
- **BR-02** ผู้ใช้ที่ `mustChangePassword=true` เข้า normal protected routes ไม่ได้จนกว่าจะเปลี่ยน password สำเร็จ
- **BR-03** First-login gate ยกเว้น `GET /auth/me`, `POST /auth/logout` และ `POST /auth/change-password`
- **BR-04** Password เก็บเป็น salted hash เท่านั้น และไม่ส่ง password หรือ hash กลับ client
- **BR-05** Session ใช้ opaque token ที่เก็บแบบ hash ใน server และส่งผ่าน HttpOnly cookie
- **BR-06** Authenticated Requester identity เป็นตัวกำหนด Ticket ownership เสมอ
- **BR-07** Requester ที่เข้าถึง Ticket, Attachment หรือ Internal Note ของผู้อื่นต้องได้รับ safe `404`
- **BR-08** Ticket มี owner ได้ศูนย์หรือหนึ่งคน และ owner ต้องเป็น active IT Staff หรือ Administrator
- **BR-09** เฉพาะ IT Staff เท่านั้นที่ assign, reassign หรือ unassign Ticket owner ได้
- **BR-10** Requested Priority เป็นค่าจาก Requester; IT Priority เริ่มต้นจากค่านี้และแก้ได้โดย IT Staff หรือ Administrator
- **BR-11** Status ที่รองรับคือ `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED` และ `CANCELLED`
- **BR-12** Transition ที่อนุญาตคือ `NEW→OPEN`, `OPEN→IN_PROGRESS|WAITING_FOR_REQUESTER|CANCELLED`, `IN_PROGRESS→WAITING_FOR_REQUESTER|RESOLVED|CANCELLED`, `WAITING_FOR_REQUESTER→IN_PROGRESS|RESOLVED|CANCELLED`, `RESOLVED→CLOSED|REOPENED` และ `CLOSED→REOPENED`
- **BR-13** Requester ระบุได้เพียงว่า problem appears resolved และห้ามเปลี่ยน formal status
- **BR-14** Public Comments มองเห็นโดย Requester เจ้าของ, IT Staff และ Administrator; Internal Notes มองเห็นเฉพาะ IT Staff และ Administrator
- **BR-15** Comments และ Notes เป็น append-only, backend-authored, trimmed, non-empty และยาวไม่เกิน 5,000 ตัวอักษร
- **BR-16** Email ต้องไม่ซ้ำแบบ case-insensitive และผู้ใช้มีได้เพียงหนึ่ง role
- **BR-17** Administrator ห้าม deactivate ตนเองหรือทำให้เหลือ active Administrator เป็นศูนย์ และการ deactivate ต้อง revoke sessions เดิม

## 6. Authorization Matrix
| Operation | Requester | IT Staff | Administrator |
|---|---|---|---|
| Login/logout/current user/password change | ได้ | ได้ | ได้ |
| Create/list/detail own Ticket และ Attachment | ของตนเองเท่านั้น | ไม่ได้ | ไม่ได้ |
| Public Comments บน Ticket | ของตนเอง: อ่าน/สร้าง | Ticket ที่มองเห็น: อ่าน/สร้าง | Ticket ที่มองเห็น: อ่าน |
| Resolved indication | ของตนเองเท่านั้น | ไม่ได้ | ไม่ได้ |
| Staff queue/detail | ไม่ได้ | ได้ | อ่านได้ |
| Assignment และ status transition | ไม่ได้ | ได้ | ไม่ได้ |
| IT Priority | ไม่ได้ | ได้ | ได้ |
| Internal Notes | ไม่ได้ | อ่าน/สร้าง | อ่านเท่านั้น |
| User Management | ไม่ได้ | ไม่ได้ | ได้ |

การซ่อนหรือ disable control ที่ frontend เป็นเพียง usability feedback; backend เป็นผู้ตัดสินสิทธิ์ขั้นสุดท้าย

## 7. Data and Migration Decisions
Lab 2 ใช้ Prisma model `RequesterUser` และ Ticket มี `requesterId` ชี้ไปยัง model นี้ การเปลี่ยนไปใช้ real User จะเป็น additive migration ที่รักษา numeric IDs และ Ticket foreign keys เดิมไว้ โดย migrate/evolve `RequesterUser` เป็น account model `User` หรือเปลี่ยนชื่อ physical table ภายใน migration เดียวกันอย่างปลอดภัย ไม่สร้างข้อมูล Ticket หรือ Attachment ใหม่ทับของเดิม

User ต้องมี `id`, `name`, `email`, `passwordHash`, `role`, `isActive`, `mustChangePassword`, `createdAt` และ `updatedAt` ส่วน Ticket เพิ่ม nullable `ownerId`, `itPriority` และ `requesterResolvedAt` โดย backfill `itPriority` จาก `requestedPriority` ส่วน Comment, Internal Note และ Session เป็นตารางใหม่ที่เชื่อมด้วย foreign key และมี index ตาม queue และเวลา

การ migrate Requester เดิมจะคง `id`, `name`, `email`, `isActive`, timestamps และ `Ticket.requesterId` เดิมไว้ทุกแถว พร้อมกำหนด `role=REQUESTER` และ `mustChangePassword=true` ให้ผู้ใช้เดิม Password hash จะถูกสร้างจาก deterministic local-development fixture ผ่าน seed/migration โดยไม่บันทึก plaintext password หรือ secret ลง repository; ผู้ใช้ต้องเปลี่ยน password ในการ login ครั้งแรก หาก fixture ไม่พร้อม ระบบต้องหยุดอย่างปลอดภัยและห้ามเขียนทับข้อมูลเดิม

Seed ต้อง idempotent และมี active Requester อย่างน้อย 4 คน, inactive Requester 1 คน, active IT Staff 3 คน, inactive IT Staff 1 คน และ active Administrator อย่างน้อย 1 คน พร้อม Ticket, Public Comments และ Internal Notes สำหรับ local development เท่านั้น การทดสอบ migration/regression ต้องตรวจ row counts, preserved IDs, `Ticket.requesterId` foreign keys, Ticket/Attachment references และรัน seed ซ้ำอย่างน้อยสองครั้งโดยข้อมูลไม่ซ้ำและไม่หาย

## 8. API Contract Summary
Base path คือ `/api` ใช้ JSON success รูปแบบ `{data: ...}` และ error รูปแบบ `{error:{code,message,fields?}}` ใช้ HttpOnly `toktickit_session` cookie สำหรับ session

- Authentication: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`
- Requester: Lab 2 Ticket/Attachment routes เดิม โดย derive ownership จาก session เพิ่ม `GET/POST /tickets/:id/comments` และ `POST /tickets/:id/resolved`
- IT Staff: `GET /staff/tickets`, `GET /staff/tickets/:id`, assignment, priority, status, comments และ notes routes
- Administrator: `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:id` และ `POST /admin/users/:id/initial-password`

ใช้ `400` สำหรับ validation, `401` สำหรับ missing/invalid session, `403` สำหรับ forbidden role/action, safe `404` สำหรับ missing หรือ protected-other-owner resource, `409` สำหรับ duplicate/state conflict, `500` สำหรับ unexpected failure และ `410 DEVELOPMENT_REQUESTERS_RETIRED` สำหรับ legacy Development Requester route ใน production โดยไม่เปิดเผย stack trace, SQL, path, hash หรือ secret

## 9. UI Contract Summary
Application shell แสดง authenticated user, role badge, role-specific navigation และ Logout โดยไม่มี Development Requester selector หรือ Change Requester action หน้าจอ Login, Change Password, Requester screens, Staff Queue, Staff Ticket Detail และ Administrator User Management ต้องมีโหมด loading, success, validation, empty/no-results, forbidden, conflict และ safe failure ตามความเหมาะสม

Desktop ใช้ queue table ที่อ่านง่าย; tablet ใช้ card/table ที่เลื่อนได้ภายในพื้นที่ปลอดภัย; mobile ใช้ stacked cards และ form หนึ่งคอลัมน์ ทุก input มี label, error เชื่อมด้วย `aria-describedby`, focus มองเห็นได้ และห้ามมี page-level horizontal overflow

## 10. Acceptance Criteria
- **AC-01** Active credentials login สำเร็จและคืน safe user identity กับ role
- **AC-02** Invalid credentials และ inactive account ได้ safe failure โดยไม่สร้าง session
- **AC-03** Initial-password user เข้า normal routes ไม่ได้จนกว่าจะเปลี่ยน password ถูกต้อง
- **AC-04** Logout ทำให้ session เดิมใช้ต่อไม่ได้
- **AC-05** Requester Ticket/Attachment behavior เดิมทำงานด้วย authenticated ownership
- **AC-06** Cross-owner และ role-forbidden access ไม่เปิดเผยข้อมูล protected resource
- **AC-07** Staff queue รองรับ search, filters, sorting, pagination และ ownership/status/priority
- **AC-08** IT Staff ทำ assignment, priority, status, Public Comments และ Internal Notes ตาม rules ได้
- **AC-09** Administrator จัดการ user ตาม safety rules และแก้ได้เฉพาะ IT Priority ใน staff view
- **AC-10** Resolved indication ของ Requester ไม่เปลี่ยน formal Ticket status
- **AC-11** Migration และ repeated seed รักษาข้อมูล Lab 2 และทำงานซ้ำได้อย่างปลอดภัย
- **AC-12** API และ UI แสดง feedback ที่ปลอดภัยและสอดคล้องกัน
- **AC-13** ทุกหน้าจอหลักผ่าน responsive และ accessibility review บน desktop, tablet และ mobile

## 11. Product Definition of Done
- Contract, API spec, UI spec และ test plan มีอยู่ก่อน final implementation integration
- Additive migration และ idempotent seed ผ่าน regression โดยข้อมูล Lab 2 ยังอยู่ครบ
- Protected endpoint ทุกตัวมี backend authentication, role และ ownership checks
- Acceptance Criteria map ไปยัง unit/API/UI/security/regression/E2E tests
- Requester regression, builds, responsive และ accessibility verification ผ่าน
- Reviewer record, AI-use reflection และ final-main evidence ถูกบันทึกในเอกสาร
- ไม่มี secret, plaintext password, storage path หรือ internal error detail ใน response หรือ repository
- จัดทำ PDF เดียวตามหัวข้อ Answer Part 1–9 พร้อม working links และ readable evidence

## 12. Assumptions and Decisions
เลือก server-side opaque cookie session เพราะเหมาะกับ browser application และ revoke ได้ทันที ใช้ SameSite=Lax และ Origin check สำหรับ state-changing browser requests Seed credentials เป็น local-only fixtures และต้องเปลี่ยนเมื่อ login ครั้งแรก Administrator อาจเป็น Ticket Owner และแก้ IT Priority ได้ แต่ไม่มีสิทธิ์ assignment, status, staff-side comment หรือ note mutation
