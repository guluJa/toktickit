# Lab 1 - AI Use and Reflection

## AI Tool

- AI Tool: Codex
- LLM/Model: GPT-5.6 Sol
- Reasoning Effort: Medium

## Responsibility Statement

ใน Lab 1 ฉันใช้ Codex เป็นผู้ช่วยในการทำความเข้าใจ Requirements วางแผน GitHub Workflow วิเคราะห์ Error และเสนอแนวทางการ Implement และ Testing

ฉันเป็นผู้รับผิดชอบต่อ Source Files, Commands, Dependencies, Database Migration, Environment Configuration และ Automated Tests ทั้งหมด ก่อนนำคำแนะนำไปใช้ ฉันตรวจสอบให้สอดคล้องกับ Labsheet, Acceptance Criteria และโครงสร้าง Repository ตรวจการเปลี่ยนแปลงด้วย `git diff` และยืนยันผลด้วย Tests, Build และการทดลองใช้งานจริงก่อน Commit

ข้อมูลที่เป็นความลับ เช่น Database Password ถูกเก็บไว้เฉพาะใน `.env` ซึ่งไม่ถูกติดตามโดย Git และไม่ถูกนำไปใส่ใน Commit หรือ Pull Request

## Selected Key Prompts

| # | Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|---|
| 1 | Understand Lab 1 | ช่วยอธิบาย PDF นี้ตั้งแต่ต้นโดยไม่ลงมือทำ และอธิบายให้เข้าใจอย่างละเอียด | Prompt นี้ช่วยให้ฉันเข้าใจ Requirements, Issues, Branch Workflow, Acceptance Criteria และหลักฐานที่ต้องส่งก่อนเริ่มแก้ไขโปรเจกต์ |
| 2 | Verify Project Foundation | ช่วยอธิบายวิธีตรวจ React, Bootstrap, Express, PostgreSQL, Prisma, Tests, `.gitignore`, `.env.example` และ README โดยต้องทดลองก่อนติ๊ก Acceptance Criteria | ฉันนำ Checklist ไปตรวจการทำงานจริง ไม่ได้ยืนยันเพียงเพราะพบไฟล์ใน Repository |
| 3 | Resolve PowerShell npm Error | เมื่อรัน `npm install` แล้ว PowerShell แจ้งว่า `npm.ps1` ถูกปิดกั้นด้วย Execution Policy ควรแก้อย่างไร | ฉันตรวจสอบทางเลือกและใช้ `npm.cmd` เพื่อทำงานโดยไม่เปลี่ยน Security Policy ของเครื่อง |
| 4 | Resolve Prisma Authentication | `prisma migrate status` แสดง P1000 Authentication failed ต้องตรวจและแก้ไขอย่างไร | ฉันตรวจ Username, Password, Port และ Database Name ให้ตรงกับ PostgreSQL ในเครื่อง และเก็บ Credentials ไว้เฉพาะใน `.env` |
| 5 | Implement Health Check | Server Test คาดหวัง HTTP 200 แต่ได้รับ 501 จาก `GET /api/health` ต้องตรวจและแก้อย่างไร | ฉันตรวจ Response Contract และ Implement Endpoint ตาม Acceptance Criteria จากนั้นยืนยันด้วย Supertest และ Build |
| 6 | Verify Category Seed | Reviewer แจ้งว่า `seed.ts` มี `.catch()` ซ้อนกันและปีกกาไม่ครบ ควรตรวจสอบอย่างไร | ฉันตรวจ Source File และ Pull Request Diff แยกกัน แล้วใช้ TypeScript และ Prisma ตรวจสอบก่อนส่งให้ Reviewer ตรวจใหม่ |
| 7 | Debug Client Test | Client Test คาดหวัง Online แต่แสดง Offline ทั้งที่ Mock API แล้ว ควรตรวจสอบอะไร | จาก Error Output ฉันตรวจ Import Resolution และพบ Generated JavaScript เก่าที่ไม่ตรงกับ TypeScript Source จึงลบเฉพาะ Generated Files และเพิ่ม `noEmit` ก่อนรัน Tests ใหม่ |
| 8 | Verify Pull Request Diff | Reviewer แจ้งว่า `App.tsx` ไม่มี `return` และ JSX อยู่ใน `catch` แต่ไฟล์จริงมีโครงสร้างครบ ควรตรวจอย่างไร | ฉันตรวจ Full Source File, เปรียบเทียบ Local กับ Remote Branch และรัน TypeScript Check ก่อนอธิบายว่า Unified Diff ซ่อนบรรทัดที่ไม่มีการเปลี่ยนแปลง |

## Reflection

Prompt มีประสิทธิภาพมากขึ้นเมื่อฉันระบุ Current Branch, Working Directory, File Paths, Error Output, Expected Result และขอบเขตของ Issue อย่างชัดเจน ฉันไม่ได้ยอมรับคำแนะนำทันที แต่ตรวจสอบ Source Code, Dependencies, Git Diff, Tests, Build และ Application จริงก่อน Commit

ตัวอย่างหนึ่งคือข้อเสนอให้ติดตั้ง Bootstrap เพิ่ม ฉันตรวจ `client/package.json` และ Import ใน `client/src/main.tsx` ก่อน และพบว่าติดตั้งไว้แล้วจึงไม่ทำการเปลี่ยนแปลงซ้ำซ้อน อีกตัวอย่างคือ Database Credentials ใน `.env.example` ไม่ตรงกับ PostgreSQL ในเครื่อง ฉันจึงปรับเฉพาะ `.env` และยืนยันการเชื่อมต่อด้วย Prisma โดยไม่ Commit ข้อมูลลับ

จาก Lab นี้ฉันเรียนรู้ว่า AI สามารถช่วยอธิบายและลดเวลาในการวิเคราะห์ปัญหาได้ แต่ความเข้าใจ การตัดสินใจ การตรวจสอบ และความรับผิดชอบต่อผลลัพธ์สุดท้ายยังคงเป็นของผู้พัฒนา
