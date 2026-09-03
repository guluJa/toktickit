# การใช้ AI และสิ่งที่ได้เรียนรู้จาก Lab 2

## 1. เครื่องมือและความรับผิดชอบ

- เครื่องมือ AI: Codex
- โมเดล: GPT-5.6 Sol
- ระดับการใช้เหตุผล: Medium
- ขอบเขตการใช้งานหลัก: ช่วยเขียนโค้ดตามขอบเขตของแต่ละ Issue ช่วยเขียนชุดทดสอบอัตโนมัติ และช่วยวิเคราะห์ข้อผิดพลาดจาก Test หรือ Build โดยยึด Engineering Contract ที่อนุมัติแล้ว

ฉันใช้ AI Coding Agent เพื่อช่วยเขียนและแก้โค้ดตาม `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md` และ Acceptance Criteria ที่กำหนดไว้ ส่วนการกำหนดขอบเขตของแต่ละ Issue การรันคำสั่ง การตรวจ Test/Build การเปิดหน้าเว็บจริง การตรวจ Git diff และการตัดสินใจรับหรือแก้ผลงานเป็นความรับผิดชอบของฉัน ไม่มี Password, Secret หรือค่าจริงจาก `.env` อยู่ใน Prompt หรือเอกสารนี้

## 2. คำสั่งสำคัญที่เลือกมาแสดง

คำสั่งด้านล่างเรียบเรียงจากคำสั่งและบริบทจริงในบทสนทนาหลายรอบให้กระชับขึ้น โดยยังคงวัตถุประสงค์ ขอบเขต ปัญหาที่พบ และเงื่อนไขตรวจรับเดิมไว้ ไม่ได้สร้าง Feature หรือผลทดสอบย้อนหลัง

| # | ส่วนที่พัฒนา | คำสั่งสำคัญ | สิ่งที่ขอให้ AI ช่วย | วิธีที่ฉันตรวจสอบ |
|---|---|---|---|---|
| 1 | การสร้าง Ticket Number แบบ TDD | “ช่วยพัฒนา Ticket Number ตาม Contract ของ Lab 2 โดยเริ่มเขียน `server/tests/lab-02/ticket-number.unit.test.ts` และยืนยันว่า Test ล้มเหลวเพราะยังไม่มี Module ก่อน จากนั้นจึงเขียน `server/src/ticket-number.ts` ให้ Backend สร้างเลขรูปแบบ `TKT-YYYYMMDD-XXXXXX` จากวันที่ UTC และเลขฐานสิบหกตัวพิมพ์ใหญ่หกหลัก ห้ามเปลี่ยนชื่อไฟล์ Test ที่ชีทกำหนด” | Unit Test ที่ล้มเหลวก่อน และ Implementation ขั้นต่ำสำหรับสร้าง Ticket Number | ฉันเห็น Test ล้มเหลวจาก Missing Module ก่อน จากนั้น Unit Test 4 รายการและ Server Build ผ่าน |
| 2 | การตรวจข้อมูลก่อนสร้าง Ticket | “ช่วยเขียนและทดสอบการ Normalize ข้อมูล Create Ticket โดย Trim Summary และ Description ตรวจขอบเขตความยาว รับ Priority เฉพาะ `LOW`, `MEDIUM`, `HIGH` ตรวจ `submissionKey` และ Reference ID ที่ต้องเป็นจำนวนเต็ม พร้อมปฏิเสธ Field ที่ Backend ต้องเป็นผู้กำหนด เช่น Ticket Number, Status, Requester และ Timestamp โดยต้องคืน Error ราย Field และไม่บันทึก Ticket เมื่อข้อมูลไม่ถูกต้อง” | `ticket-validation.ts` และ Unit Test ที่ตรวจค่าขอบเขตใน `validation.unit.test.ts` | Unit Test 8 รายการผ่าน และ API Test ยืนยัน HTTP 400 พร้อมตรวจว่าไม่มี Partial Ticket ถูกบันทึก |
| 3 | API สำหรับ Reference Data | “ช่วยเขียน API ของ Category และ Related System สำหรับ Lab 2 ให้คืนเฉพาะข้อมูล Active เรียงตามชื่อและ ID อย่างแน่นอน และเปิดเผยเฉพาะ Field ที่ระบุใน Contract พร้อมรักษาพฤติกรรมเดิมของ Lab 1 โดยแก้ Regression Expectation ให้ตรงกับลำดับที่อนุมัติ ไม่ลดความเข้มของ Test Lab 2” | การแก้ Express/Prisma Endpoint และ API/Regression Tests | Reference-data API Tests และ Lab 1 Regression ผ่าน รวมทั้ง Server Test ทั้งชุดยังผ่าน |
| 4 | การสร้าง Ticket และ Idempotency | “ช่วยเขียน `POST /api/tickets` สำหรับ Requester จาก `X-Development-Requester-Id` โดย Backend ต้องกำหนด Requester, Ticket Number, Ticket Date และสถานะเริ่มต้น `NEW` ตรวจว่า Category และ Related System เป็น Active และใช้ `(requesterId, submissionKey)` ป้องกันการสร้างซ้ำ พร้อมจำลองและแก้ Prisma `P2002` จาก Concurrent Request เพื่อให้คืน Ticket เดิมแทน HTTP 500 และเพิ่ม Test สำหรับ Collision, Replay, Concurrent Request และ Safe Failure” | Transaction สำหรับสร้าง Ticket การจัดการ Unique Conflict และ API Tests | API Tests ตรวจ HTTP 201/200, ค่า `replayed`, Ticket ID/Number เดิม, จำนวน Record ในฐานข้อมูล, Collision Retry และ Safe 500 |
| 5 | หน้า Create Ticket | “ช่วยเขียนเฉพาะหน้า Create Ticket ของ Requester ตาม Zen Green Contract ให้โหลด Reference Data แยก Required/Editable/Read-only Fields แสดง Validation จาก Client และ Backend `error.fields` ปิด Controls ระหว่าง Loading/Submitting ป้องกันการ Submit ซ้ำ รักษาค่าที่กรอกและใช้ Submission Key เดิมเมื่อ Retry หลัง Safe Failure และแสดงค่าที่ Backend บันทึกพร้อม Next Actions เมื่อสำเร็จ” | React Component การเชื่อม API และ UI Tests สำหรับ Loading, Validation, Busy, Success และ Failure | Client Tests ตรวจว่าเรียก Submit ครั้งเดียว แสดง Error ถูก Field รักษาค่าที่กรอก ใช้ข้อมูลจาก Response และ Retry Attachment ได้โดย Ticket เดิมไม่หาย |
| 6 | หน้า My Tickets ของ Requester | “ช่วยพัฒนา My Tickets เป็น Full-stack Increment เดียว โดย Parse และตรวจ Search, Filter, Sort, Page และ Page Size จำกัดทุก Query ด้วย Current Requester คืนลำดับที่แน่นอนพร้อม Pagination Metadata แสดง Desktop Table และ Mobile Cards แยก Empty กับ No-results รองรับ Retry/Clear Filters และล้างข้อมูลของ Requester A ก่อนโหลดข้อมูล Requester B โดยยังไม่เพิ่ม Ticket Detail หรือ Authentication” | Query Parser, Requester-owned API, Client API, Responsive List UI และ Automated Tests | ฉันตรวจ Search, Category, System, Priority, Status, Sort, Page Size, Previous/Next, การแยกข้อมูล A→B, Safe 400/403/500 และหน้าเว็บหลายขนาด |
| 7 | Ticket Detail และ Attachment | “ช่วยเขียน Ticket Detail แบบ Read-only และ Attachment Lifecycle ตาม Contract โดย Direct Access ข้าม Requester ต้องได้ Safe 404 เก็บไฟล์แบบ Private รับ JPG/JPEG, PNG, WEBP และ PDF ขนาดไม่เกิน 5 MB และมี Active ได้ไม่เกินห้าไฟล์ เมื่อเลือกไฟล์ถูกและผิดพร้อมกันต้องเก็บไฟล์ที่ถูกไว้ ตรวจ Bytes, Filename และ Headers ตอน Download ทำ Soft-remove พร้อมเหตุผล ปิด Download ของไฟล์ที่ Removed และชดเชยเมื่อการบันทึกไฟล์หรือ Metadata ล้มเหลว” | Detail/Attachment API, UI Components, Private-storage Behavior และ Boundary/Security Tests | Tests ตรวจ Mixed Selection, Maximum/Replacement Count, Download Contract/UI, Removal Metadata, HTTP 410, Safe 500 และ Cross-owner List/Detail/Download/Remove |
| 8 | E2E, Responsive และ Accessibility | “ช่วยเขียน Playwright E2E, Responsive และ Accessibility Tests ที่ยังขาดสำหรับ Flow รวมของ Lab 2 ให้ครอบคลุม Requester Selection, Create → List → Detail, การเปลี่ยน Requester A→B, Attachment Upload/Download/Remove, Controls และ Safe Failures ให้ Test สร้างภาพ Desktop/Tablet/Mobile ตาม Path ที่กำหนด และเพิ่ม Assertion สำหรับ Horizontal Overflow, Hidden Actions, Keyboard Focus, `aria-describedby`, `aria-current` และ State ที่ไม่สื่อด้วยสีเพียงอย่างเดียว” | Playwright E2E/Responsive Test Code, Accessibility Assertions และการสร้าง Screenshot อัตโนมัติ | ฉันรันชุดทดสอบระบบรวมและตรวจผล Server 91, Client 39, Playwright 6, Server/Client Builds, Screenshot Paths และ `git diff --check` ด้วยตนเอง |

## 3. การตัดสินใจสำคัญที่ตรวจสอบระหว่างพัฒนา

| ประเด็นตัดสินใจ | กติกาที่ตรวจสอบแล้ว |
|---|---|
| Development Requester identity | เป็น Test context สำหรับ Lab 2 ไม่ใช่ Authentication; ไม่มี Password, Session, Token หรือ Role-based workflow และสามารถแทนด้วย authenticated identity ใน Lab 3 |
| Ticket creation and attachments | สร้าง Ticket ก่อน Attachment upload เพื่อให้ Ticket ที่สำเร็จไม่ถูก Rollback เมื่อไฟล์ล้ม และ Retry เฉพาะไฟล์ได้ |
| Duplicate submission | ใช้ `(requesterId, submissionKey)` เป็น unique identity พร้อม replay behavior และจัดการ concurrent unique conflict โดยไม่คืน unsafe 500 |
| Ownership failure | Direct access ข้าม Requester คืน Safe 404 สำหรับ resource-specific operations เพื่อไม่เปิดเผยว่าทรัพยากรมีอยู่ |
| Attachment removal | ใช้ Soft removal พร้อม reason/actor/timestamp; metadata ยังคงอยู่ แต่ไฟล์ที่ Removed ดาวน์โหลดไม่ได้ |
| Completion evidence | ไม่ใช้ภาพ Mockup หรือคำตอบของ AI เป็นหลักฐานผ่าน ใช้ Test output, database-backed flow, GitHub review และ screenshots จาก Browser flow จริง |

## 4. สิ่งที่ได้เรียนรู้

AI ช่วยให้ฉัน Implement งาน Full-stack ทีละ Issue โดยยังรักษา Contract เดียวกันระหว่าง Backend, Frontend, Database และ Tests ปัญหาที่ทำให้เข้าใจระบบมากที่สุดคือ Prisma `P2002`: การค้นข้อมูลก่อน Create อย่างเดียวไม่ครอบคลุม Race condition จึงต้องจัดการ unique conflict และ replay ที่ Backend พร้อมทดสอบ concurrent request จริง

ฉันพบว่าผลลัพธ์ของ AI ต้องตรวจด้วยหลักฐานเสมอ บางคำแนะนำช่วงแรกใช้ชื่อไฟล์หรือโครง E2E ไม่ตรง Labsheet และบางครั้งสรุปจาก UI ก่อน Test ครบ ฉันจึงตรวจ exact paths, รัน Test/Build, ตรวจ Browser หลาย viewport และใช้ Peer Review ตรวจ Revision อีกชั้นหนึ่ง ประสบการณ์นี้ทำให้ฉันเข้าใจ Traceability ระหว่าง Requirement → Acceptance Criteria → Test → Evidence, การป้องกันข้อมูลด้วย requester ownership และความแตกต่างระหว่าง Development Requester test context ใน Lab 2 กับ Authentication ที่จะนำมาแทนใน Lab 3

เอกสารนี้เป็นบันทึกการใช้ AI ฉบับสมบูรณ์ของ Lab 2 โดยระบุเครื่องมือและโมเดล คำสั่งสำคัญ 8 รายการ วิธีตรวจผลลัพธ์ การตัดสินใจที่สำคัญ และสิ่งที่ได้เรียนรู้จากการใช้งานจริง

## 5. หลักฐานสำหรับ PDF — Answer Part 4

Answer Part 4 ใช้เอกสาร `ai-use.md` ฉบับนี้เพื่อแสดงเครื่องมือและโมเดลที่ใช้ คำสั่งสำคัญ 8 รายการ งานที่ขอให้ AI ช่วย วิธีที่ฉันตรวจสอบผลลัพธ์ การตัดสินใจระหว่างพัฒนา และสิ่งที่ได้เรียนรู้ โดยใช้ Source Code, Automated Tests, Browser flow และ GitHub Review เป็นหลักฐานยืนยันผลลัพธ์แทนการรับคำตอบจาก AI โดยไม่ตรวจสอบ
