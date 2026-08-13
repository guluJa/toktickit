# TokTickIT

TokTickIT เป็น IT Service Desk Application สำหรับรับคำขอบริการและแจ้งปัญหาด้าน Account and Access, Hardware, Software และ Network

ใน Lab 1 เราจะสร้าง Full-Stack Vertical Slice ขนาดเล็ก เพื่อพิสูจน์ว่า React Frontend, Express API, Prisma ORM และ PostgreSQL Database สามารถทำงานร่วมกันได้

## Technology Stack

- Frontend: React, TypeScript, Vite และ Bootstrap
- Backend: Node.js, Express และ TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Testing: Vitest และ Supertest

## สิ่งที่ต้องติดตั้งก่อนเริ่มต้น

ตรวจสอบว่าเครื่องมีโปรแกรมต่อไปนี้:

- Node.js และ npm
- PostgreSQL
- Git

สร้าง PostgreSQL Database ชื่อ:

```text
toktickit
```

ตัวอย่างในเอกสารนี้กำหนดให้ PostgreSQL ทำงานที่ Port `5432`

## การตั้งค่า Environment

ไฟล์ Environment ใช้เก็บค่าที่แตกต่างกันในแต่ละเครื่อง เช่น Database URL และ API URL

ให้สร้างไฟล์ `.env` จาก `.env.example` ที่เตรียมไว้

### Frontend Environment

รันคำสั่งนี้จากโฟลเดอร์หลักของ Repository:

```powershell
Copy-Item client/.env.example client/.env
```

ค่าเริ่มต้นของ Frontend จะเชื่อมต่อ Backend API ที่:

```text
http://localhost:3000
```

### Backend Environment

รันคำสั่งนี้จากโฟลเดอร์หลักของ Repository:

```powershell
Copy-Item server/.env.example server/.env
```

เปิดไฟล์ `server/.env` แล้วแก้ `DATABASE_URL` ให้ตรงกับ PostgreSQL Username, Password, Port และ Database ของเครื่องตนเอง

ตัวอย่าง:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/toktickit?schema=public"
PORT=3000
```

เปลี่ยน `YOUR_PASSWORD` เป็น PostgreSQL Password ของเครื่องตนเอง

> ห้าม Commit ไฟล์ `.env`, Database Password หรือข้อมูลลับอื่นเข้าสู่ Git และ GitHub ให้นำขึ้น Git เฉพาะไฟล์ `.env.example`

## การติดตั้ง Dependencies

### ติดตั้ง Frontend Dependencies

```powershell
cd client
npm.cmd install
cd ..
```

### ติดตั้ง Backend Dependencies

```powershell
cd server
npm.cmd install
cd ..
```

ตัวอย่างนี้ใช้ `npm.cmd` สำหรับ Windows PowerShell เนื่องจากบางเครื่องปิดการทำงานของ `npm.ps1`

หาก Terminal ของคุณไม่มีข้อจำกัดดังกล่าว สามารถใช้ `npm` แทน `npm.cmd` ได้

## การเปิด Application

เปิด Terminal สองหน้าต่างที่โฟลเดอร์หลักของ Repository

### เปิด Backend

ใน Terminal แรก:

```powershell
cd server
npm.cmd run dev
```

Backend API จะทำงานที่:

```text
http://localhost:3000
```

### เปิด Frontend

ใน Terminal ที่สอง:

```powershell
cd client
npm.cmd run dev
```

จากนั้นเปิด Browser ที่:

```text
http://localhost:5173
```

เมื่อต้องการหยุด Frontend หรือ Backend ให้กด `Ctrl+C` ใน Terminal ที่กำลังรันระบบ

## การตรวจ PostgreSQL และ Prisma

จากโฟลเดอร์ `server` ให้ตรวจ Prisma Schema:

```powershell
npx.cmd prisma validate
```

จากนั้นตรวจการเชื่อมต่อ PostgreSQL:

```powershell
npx.cmd prisma migrate status
```

หากระบบแสดง PostgreSQL Database ชื่อ `toktickit` ที่ `localhost:5432` และไม่มี Authentication หรือ Connection Error แสดงว่าการเชื่อมต่อสำเร็จ

ใน Project Foundation ยังไม่มี Prisma Model โดยจะเพิ่ม `Category` Model และ Migration ใน Issue ที่เกี่ยวข้องกับ Category ภายหลัง

## การรัน Automated Tests

### Frontend Tests

```powershell
cd client
npm.cmd test
```

Frontend Tests ใช้ Vitest

### Backend Tests

```powershell
cd server
npm.cmd test
```

Backend Tests ใช้ Vitest และ Supertest

## การ Build

### Build Frontend

```powershell
cd client
npm.cmd run build
```

### Build Backend

```powershell
cd server
npm.cmd run build
```

คำสั่ง Build ต้องทำงานเสร็จโดยไม่มี TypeScript หรือ Compilation Error
