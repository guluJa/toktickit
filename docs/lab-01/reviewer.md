# Lab 1 - Peer Review Record

## Author Information

- Name: ณัฐวดี  ภูเขม่า
- Student ID: 67070507201
- GitHub Username: `guluJa`
- Repository: https://github.com/guluJa/toktickit

## Reviewers of My Pull Requests

| Work | Pull Request | Reviewer Name | Student ID | GitHub Username | Result |
|---|---|---|---|---|---|
| Issue 1: Project Foundation | [PR #2](https://github.com/guluJa/toktickit/pull/2) | ศักย์ศรณ์  บูรณะธนานันท์ | 67070507208 | `poom2548` | Approved |
| Issue 2: API Health Check | [PR #4](https://github.com/guluJa/toktickit/pull/4) | แพรวา สภานนท์ | 67070507213 | `PhraewaS` | Approved |
| Issue 3: Category Seed | [PR #6](https://github.com/guluJa/toktickit/pull/6) | ศักย์ศรณ์  บูรณะธนานันท์ | 67070507208 | `poom2548` | Approved |
| Issue 4: Category List | [PR #8](https://github.com/guluJa/toktickit/pull/8) | ศักย์ศรณ์  บูรณะธนานันท์ | 67070507208 | `poom2548` | Approved |

## Review Feedback Received

### PR #2 - Project Foundation

- Pull Request: https://github.com/guluJa/toktickit/pull/2
- Reviewer: `poom2548`

#### Review Timeline

1. **Initial review**

   Reviewer requested changes because `client/package.json` and `client/src/main.tsx` were not visible in Files changed:

   > Frontend ขาดการตั้งค่า Bootstrap ขาด `client/package.json` กับ `client/src/main.tsx`
   >
   > 1. รัน `npm install bootstrap` ในโฟลเดอร์ `client`
   > 2. เพิ่ม `import 'bootstrap/dist/css/bootstrap.min.css';` ใน `client/src/main.tsx`
   > 3. เสร็จแล้ว Commit มา

2. **Reviewer recheck and approval**

   ก่อนที่ฉันจะตอบกลับ Reviewer ตรวจสอบไฟล์อีกครั้งและพบว่าไฟล์มีอยู่แล้ว จากนั้นกด Approve:

   > ตอนแรกหาไฟล์ไม่เจอ เลยนึกว่าลืมใส่มา แต่เช็คให้ใหม่ครบแล้ว

3. **My Response After Approval**

   หลัง Reviewer กด Approve ฉันตอบกลับเพื่อยืนยันผลการตรวจ:

   > ขอบคุณที่ตรวจสอบให้อีกครั้งและ Approve PR ให้นะคะ ตัวไฟล์มีอยู่ใน Base Branch เดิมแล้วจึงไม่แสดงใน Files changed ตอนนี้ตรวจสอบ Bootstrap Dependency, CSS Import และการแสดงผลหน้า Frontend ครบถ้วนแล้วค่ะ

#### Resolution

> ไม่มีการแก้ Source Code หรือ Commit เพิ่ม เนื่องจาก Bootstrap Dependency และ CSS Import มีอยู่ใน Base Branch แล้ว Reviewer ตรวจสอบใหม่และ Approve ก่อน PR #2 ถูก Merge เข้า `lab1-staging`

### PR #4 - API Health Check

- Pull Request: https://github.com/guluJa/toktickit/pull/4
- Reviewer: `PhraewaS`

#### Review Timeline

1. **Initial review**

   > Issue 2 มีงานของ Issue 4 ปนอยู่ ควรให้ Issue 2 มีเฉพาะ Health Check, Test, การแสดง Backend Status และ Error เมื่อ Backend ใช้งานไม่ได้ ส่วน Category API และ Category UI ให้ย้ายไปทำบน `feature/4-category-list` หลัง Issue 3 Merge เข้า `lab1-staging`

2. **My response**

   > ตรวจสอบ Files changed เทียบกับ Base Branch lab1-staging อีกครั้งแล้ว พบว่า PR นี้มีเฉพาะงานของ Issue 2 ดังนี้:
    > เพิ่ม GET /api/health ให้ตอบ HTTP 200 และ JSON ตาม Acceptance Criteria
    > เพิ่ม checkHealth() สำหรับเรียก Health API จริง
    > หน้า React แสดง Loading, Backend Status: Online และข้อความ Offline เมื่อ Backend ใช้งานไม่ได้
    > Supertest ของ Health Endpoint ผ่านแล้ว PR นี้ไม่ได้เพิ่ม GET /api/categories, ไม่ได้เรียก Category API และไม่ได้แสดง Category UI ค่ะ ส่วน Category, SystemStatus, checkSystem() และ TODO ของ Issue 4 ที่ยังเห็นในไฟล์ เป็น Starter Scaffold ที่มีอยู่ใน Base Branch lab1-staging อยู่ก่อนแล้ว จึงไม่ปรากฏเป็นโค้ดที่เพิ่มใน Diff และเก็บไว้เพื่อ Implement ภายหลังบน feature/4-category-list หลัง Issue 3 Merge แล้วค่ะ ดังนั้นส่วนนี้จึงยังไม่มี Category code หากมีส่วนไหนไม่ถูกต้องหรือควรได้รับการแก้ไขปรับปรุง บอกได้เลยนะคะ

3. **Reviewer follow-up**

   > โอเคค่ะ ขอบคุณที่ชี้แจงนะคะ เรากลับไปดู Files changed อีกรอบแล้ว เห็นว่า PR นี้แก้เฉพาะส่วน Health Check ของ Issue 2 จริง ๆ
   > ส่วนโค้ดที่เกี่ยวกับ Category และ TODO ของ Issue 4 มีอยู่ใน Starter Scaffold ตั้งแต่ก่อนสร้าง Branch นี้แล้ว ไม่ได้เป็นโค้ดที่เพิ่มเข้ามาใน PR นี้
   > ขอโทษที่รอบแรกเข้าใจคลาดเคลื่อนนะคะ ไม่ต้องลบหรือย้าย Category code แล้วค่ะ เดี๋ยวเราจะ Review และ Approve ให้อีกครั้งนะคะ

#### Resolution

> ไม่มีการลบหรือย้าย Category Code เนื่องจากไม่ได้เป็นการเปลี่ยนแปลงของ PR #4 Reviewer ตรวจสอบ Diff ใหม่และ Approve ก่อน Merge เข้า `lab1-staging`

### PR #6 - Category Seed

- Pull Request: https://github.com/guluJa/toktickit/pull/6
- Reviewer: `poom2548`

#### Review Timeline

1. **Initial review**

   > ในไฟล์ `seed.ts` ใช้ `.catch()` ซ้อนกัน และปีกกาไม่ครบ ส่วนที่เหลือถูกแล้ว

2. **My response**

   > ตรวจสอบตาม Review และปรับให้ถูกต้องเรียบร้อยแล้ว ตอนนี้ `seed.ts` มี `.catch()` เพียงหนึ่งจุดและมีปีกกาครบ ทดสอบด้วย `npx.cmd tsc --noEmit` ผ่านโดยไม่มี Error รบกวนตรวจสอบและ Review อีกครั้งค่ะ

3. **Reviewer approval**

   > Reviewer ตรวจสอบอีกครั้งและกด Approve

#### Resolution

> ตรวจ Full Source File และยืนยันว่า `main().catch(...).finally(...)` มีโครงสร้างครบและผ่าน TypeScript Check จากนั้น PR #6 ถูก Merge เข้า `lab1-staging`

### PR #8 - Category List

- Pull Request: https://github.com/guluJa/toktickit/pull/8
- Reviewer: `poom2548`

#### Review Timeline

1. **Initial review**

   > ไฟล์ `client/src/App.tsx` มีปัญหา Syntax Error ทำให้มีแท็กหลงไปอยู่ในบล็อก `catch` และโค้ดส่วน UI ที่ใช้แสดงผลขาดคำสั่ง `return (...)` ครอบเอาไว้ ทำให้ตอนรันจะเกิด Error

2. **My response**

   > ขอบคุณสำหรับ Review ค่ะ ตรวจไฟล์ฉบับเต็มบน Branch feature/4-category-list แล้ว ทั้งสองประเด็นเกิดจากการอ่าน GitHub Unified Diff ซึ่งซ่อนบรรทัดที่ไม่มีการเปลี่ยนแปลงค่ะ
   >
   > โครงสร้างจริงของไฟล์เป็นดังนี้:
    > บล็อก catch ปิดหลัง setState("error");
    > ฟังก์ชัน handleCheck ปิดก่อนเริ่มส่วน UI
    > มี return (...) ครอบ JSX ทั้งหมด
    > JSX ไม่ได้อยู่ภายในบล็อก catch ในหน้า Files changed เลขบรรทัดกระโดดจากบรรทัดปกติ เพราะ GitHub ซ่อนบรรทัดที่ไม่มี Diff ซึ่งเป็นช่วงที่มีการปิด catch, ปิด handleCheck และเริ่ม return (...)
    >
   > ตรวจด้วย npx.cmd tsc --noEmit แล้วผ่านโดยไม่มี Syntax Error สามารถตรวจไฟล์ฉบับเต็มได้ที่: https://github.com/guluJa/toktickit/blob/feature/4-category-list/client/src/App.tsx
   > ดังนั้นจึงยังไม่มี Source Code ที่ต้องแก้ในสองจุดนี้ สามารถตรวจจากไฟล์ฉบับเต็มได้เลยค่ะ

3. **Reviewer approval and follow-up**

   Reviewer กด Approve แล้วตอบกลับว่า:

   > น่าจะเผลอกด Dropdown ไม่หมด เลยไม่เห็นโค้ดทั้งหมด ขอโทษครับ

#### Resolution

> ไม่มีการแก้ Source Code เนื่องจาก Full Source File ถูกต้อง Reviewer ตรวจสอบใหม่ กด Approve และ Merge PR #8 เข้า `lab1-staging`


## Pull Requests Reviewed by Me

### Review 1 — set up project foundation

- Repository: https://github.com/poom2548/toktickit
- Pull Request: https://github.com/poom2548/toktickit/pull/5
- Author: ศักย์ศรณ์ บูรณะธนานันท์
- Student ID: 67070507208
- GitHub Username: `poom2548`
- Related Work: Issue 1 — set up project foundation
- Initial Verdict: Changes requested
- Final Verdict: Approved after verification

#### My Initial Review Comment

> ตรวจสอบแล้วพบว่าโครงสร้าง Repository และทิศทางของ Pull Request ถูกต้อง โดย PR ใช้ `feature/1-project-foundation` เป็น Compare Branch และ `lab1-staging` เป็น Base Branch แต่พบว่ายังมีรายการที่ควรแก้ไขก่อนดังนี้:
>
> 1. จากมุมมอง Reviewer ยังไม่พบ GitHub Project ที่เชื่อมกับ Repository จึงไม่สามารถตรวจสอบ Kanban Board และสถานะ Issues ได้
> 2. Issues #1–#4 ยังไม่มี Description, Required Branch และ Acceptance Criteria ตาม Labsheet และยังไม่ได้เพิ่มเข้า Project
> 3. README ยังขาดรายละเอียดการติดตั้ง Client/Server, การสร้าง `.env` จาก `.env.example`, การตั้งค่า PostgreSQL, วิธีเปิด Frontend/Backend, วิธีรัน Tests และคำเตือนไม่ให้ Commit Secrets
> 4. README ระบุ `prisma db push` แต่ Issue #1 ยังไม่มี Prisma Model แนะนำให้ใช้ `prisma validate` และ `prisma migrate status` สำหรับตรวจ Project Foundation

#### Partner's Response

> แก้แล้ว

#### My Follow-up Review

> ตรวจสอบการแก้ไขแล้ว ได้รับการแก้ไขเกือบครบตาม Review แล้วค่ะ แนะนำให้เพิ่มเติมคำสั่ง `npx prisma migrate status` ใน README หลัง `npx prisma validate` เพื่อให้ผู้ใช้สามารถตรวจสอบการเชื่อมต่อ PostgreSQL ผ่าน Prisma ได้จริง เมื่อเพิ่มเติมแล้วแจ้งให้ตรวจอีกครั้งได้เลยค่ะ

#### Partner's Final Response

> แก้แล้ว

#### Final Result

> ฉันตรวจสอบการแก้ไขอีกครั้ง หลังจาก GitHub Project, Issues และ README ได้รับการปรับปรุงตามข้อเสนอแนะ แล้วจึง Approve Pull Request

### Review 2 — Display the IT request category list

- Repository: https://github.com/PhraewaS/toktickit
- Pull Request: https://github.com/PhraewaS/toktickit/pull/8
- Author: แพรวา สภานนท์
- Student ID: 67070507213
- GitHub Username: `PhraewaS`
- Related Work: Issue 4 — Display the IT request category list
- Initial Verdict: Changes requested
- Final Verdict: Approved after verification

#### My Review Comment

> ตรวจสอบแล้ว พบว่าการเรียก Categories API ผ่าน Prisma การเรียงข้อมูลตาม ID การแสดงผลข้อมูลจาก API รวมถึง Loading และ Error states ทำได้ถูกต้องค่ะ อย่างไรก็ตาม แนะนำว่า API ควรปรับให้ส่งกลับเฉพาะ `id` และ `name` เพิ่มการตรวจสอบ ID และรูปแบบ Response ใน Supertest และเพิ่ม Account and Access ใน Vitest ให้ครบทั้ง 4 categories ค่ะ

#### Partner's Response

> ขอบคุณสำหรับคำแนะนำนะคะ แก้เรียบร้อยแล้วค่ะ ตอนนี้ API ส่งกลับเฉพาะ `id` กับ `name` เพิ่มการตรวจสอบ Response ใน Supertest และเพิ่ม Account and Access ใน Vitest ให้ครบทั้ง 4 Categories แล้วค่ะ ทดสอบทั้ง Frontend และ Backend ผ่านครบ รบกวนช่วยตรวจให้อีกครั้งนะคะ

#### My Follow-up Review

> ตรวจสอบการแก้ไขแล้วค่ะ การแก้ไขครบถ้วนตามคำแนะนำและตรงตาม Acceptance Criteria ของ Issue #4 แล้ว ไม่พบประเด็นที่ต้องแก้ไขเพิ่มเติมค่ะ

#### Final Result

> ฉันตรวจสอบการตอบกลับของ API, Supertest และ Vitest อีกครั้ง แล้วจึง Approve Pull Request

### Review 3 — feat: fetch and display categories on frontend and resolve CORS

- Repository: https://github.com/meebotsompurin-stack/toktickit
- Pull Request: https://github.com/meebotsompurin-stack/toktickit/pull/10
- Author: ภูรินท์ มีบทสม
- Student ID: 67070507214
- GitHub Username: `meebotsompurin-stack`
- Related Work: Issue 4 — fetch and display categories on frontend and resolve CORS
- Initial Verdict: Changes requested
- Final Verdict: Approved after verification

#### Review Record Note

ข้อความ Review แรกไม่ปรากฏในมุมมองปัจจุบันของ Pull Request หลังจากผู้เขียนแก้ไขงาน ดังนั้นรายการด้านล่างเป็นการสรุปจากข้อความตอบกลับของผู้เขียนที่ยังปรากฏอยู่ใน PR และอาจมีความคลาดเคลื่อน

#### Requested Corrections Reconstructed from the Partner's Response

- เพิ่ม `orderBy: { id: "asc" }` เพื่อจัดเรียง Categories ตาม ID
- เพิ่ม Supertest ให้ตรวจ Categories ทั้ง 4 รายการ รวมถึง `id`, `name` และลำดับ
- เพิ่ม Vitest สำหรับพฤติกรรม UI ตาม Acceptance Criteria
- ใช้ชื่อ Branch `feature/4-category-list`
- ไม่นำงานของ Issue 3 มาปะปนใน PR
- นำ `server/.env` ออกจาก Git

#### Partner's Response

> ดำเนินการแก้ไขตามที่คอมเมนต์เรียบร้อยแล้ว รายละเอียดดังนี้:
>
> - เพิ่ม `orderBy: { id: 'asc' }` ใน `findMany()` เพื่อเรียงการเรียกใช้งานตาม ID
> - เพิ่ม Supertest ให้ตรวจสอบ Categories ทั้ง 4 รายการ ครอบคลุมฟิลด์ `id`, `name` และการเรียงลำดับอย่างถูกต้อง
> - เพิ่ม Vitest ฝั่ง Client เพื่อทดสอบพฤติกรรมการแสดงผลของ UI ตาม Acceptance Criteria
> - เปลี่ยนชื่อ Branch เป็น `feature/4-category-list` ตามที่กำหนด
> - อัปเดตโดยตัดผลงานของ Issue #3 (Schema, Migration, Seed) ออกจาก PR นี้แล้ว
> - ยกเลิกการติดตามไฟล์ `server/.env` ออกจาก Git เรียบร้อย

#### My Follow-up Review

> ตรวจสอบการแก้ไขแล้วค่ะ เหลือจุดสำคัญที่ควรปรับดังนี้:
>
> 1. แก้ `global.fetch` ใน `App.test.tsx` เป็น `globalThis.fetch` เพื่อให้ `npm run build` ผ่านโดยไม่มี TypeScript error
> 2. ปรับ Supertest ให้ตรวจว่า Categories ทั้ง 4 รายการตามลำดับ ไม่ใช่ตรวจเฉพาะรายการแรก เพื่อยืนยันว่า API คืน Seeded Categories ครบถ้วนค่ะ
> 3. นำ `server/.env` ออกจาก Git และเก็บค่าตัวอย่างไว้ใน `.env.example` ค่ะ

#### Partner's Final Response

> ดำเนินการแก้ไขเพิ่มเติมตามข้อเสนอแนะเรียบร้อยแล้ว รายละเอียดดังนี้:
>
> - แก้ `global.fetch` เป็น `globalThis.fetch` ในไฟล์ `App.test.tsx` แก้ปัญหา TypeScript error ทำให้ `npm run build` ผ่านครบ
> - แก้ไข Supertest ให้ตรวจสอบ Categories ครบทั้ง 4 รายการตามลำดับที่ Seed ไว้ เพื่อยืนยันความถูกต้องของ API
> - นำไฟล์ `server/.env` ออกจากระบบ Git และสร้างไฟล์ `.env.example` พร้อมใส่ค่าตัวอย่างไว้ให้แล้ว

#### My Final Verification

> ตรวจสอบการแก้ไขแล้วมีความถูกต้องค่ะ

#### Final Result

> ฉันตรวจสอบ Build, Supertest, Vitest, การเรียง Categories และการไม่นำ `.env` เข้า Git แล้วจึง Approve Pull Request
