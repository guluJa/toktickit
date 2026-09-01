# TokTickIT

TokTickIT เป็น IT Service Desk Application สำหรับตรวจสอบสถานะระบบและแสดงประเภทคำขอบริการ ได้แก่ Account and Access, Hardware, Software และ Network

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
```

เปลี่ยน `USERNAME` และ `PASSWORD` เป็นข้อมูล PostgreSQL ของเครื่อง

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

คำสั่งเหล่านี้จะสร้าง Prisma Client ใช้ Migration ที่มีอยู่ และเพิ่ม Categories, Related Systems และ Development Requesters สำหรับ Lab 2 ลงใน Database

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

เลือก Development Requester เพื่อใช้งาน Create Ticket, My Tickets, Ticket Detail และ Attachment lifecycle ภายใต้ requester context เดียวกัน

## API Endpoints

```text
GET /api/health
GET /api/development-requesters
GET /api/development-requesters/:requesterId
GET /api/categories
GET /api/related-systems
POST /api/tickets
GET /api/tickets
GET /api/tickets/:ticketId
POST /api/tickets/:ticketId/attachments
GET /api/tickets/:ticketId/attachments
GET /api/attachments/:attachmentId/download
DELETE /api/attachments/:attachmentId
```

- Ticket และ Attachment endpoints ต้องส่ง `X-Development-Requester-Id`
- Missing/malformed Requester header คืน HTTP 400; unknown/inactive Requester คืน Safe HTTP 403
- Cross-owner Ticket และ Attachment access คืน Safe HTTP 404
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

Playwright E2E และ Responsive Tests:
```powershell
cd ..\e2e
npm.cmd test
```

รันเฉพาะ Responsive และ Visual Evidence:
```powershell
npm.cmd run test:responsive
```

Automated Tests ครอบคลุม Requester context, Ticket creation/idempotency, requester-owned list/detail, Attachment lifecycle, safe failures, accessibility, Zen Green styling และ Desktop/Tablet/Mobile responsive behavior

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
```

Commit ได้เฉพาะ `.env.example` ที่ไม่มี Password หรือข้อมูลลับ

ตรวจสอบว่า Git ไม่ได้ติดตาม `.env` หรือ `node_modules`:
```powershell
git ls-files |
Select-String -Pattern '(^|/)(node_modules|\.env)(/|$)'
```

หาก `.gitignore` ทำงานถูกต้อง คำสั่งนี้จะไม่แสดงผลลัพธ์
