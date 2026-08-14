# TokTickIT

TokTickIT เป็น IT Service Desk Application สำหรับรับคำขอบริการและแจ้งปัญหาด้าน Account and Access, Hardware, Software และ Network

## Technology Stack

- Frontend: React, TypeScript, Vite และ Bootstrap
- Backend: Node.js, Express และ TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Testing: Vitest และ Supertest

## Prerequisites

ก่อนเริ่มต้น กรุณาติดตั้งโปรแกรมต่อไปนี้:
- Node.js และ npm
- PostgreSQL
- Git

สามารถตรวจสอบการติดตั้งได้ด้วยคำสั่ง:
```powershell
node --version
npm.cmd --version
git --version
```

หากติดตั้ง PostgreSQL Command Line Tools และตั้งค่า PATH แล้ว สามารถตรวจสอบ PostgreSQL ได้ด้วย:
```powershell
psql --version
```
หากคำสั่ง `psql` ใช้งานไม่ได้ แต่ติดตั้ง PostgreSQL เรียบร้อยแล้ว สามารถสร้างและจัดการ Database ผ่าน pgAdmin ได้

## Getting Started

### 1. Clone Repository

รันคำสั่ง:
```powershell
git clone https://github.com/guluJa/toktickit.git
cd toktickit
```
### 2. Install Frontend Dependencies

จากโฟลเดอร์หลักของโปรเจกต์:

```powershell
cd .\client
npm.cmd install
cd ..
```
คำสั่งนี้จะติดตั้ง Packages ที่ระบุไว้ใน `client/package.json`

### 3. Install Backend Dependencies

```powershell
cd .\server
npm.cmd install
cd ..
```
คำสั่งนี้จะติดตั้ง Packages ที่ระบุไว้ใน `server/package.json`

เอกสารนี้ใช้ `npm.cmd` เนื่องจาก Windows PowerShell บางเครื่องไม่อนุญาตให้รัน `npm.ps1` หากเครื่องสามารถใช้ `npm` ได้ตามปกติ สามารถใช้ `npm` แทน `npm.cmd` ได้

## PostgreSQL Setup

### 1. Start PostgreSQL

ตรวจสอบว่า PostgreSQL Service กำลังทำงานอยู่ โดยเปิด Windows Services หรือดูสถานะผ่าน pgAdmin

โปรเจกต์นี้ตั้งค่า PostgreSQL ไว้ดังนี้:
```text
Host: localhost
Port: 5432
Database: toktickit
```
### 2. Create the Database

เปิด pgAdmin แล้วดำเนินการดังนี้:
1. เชื่อมต่อ PostgreSQL Server
2. เปิดรายการ `Databases`
3. คลิกขวาที่ `Databases`
4. เลือก `Create` → `Database`
5. ตั้งชื่อ Database เป็น `toktickit`
6. กำหนด Owner เป็น `postgres`
7. กด `Save`
ในขั้น Project Foundation ต้องสร้างเฉพาะ Database สำหรับตรวจสอบการเชื่อมต่อ ยังไม่ต้องสร้าง Table, Migration หรือ Seed Data เพราะเป็นงานของ Issues ถัดไป

## Environment Setup

ไฟล์ `.env.example` เป็นตัวอย่างค่าที่โปรเจกต์ต้องใช้ ส่วน `.env` ใช้เก็บค่าจริงของแต่ละเครื่องและต้องไม่ถูก Commit ขึ้น GitHub

### Frontend Environment

จากโฟลเดอร์หลักของโปรเจกต์ รัน:
```powershell
Copy-Item .\client\.env.example .\client\.env
```

ค่าใน `client/.env` ใช้กำหนดตำแหน่งของ Backend API:
```env
VITE_API_URL="http://localhost:3000"
```
### Backend Environment

สร้างไฟล์ Environment สำหรับ Backend:
```powershell
Copy-Item .\server\.env.example .\server\.env
```

เปิด `server/.env` แล้วตั้งค่า `DATABASE_URL` ให้ตรงกับ PostgreSQL Username, Password, Port และ Database ของเครื่อง

ตัวอย่าง:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/toktickit?schema=public"
PORT=3000
```
เปลี่ยน `YOUR_PASSWORD` เป็นรหัสผ่านของ PostgreSQL ที่ตั้งไว้ตอนติดตั้ง
หากใช้ Username, Port หรือชื่อ Database อื่น ต้องแก้ `DATABASE_URL` ให้ตรงกับค่าที่ใช้งานจริง

> ห้ามใส่รหัสผ่านจริงใน `.env.example`, README หรือ Source Code และห้าม Commit ไฟล์ `.env` ขึ้น GitHub

## Prisma and Database Connection

หลังจากตั้งค่า `server/.env` แล้ว ให้เข้าโฟลเดอร์ Backend:
```powershell
cd .\server
```

ตรวจสอบความถูกต้องของ Prisma Schema:
```powershell
npx.cmd prisma validate
```

จากนั้นตรวจสอบการเชื่อมต่อ PostgreSQL:
```powershell
npx.cmd prisma migrate status
```

หากคำสั่งแสดงข้อความประมาณนี้:
```text
Datasource "db": PostgreSQL database "toktickit", schema "public" at "localhost:5432"
```

และไม่มี `Authentication failed` หรือ `Can't reach database server` แสดงว่า Prisma สามารถเชื่อมต่อ PostgreSQL ได้สำเร็จ
ใน Project Foundation ยังไม่มี Prisma Model จึงยังไม่ต้องรัน `prisma generate` และยังไม่ต้องสร้าง Migration หรือ Seed Data โดยจะเพิ่ม `Category` Model ใน Issue ที่เกี่ยวข้องภายหลัง

กลับไปยังโฟลเดอร์หลัก:
```powershell
cd ..
```
## Running the Application

Frontend และ Backend ต้องเปิดพร้อมกันโดยใช้ Terminal สองหน้าต่าง

### Start the Backend

เปิด Terminal แรกจากโฟลเดอร์หลัก แล้วรัน:
```powershell
cd .\server
npm.cmd run dev
```

เมื่อ Backend เริ่มทำงานสำเร็จ Terminal จะแสดงข้อความประมาณ:
```text
TokTickIT API listening on http://localhost:3000
```
### Start the Frontend

เปิด Terminal อีกหน้าต่างจากโฟลเดอร์หลัก แล้วรัน:
```powershell
cd .\client
npm.cmd run dev
```

เมื่อ Vite เริ่มทำงานสำเร็จ ให้เปิด Browser ที่:
```text
http://localhost:5173
```
ใน Project Foundation ควรเห็นหน้า TokTickIT และ Bootstrap Styling แสดงผลบนหน้าเว็บ

ฟังก์ชัน Health Check และ Category List ยังไม่เสร็จใน Issue 1 ดังนั้นหน้าเว็บอาจยังแสดง `Loading...` หรือยังไม่แสดง System Status และ Categories จนกว่าจะพัฒนา Issues ที่เกี่ยวข้อง

เมื่อต้องการหยุด Frontend หรือ Backend ให้กด `Ctrl+C` ใน Terminal ที่กำลังทำงานอยู่

## Running Tests

### Frontend Tests

จากโฟลเดอร์หลัก:
```powershell
cd .\client
npm.cmd test
```
Frontend ใช้ Vitest สำหรับทดสอบ React Components และพฤติกรรมของหน้าเว็บ

ผลที่คาดหวังใน Project Foundation:
- Test การแสดงหัวข้อ TokTickIT ต้องผ่าน
- Success Test และ Error Test อาจถูก Skip ไว้จนกว่าจะพัฒนา API

### Backend Tests

จากโฟลเดอร์หลัก:
```powershell
cd .\server
npm.cmd test
```

Backend ใช้ Vitest เป็น Test Runner และใช้ Supertest สำหรับทดสอบ HTTP Requests ของ Express Application

ผลที่คาดหวังใน Project Foundation:
- Health Test อาจได้รับ HTTP 501 เนื่องจาก `/api/health` จะพัฒนาใน Issue #2
- Category Test จะยังถูก Skip จนกว่าจะพัฒนา Category Model และ Categories API

ผลลัพธ์ดังกล่าวไม่ได้หมายความว่า Project Foundation ทำงานผิดพลาด แต่แสดงว่า Test Commands ถูก Configure แล้ว และ Tests สำหรับ Issues ถัดไปถูกเตรียมไว้ล่วงหน้า

## Production Build

### Build Frontend
```powershell
cd .\client
npm.cmd run build
```

### Build Backend
```powershell
cd .\server
npm.cmd run build
```
คำสั่ง Build ต้องทำงานเสร็จโดยไม่มี TypeScript หรือ Compilation Error

## Security Notes

ไฟล์และโฟลเดอร์ต่อไปนี้ต้องไม่ถูก Commit:
```text
.env
node_modules/
dist/
build/
```

ไฟล์ตัวอย่างที่สามารถ Commit ได้คือ:
```text
.env.example
```

ก่อน Commit สามารถตรวจสอบว่า Git ไม่ได้ติดตาม `.env` หรือ `node_modules` ด้วยคำสั่ง:
```powershell
git ls-files |
Select-String -Pattern '(^|/)(node_modules|\.env)(/|$)'
```
หาก `.gitignore` ทำงานถูกต้อง คำสั่งนี้ไม่ควรแสดงผลลัพธ์ใด ๆ