# TokTickIT

TokTickIT เป็น IT Service Desk Application สำหรับตรวจสอบสถานะระบบและแสดงประเภทคำขอบริการ ได้แก่ Account and Access, Hardware, Software และ Network

## Technology Stack

- Frontend: React, TypeScript, Vite และ Bootstrap
- Backend: Node.js, Express และ TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Testing: Vitest และ Supertest

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
```

เปลี่ยน `USERNAME` และ `PASSWORD` เป็นข้อมูล PostgreSQL ของเครื่อง

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

คำสั่งเหล่านี้จะสร้าง Prisma Client ใช้ Migration ที่มีอยู่ และเพิ่ม Categories ทั้ง 4 รายการลงใน Database

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

เมื่อกด `Check System` หน้าเว็บจะแสดง Backend Status และ Categories ที่โหลดจาก PostgreSQL ผ่าน API

## API Endpoints

```text
GET /api/health
GET /api/categories
```

- `/api/health` ส่งสถานะของ TokTickIT API
- `/api/categories` ส่ง Categories ทั้ง 4 รายการตามลำดับ ID

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

Automated Tests ครอบคลุม:
- Health API
- Categories API และ Seeded Categories ทั้ง 4 รายการ
- React UI สำหรับ Heading, Online/Success และ Offline/Error states

เมื่อตั้งค่า PostgreSQL, Migration และ Seed ถูกต้อง Tests ทั้ง 5 รายการต้องผ่าน

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
```

Commit ได้เฉพาะ `.env.example` ที่ไม่มี Password หรือข้อมูลลับ

ตรวจสอบว่า Git ไม่ได้ติดตาม `.env` หรือ `node_modules`:
```powershell
git ls-files |
Select-String -Pattern '(^|/)(node_modules|\.env)(/|$)'
```

หาก `.gitignore` ทำงานถูกต้อง คำสั่งนี้จะไม่แสดงผลลัพธ์