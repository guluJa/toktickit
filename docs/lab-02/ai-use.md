# การใช้ AI และสิ่งที่ได้เรียนรู้จาก Lab 2

## 1. เครื่องมือและความรับผิดชอบ

- เครื่องมือช่วยจัดระเบียบ Requirement และถ้อยคำ: ChatGPT แบบ Classic
- AI Coding Agent: Codex
- โมเดลที่ใช้กับ Codex: GPT-5.6 Sol
- ขอบเขตการใช้งานหลัก: ช่วยเขียนและแก้โค้ดตามขอบเขตของแต่ละ Issue ช่วยเขียน Test และช่วยวิเคราะห์ข้อผิดพลาดจาก Test หรือ Build

ในการทำงาน ฉันเป็นผู้กำหนดเป้าหมาย ปัญหา และเงื่อนไขของงานด้วยตนเองก่อน แต่บางครั้งคำอธิบายแรกของฉันยังไม่เป็นลำดับ จึงใช้ ChatGPT แบบ Classic ช่วยจัดระเบียบถ้อยคำและทำให้ Requirement อ่านเข้าใจง่ายขึ้น

หลังจากนั้นฉันอ่าน ตรวจสอบ และแก้ไขข้อความที่เรียบเรียงแล้วด้วยตนเอง โดยเพิ่มรายละเอียดที่จำเป็น เช่น ขอบเขตของ Issue ไฟล์ที่เกี่ยวข้อง เงื่อนไขของ API Acceptance Criteria และผลลัพธ์ที่ต้องการ จนได้ Prompt ที่ตรงกับความเข้าใจของฉัน จากนั้นจึงนำ Prompt ฉบับนั้นไปใช้กับ Codex เพื่อช่วยเขียนหรือแก้ไขโค้ดและ Test

การกำหนดขอบเขตของแต่ละ Issue การรันคำสั่ง การตรวจ Test/Build การเปิดหน้าเว็บจริง การตรวจ Git diff และการตัดสินใจรับหรือแก้ผลงานเป็นความรับผิดชอบของฉัน ไม่มี Password, Secret หรือค่าจริงจาก `.env` อยู่ใน Prompt หรือเอกสารนี้

## 2. คำสั่งสำคัญที่เลือกมาแสดง

Prompt ในตารางเป็นคำสั่งที่ฉันตรวจสอบและนำไปใช้จริงกับ Codex โดยเริ่มจากความต้องการของฉันเอง แล้วจัดรายละเอียดให้ AI เข้าใจงานได้ชัดเจนขึ้น คำสั่งเหล่านี้ยังคงวัตถุประสงค์ ขอบเขต ปัญหาที่พบ และเงื่อนไขตรวจรับของงานไว้ ไม่ได้สร้าง Feature หรือผลทดสอบย้อนหลัง

| # | ส่วนที่พัฒนา | Prompt สำคัญ | สิ่งที่ขอให้ AI ช่วย | วิธีที่ฉันตรวจสอบ |
|---|---|---|---|---|
| 1 | การสร้าง Ticket Number แบบ TDD | “ช่วยทำส่วนสร้างเลข Ticket ให้หน่อยค่ะ ขอเริ่มจากเขียน Test ให้เห็นว่า Test ล้มเหลวก่อน เพราะยังไม่มีไฟล์ที่เกี่ยวข้อง แล้วค่อยสร้างไฟล์ให้ Backend สร้างเลขรูปแบบ TKT-YYYYMMDD-XXXXXX โดยใช้วันที่ UTC และตัวอักษร A-F กับตัวเลข 6 ตัวค่ะ” | เขียน Unit Test และสร้างไฟล์สำหรับสร้าง Ticket Number | ตรวจว่า Test ล้มเหลวจาก Missing Module ก่อน จากนั้นรัน Unit Test 4 รายการและ Server Build |
| 2 | การตรวจข้อมูลก่อนสร้าง Ticket | “ช่วยทำ validation สำหรับการสร้าง Ticket ให้หน่อยค่ะ ต้องตัดช่องว่างหน้า-หลังของ Summary กับ Description ตรวจความยาวและ Priority ที่อนุญาต ตรวจ Category, Related System และ submissionKey ด้วย ถ้าข้อมูลผิดให้บอก error ที่ field นั้น และห้ามบันทึก Ticket ค่ะ” | เขียน `ticket-validation.ts` และ Unit Test สำหรับข้อมูลขอบเขตต่าง ๆ | รัน Unit Test 8 รายการ และ API Test ที่ตรวจ HTTP 400 กับการไม่เกิด Partial Ticket |
| 3 | API สำหรับ Reference Data | “ช่วยตรวจและแก้ API ของ Category กับ Related System ให้หน่อยค่ะ ขอเฉพาะรายการที่ active เรียงผลให้แน่นอน และส่งกลับเฉพาะข้อมูลที่หน้าเว็บต้องใช้ โดยไม่ทำให้ Test เดิมของ Lab 1 เสียค่ะ” | แก้ Express/Prisma Endpoint และ API/Regression Tests | ตรวจรายการ Active การเรียงลำดับข้อมูล Response Shape และรัน Server Test ทั้งชุด |
| 4 | การสร้าง Ticket และ Idempotency | “ช่วยทำ API POST /api/tickets ให้หน่อยค่ะ Requester ต้องมาจาก X-Development-Requester-Id และ Ticket Number, Ticket Date กับสถานะ NEW ต้องถูกสร้างจาก Backend ถ้าส่ง submissionKey เดิมซ้ำ หรือเกิด Prisma P2002 จากการส่งพร้อมกัน ให้คืน Ticket เดิมแทนการตอบ 500 และช่วยเพิ่ม Test ให้ครบค่ะ” | สร้าง Ticket ใน Transaction จัดการ Duplicate และ Concurrent Request | ตรวจ HTTP 201/200 ค่า `replayed` Ticket ID/Number เดิม จำนวน Record ในฐานข้อมูล Collision Retry และ Safe Failure |
| 5 | หน้า Create Ticket | “ช่วยทำหน้า Create Ticket ตาม UI ที่กำหนดให้หน่อยค่ะ ต้องโหลดข้อมูล Category กับ Related System ก่อน ปิดปุ่มตอน Loading และตอนกำลัง Submit แสดง validation ทั้งของหน้าเว็บและ Backend รักษาค่าที่กรอกไว้เมื่อเกิด error และหลังสำเร็จให้แสดงค่าที่บันทึกจริงกับปุ่ม View Ticket และ My Tickets ค่ะ” | สร้าง React Component เชื่อม API และเพิ่ม UI Tests | ตรวจ Loading, Validation, Busy, Success, Failure, Backend field errors และการรักษาค่าฟอร์ม |
| 6 | หน้า My Tickets ของ Requester | “ช่วยทำหน้า My Tickets และ API ให้หน่อยค่ะ ต้องแสดงเฉพาะ Ticket ของ Requester ปัจจุบัน รองรับ Search, Filter, Sort, Page Size และ Pagination แยกกรณีไม่มี Ticket กับค้นหาไม่พบข้อมูล และเมื่อลองเปลี่ยน Requester ต้องไม่แสดงข้อมูลของคนเดิมค่ะ” | สร้าง Query Parser, Requester-owned API และ Responsive UI | ตรวจ Search, Category, System, Priority, Status, Sort, Page Size, Previous/Next, Empty, No-results และ Requester A → B |
| 7 | Ticket Detail และ Attachment | “ช่วยทำหน้า Ticket Detail และระบบ Attachment ตามเงื่อนไขของงานให้หน่อยค่ะ ต้องตรวจว่าเป็นเจ้าของ Ticket ก่อน รองรับไฟล์ที่อนุญาตและขนาดไม่เกิน 5 MB ดาวน์โหลดได้เฉพาะไฟล์ที่ยัง active และการลบต้องเป็นแบบ soft-remove พร้อมเหตุผล รวมถึงมี Test สำหรับไฟล์ผิด การลบ และการเข้าถึงข้ามเจ้าของค่ะ” | สร้าง Detail/Attachment API, UI และ Private Storage Behavior | ตรวจ Mixed Selection, File Limit, Download Bytes/Headers, Soft-remove, HTTP 410, Safe 500 และ Cross-owner Access |
| 8 | E2E, Responsive และ Accessibility | “ช่วยตรวจและเพิ่ม Playwright Test สำหรับ Flow ของ Lab 2 ให้หน่อยค่ะ ขอให้ครอบคลุมการเลือก Requester, สร้าง Ticket, ดู My Tickets, เปิด Detail และจัดการ Attachment รวมถึงทดสอบ Desktop, Tablet, Mobile, keyboard, aria และการไม่มี horizontal overflow ค่ะ” | สร้าง E2E, Responsive และ Accessibility Tests พร้อม Screenshot | รัน Playwright, ตรวจ Desktop/Tablet/Mobile, Keyboard Focus, ARIA, Hidden Actions, Overflow และ Screenshot Paths |

## 3. การตัดสินใจสำคัญที่ตรวจสอบระหว่างพัฒนา

| ประเด็นตัดสินใจ | กติกาที่ตรวจสอบแล้ว |
|---|---|
| Development Requester identity | เป็น Test context สำหรับ Lab 2 ไม่ใช่ Authentication และไม่มี Password, Session, Token หรือ Role-based workflow |
| Ticket creation and attachments | สร้าง Ticket ก่อน Attachment upload เพื่อให้ Ticket ที่สำเร็จไม่ถูก Rollback เมื่อไฟล์ล้ม และ Retry เฉพาะไฟล์ได้ |
| Duplicate submission | ใช้ `(requesterId, submissionKey)` เป็น unique identity พร้อม Replay behavior และจัดการ Concurrent Request ที่เกิด Prisma `P2002` |
| Ownership failure | การเข้าถึง Resource ของ Requester คนอื่นคืน Safe 404 เพื่อไม่เปิดเผยว่าทรัพยากรมีอยู่ |
| Attachment removal | ใช้ Soft removal พร้อม Reason, Actor และ Timestamp โดย Metadata ยังคงอยู่ แต่ไฟล์ที่ Removed ดาวน์โหลดไม่ได้ |
| Completion evidence | ไม่ใช้คำตอบของ AI เป็นหลักฐานผ่าน ใช้ Source Code, Test Output, Database-backed Flow, GitHub Review และ Screenshot จาก Browser จริง |

## 4. สิ่งที่ได้เรียนรู้

AI ช่วยให้ฉัน Implement งาน Full-stack ทีละ Issue โดยยังรักษา Contract เดียวกันระหว่าง Backend, Frontend, Database และ Tests ปัญหาที่ทำให้เข้าใจระบบมากที่สุดคือ Prisma `P2002` เพราะการค้นข้อมูลก่อน Create อย่างเดียวไม่ครอบคลุม Race Condition จึงต้องจัดการ Unique Conflict และ Replay ที่ Backend พร้อมทดสอบ Concurrent Request จริง

ฉันพบว่าผลลัพธ์ของ AI ต้องตรวจด้วยหลักฐานเสมอ บางคำแนะนำช่วงแรกใช้ชื่อไฟล์หรือโครง E2E ไม่ตรงกับ Labsheet และบางครั้งสรุปจาก UI ก่อน Test ครบ ฉันจึงตรวจ Exact Paths รัน Test/Build ตรวจ Browser หลาย Viewport และใช้ Peer Review ตรวจ Revision อีกชั้นหนึ่ง

ประสบการณ์นี้ทำให้ฉันเข้าใจความเชื่อมโยงระหว่าง Requirement, Acceptance Criteria, Test และ Evidence มากขึ้น รวมถึงเข้าใจการป้องกันข้อมูลด้วย Requester Ownership และความแตกต่างระหว่าง Development Requester Test Context ใน Lab 2 กับ Authentication ที่จะนำมาใช้ใน Lab 3

## 5. หลักฐานสำหรับ PDF — Answer Part 4

Answer Part 4 ใช้เอกสาร `ai-use.md` ฉบับนี้เพื่อแสดงเครื่องมือและโมเดลที่ใช้ Prompt สำคัญ งานที่ขอให้ AI ช่วย วิธีตรวจสอบผลลัพธ์ การตัดสินใจระหว่างพัฒนา และสิ่งที่ได้เรียนรู้ โดยใช้ Source Code, Automated Tests, Browser Flow และ GitHub Peer Review เป็นหลักฐานยืนยันผลลัพธ์