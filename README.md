# TokTickIT

TokTickIT เป็นระบบศูนย์บริการด้านไอทีสำหรับสร้างและติดตาม Ticket โดยใช้ authenticated session และ role-based authorization รองรับ Requester, IT Staff และ Administrator พร้อม Actions Taken, Ticket Workflow, Role Dashboards, Staff Queue และ User Management ระบบรักษา ownership ของ Requester, จัดการข้อผิดพลาดโดยไม่เปิดเผยข้อมูลภายใน และแสดงผลด้วย Zen Green UI ที่รองรับหลายขนาดหน้าจอ

## Technology Stack

- Frontend: React, TypeScript, Vite และ Bootstrap
- Backend: Node.js, Express และ TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Testing: Vitest, Supertest และ Playwright

## Prerequisites

- Node.js และ npm
- PostgreSQL
- Git

> เอกสารนี้ใช้ `npm.cmd` และ `npx.cmd` เพื่อรองรับ Windows PowerShell หากเครื่องสามารถใช้ `npm` และ `npx` ได้ตามปกติ สามารถใช้แทนกันได้

## Installation

Clone Repository:
```powershell
git clone https://github.com/guluJa/toktickit.git
cd toktickit
```

ติดตั้ง Frontend Dependencies:
```powershell
cd .\client
npm.cmd install
cd ..
```

ติดตั้ง Backend Dependencies:
```powershell
cd .\server
npm.cmd install
cd ..
```

ติดตั้ง E2E Test Dependencies สำหรับ Playwright:
```powershell
cd .\e2e
npm.cmd install
npx.cmd playwright install chromium
cd ..
```

## Environment Setup

สร้างไฟล์ `.env` จาก `.env.example`:
```powershell
Copy-Item .\client\.env.example .\client\.env
Copy-Item .\server\.env.example .\server\.env
```

ค่าเริ่มต้นใน `client/.env`:
```env
VITE_API_URL="http://localhost:3000"
```

ตั้งค่า `DATABASE_URL` ใน `server/.env` ให้ตรงกับ PostgreSQL ของเครื่อง:
```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/toktickit?schema=public"
PORT=3000
UPLOAD_DIR="./uploads"
LAB3_INITIAL_PASSWORD="CHOOSE_A_LOCAL_PASSWORD"
CLIENT_ORIGINS="http://localhost:5173"
```

เปลี่ยน `USERNAME` และ `PASSWORD` เป็นข้อมูล PostgreSQL ของเครื่อง และเปลี่ยน `LAB3_INITIAL_PASSWORD` เป็นค่าที่ใช้เฉพาะในเครื่องและผ่าน Password Policy ของ Lab 3 ค่านี้ใช้สร้าง/รีเซ็ตรหัสเริ่มต้นของบัญชีที่ seed และผู้ใช้ต้องเปลี่ยนรหัสเมื่อเข้าสู่ระบบครั้งแรก การแก้ `.env.example` อย่างเดียวไม่เปลี่ยนรหัสที่ถูก hash และบันทึกอยู่ใน Database

`UPLOAD_DIR` เป็นโฟลเดอร์เก็บ Attachment แบบ Private ของ Backend ระบบจะสร้างโฟลเดอร์นี้เมื่อจำเป็น ไฟล์ภายในไม่ถูกเปิดเป็น Static Files และไม่ควร Commit ขึ้น GitHub

> ห้ามใส่ Password จริงใน `.env.example`, README หรือ Source Code และห้าม Commit ไฟล์ `.env` ขึ้น GitHub

## Database Setup

1. เปิด PostgreSQL
2. สร้าง Database ชื่อ `toktickit` ผ่าน pgAdmin หรือ PostgreSQL CLI
3. จากโฟลเดอร์ `server` รัน:
```powershell
cd .\server
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run prisma:seed
cd ..
```

คำสั่งเหล่านี้จะสร้าง Prisma Client ใช้ Migration ที่มีอยู่ และเพิ่มข้อมูลผู้ใช้, Categories, Related Systems และ Ticket fixture สำหรับการพัฒนาในเครื่องอย่างปลอดภัยและทำซ้ำได้

## Running the Application

Frontend และ Backend ต้องทำงานพร้อมกันใน Terminal สองหน้าต่าง

Backend:
```powershell
cd .\server
npm.cmd run dev
```

Backend ทำงานที่: http://localhost:3000


Frontend:
```powershell
cd .\client
npm.cmd run dev
```

เปิด Browser ที่: http://localhost:5173

เข้าสู่ระบบด้วยบัญชีที่ seed ไว้เพื่อใช้งานตาม role ของผู้ใช้ ระบบใช้ HttpOnly session cookie และไม่มี Development Requester selector หรือ Change Requester action ใน production flow

## Main API Endpoints

รายการด้านล่างเป็น endpoint หลักสำหรับเริ่มต้นใช้งาน ส่วน query, request/response shape, error code และ authorization matrix ฉบับเต็มอยู่ที่ [docs/lab-03/api-spec.md](docs/lab-03/api-spec.md)

```text
GET /api/health
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/change-password
GET /api/categories
GET /api/related-systems
POST /api/tickets
GET /api/tickets
GET /api/tickets/:ticketId
POST /api/tickets/:ticketId/attachments
GET /api/tickets/:ticketId/attachments
GET /api/attachments/:attachmentId/download
DELETE /api/attachments/:attachmentId
GET /api/staff/tickets
GET /api/staff/tickets/:ticketId
GET /api/admin/users
```

- Ticket และ Attachment endpoints ใช้ authenticated session cookie และ derive Requester ownership จาก session
- Missing/invalid session คืน HTTP 401; role ที่ไม่ได้รับอนุญาตคืน HTTP 403
- Cross-owner หรือ protected resource ที่ไม่มีสิทธิ์คืน Safe HTTP 404
- Attachment content เก็บใน Private Backend Storage และดาวน์โหลดผ่าน Authorized API เท่านั้น

## Running Tests

Server Tests:
```powershell
cd .\server
npm.cmd test
```

Client Tests:
```powershell
cd .\client
npm.cmd test
```

Playwright E2E และ Responsive Tests ต้องใช้ PostgreSQL Database แยกจาก Development Database โดยชื่อ Database ต้องสื่อว่าเป็น E2E (ตัวอย่าง `toktickit_e2e`) และ URL ต้องไม่ตรงกับ `DATABASE_URL` ใน `server/.env` ตัว Test มี safety guard และจะหยุดทันทีหากไม่ได้ตั้งค่าหรือเผลอชี้ไปฐานข้อมูลปกติ

ตัวอย่างการเตรียมค่าเฉพาะ Terminal ปัจจุบัน (แทน `USERNAME`, `PASSWORD` และค่ารหัสเริ่มต้นด้วยค่าท้องถิ่นของผู้รัน):
```powershell
$env:E2E_DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/toktickit_e2e?schema=public"
$env:DATABASE_URL=$env:E2E_DATABASE_URL
$env:LAB3_INITIAL_PASSWORD="CHOOSE_A_LOCAL_PASSWORD"

cd .\server
npx.cmd prisma migrate deploy
npm.cmd run prisma:seed
npm.cmd run prisma:seed
cd ..\e2e
npm.cmd test
```

รัน authenticated regression ของ Lab 3 และ Lab 4 E2E ซึ่งมี responsive assertions และสร้าง Visual Evidence:
```powershell
npm.cmd run test:responsive
```

การรัน seed สองครั้งใช้ยืนยันว่า seed ทำซ้ำได้โดยไม่สร้างข้อมูลซ้ำหรือลบข้อมูลเดิม ห้ามใช้ Development/Production Database กับขั้นตอนนี้ เมื่อรัน E2E และ Responsive Tests ครบแล้วจึงลบค่าชั่วคราวด้วย:
```powershell
Remove-Item Env:E2E_DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:LAB3_INITIAL_PASSWORD -ErrorAction SilentlyContinue
```

Automated Tests ครอบคลุม authentication, first-login gate, authenticated Requester regression, Staff Queue/Detail, Administrator User Management, migration/seed regression, safe failures, accessibility, Zen Green styling และ Desktop/Tablet/Mobile responsive behavior

## Production Build

Backend:
```powershell
cd .\server
npm.cmd run build
```

Frontend:
```powershell
cd .\client
npm.cmd run build
```

ทั้งสองคำสั่งต้องผ่านโดยไม่มี TypeScript หรือ Compilation Error

## Security

ไฟล์และโฟลเดอร์ต่อไปนี้ต้องไม่ถูก Commit:
```text
.env
node_modules/
dist/
build/
server/uploads/
test-results/
playwright-report/
test-results-lab3/
playwright-report-lab3/
test-results-lab4/
playwright-report-lab4/
```

Commit ได้เฉพาะ `.env.example` ที่ไม่มี Password หรือข้อมูลลับ

ห้าม Commit plaintext password, API token, session token, cookie, Database URL จริง หรือไฟล์ที่สร้างจาก `node_modules`/build/test report ไม่ว่าจะอยู่ใน Source, Documentation, Screenshot หรือ Console Evidence

ตรวจสอบว่า Git ไม่ได้ติดตาม `.env` หรือ `node_modules`:
```powershell
git ls-files |
Select-String -Pattern '(^|/)(node_modules|\.env)(/|$)'
```

หาก `.gitignore` ทำงานถูกต้อง คำสั่งนี้จะไม่แสดงผลลัพธ์

## Submission Note

Lab 3 ส่งเป็น PDF หนึ่งไฟล์แยกจาก Repository โดยเรียงหัวข้อ `Answer Part 1` ถึง `Answer Part 9` ตาม Labsheet พร้อม working links และภาพที่อ่านได้ ไม่ต้องสร้างหรือ Commit PDF เข้า Repository นี้ เอกสารใน `docs/lab-03/`, หลักฐานใน `artifacts/lab-03/` และ Final `main` เป็นแหล่งข้อมูลสำหรับจัดทำ PDF หลัง Release PR merge และ Final-main verification เสร็จแล้ว

## Lab 4: setup, verification และ demo

Lab 4 ใช้ schema/migrations เดิมแบบ additive: `ActionTaken` และ `Ticket.version` ไม่ใช้ `migrate reset`, `db push --force-reset` หรือลบข้อมูลเดิม Seed เพิ่ม Ticket ที่มี 0/1/หลาย Actions, workflow fixtures และ Dashboard fixtures; ไม่เขียนทับ Action/workflow fixture ที่มีผู้ใช้แก้แล้ว แต่ seed ของ Labs ก่อนหน้ายังปรับ reference data/บัญชีตัวอย่างตามกติกาเดิม จึงไม่ควรรันเพื่อทดลองบนฐาน Production

คำสั่งตรวจทั้งหมดด้านล่างรันจาก repository root บน Windows ต้องมี `server/.env` ที่ตั้งค่าครบ และสร้างฐาน **`toktickit_e2e` แยกจากฐาน Development** ก่อน ตัว runner ใช้ host/credentials เดิมภายใน process แต่เปลี่ยนชื่อฐานเป็น `toktickit_e2e` โดยไม่เขียน `.env` หรือแสดงข้อมูลลับ หากฐาน Development ใช้ชื่อดังกล่าวอยู่แล้ว runner จะหยุด ห้ามใช้ฐานนั้นร่วมกัน ต้องแยกฐานก่อน

```powershell
node artifacts/lab-04/run-verification.mjs prepare
node artifacts/lab-04/run-verification.mjs unit
node artifacts/lab-04/run-verification.mjs focused-e2e
node artifacts/lab-04/run-verification.mjs e2e
node artifacts/lab-04/run-verification.mjs responsive
git diff --check
```

- `prepare`: Prisma validate/generate, migration status/deploy และ seed สองรอบบนฐานทดสอบเท่านั้น
- `unit`: focused/full Server–Client tests และทั้งสอง builds; Full Server รวม real migration-preservation, concurrency และ performance-smoke
- `focused-e2e`: Lab 4; `e2e` และ `responsive`: Lab 3–4 รวมกัน ไม่ใช้ Development Requester selector ที่เลิกใช้งานแล้วของ Lab 2
- ปิด server ที่ใช้ port 3000/5173 ก่อนเริ่ม Playwright; test config ไม่ reuse process เดิม เพื่อไม่ต่อฐานผิด และใช้ PostgreSQL client สำหรับ migration scratch test โดยไม่ลดนโยบายความปลอดภัยของเครื่อง
- เก็บ stdout/stderr ที่กรองข้อมูลลับและ exit code ใน `artifacts/lab-04/verification/`; ผล test report/trace อยู่ในโฟลเดอร์ที่ Git ignore เพราะอาจมีข้อมูล session ไม่ใช่หลักฐานที่พร้อมเผยแพร่
- `node artifacts/lab-04/run-verification.mjs recovery` ใช้ PowerShell 7 (`pwsh.exe` ต้องอยู่ใน PATH) เรียก procedure backup/restore เดิมไปยัง scratch database ที่สร้างเฉพาะรอบนั้น ต้องเป็นเครื่องที่นโยบายอนุญาตให้รัน script/เครื่องมือดังกล่าว หากถูกบล็อก ให้บันทึกว่า Blocked ไม่ปิดการป้องกันหรือข้ามเพื่ออ้าง Pass

### Demo ตาม role

1. Requester: เปลี่ยนรหัสครั้งแรก → Requester Dashboard → My Tickets/Detail ของตนเอง → อ่าน Actions โดยไม่มี create/edit controls; “Problem Appears Resolved” เป็น indication ไม่เปลี่ยน formal status
2. IT Staff: Staff Dashboard → Queue/Detail → Claim/Assign/Reassign/Unassign Ticket → สร้างหลาย Actions โดย performer มาจาก session → แก้ follow-up; `RESOLVED` ต้องมี Owner ที่ active และ Action ที่ครบ แต่ยังมี follow-up ได้; `CLOSED` ต้องเคลียร์ follow-up ทั้งหมด; Reopen ต้องมีเหตุผลและไปต่อ `IN_PROGRESS` ได้
3. Administrator: User Management และ Staff Dashboard; สร้าง/แก้ Actions ได้ตาม Contract แต่ไม่เปลี่ยน Ticket Status/assignment ตาม policy ที่อนุมัติไว้
4. ตรวจ validation/conflict, timeout แบบ submission-uncertain และการคงฟอร์ม ไม่ retry POST อัตโนมัติหรืออ้างว่ามี server deduplication จากข้อความเหมือนกัน

คำว่า assign/complete/cancel ใน rubric จับคู่กับ Ticket assignment/Status ตาม `docs/lab-04/specification.md` ข้อ 12; append-only ใช้ Public Comments/Internal Notes ไม่ใช่ Action ที่ Contract อนุญาตให้แก้ นี่คือการตีความใน Contract ที่ผ่าน peer review ไม่ใช่คำยืนยันจาก TA

ภาพ Lab 4 อยู่ใน `artifacts/lab-04/screenshots/` มีภาพเต็มหน้าและภาพ panel/metrics ที่อ่านได้ ภาพ regression รอบใหม่อยู่ใต้ `regression-lab-03/` โดยไม่ทับหลักฐาน Lab 3 เดิม ผลบน feature branch ยังไม่ใช่ผล `lab4-staging` หลัง merge หรือ Final-main; Release และ PDF Answer Part 1–9 เป็นงาน Issue #74
