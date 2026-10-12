# การใช้ AI และ Reflection ของ TokTickIT Lab 4

## 1. เครื่องมือที่ใช้

- เครื่องมือ: OpenAI Codex
- LLM ที่ใช้ตลอดงาน Lab 4: GPT-6.1 Sol
- Reasoning effort: Medium

ใช้ AI ช่วยจัดทำ Engineering Contract เขียนและปรับปรุงโค้ด วิเคราะห์ข้อเสนอจาก peer review และตรวจผลทดสอบ โดยตรวจความสอดคล้องกับ Labsheet และขอบเขตของแต่ละ Issue ก่อนนำผลลัพธ์ไปใช้

## 2. Selected Key Prompts

เลือกคำสั่งสำคัญ 8 รายการจากการทำงานจริง เนื่องจากคำสั่งต้นฉบับมีรายละเอียดค่อนข้างยาว ตารางนี้จึงสรุปใจความและขอบเขตของคำสั่ง ไม่ใช่ข้อความต้นฉบับทั้งหมด

| ลำดับ | งาน | สรุปคำสั่งที่ใช้จริง | การนำผลลัพธ์ไปใช้ |
|---|---|---|---|
| 1 | Engineering Contract — #67 | อ่าน Labsheet และ baseline แล้วจัดทำ specification, API, UI และ Test Plan ให้สอดคล้องกัน โดยยังไม่เขียนฟีเจอร์ | กำหนด Model, fields, roles, routes, Status Matrix และ FR/BR–AC–Test traceability ก่อน implementation |
| 2 | ปรับ Contract — PR #68 | แยก feedback เป็น Required, Clarification หรือ Out of Scope โดยเทียบข้อกำหนด ไม่เพิ่มฟีเจอร์จากข้อเสนอโดยอัตโนมัติ | ปรับ Resolution Gate, Dashboard, conflict และ timeout flow; ไม่เพิ่ม Action deletion, edit-history model หรือ Idempotency-Key |
| 3 | Actions Taken foundation — #69 | เพิ่ม ActionTaken และ Ticket.version ด้วย additive migration พร้อม seed, API และ tests; ตรวจ preservation/recovery บนฐานทดสอบแยก | สร้าง foundation และเพิ่มการตรวจข้อมูลก่อน–หลัง migration, seed ซ้ำ, recovery และ concurrent PATCH |
| 4 | Actions Taken UI — #70 | เมื่อ POST ไม่ทราบผล ให้คงฟอร์ม ตรวจรายการครบทุกหน้า แต่ไม่แจ้งสำเร็จจากข้อความที่เหมือนกันและไม่ส่งซ้ำอัตโนมัติ | เพิ่ม submission-uncertain, saving guard และคำเตือนก่อนผู้ใช้ส่งใหม่ พร้อม tests สำหรับ timeout และ conflict |
| 5 | Ticket workflow — #71 | ตรวจ version และ Resolution Gate พร้อมเปลี่ยนสถานะแบบ atomic; stale/gate failure ต้องไม่เปลี่ยน status หรือ version | ใช้ Ticket.version แยกจาก ActionTaken.version และตรวจ Action/Status ที่ทำงานพร้อมกันทั้งสองลำดับ |
| 6 | Role dashboards — #72 | ให้สูตรนับ ช่วงเวลา sorting, limits และ drill-down ตรงกันทุกชั้น โดยใช้ข้อมูลทั้งฐานจาก Backend | พัฒนา Dashboard ตาม role และตรวจค่าจากฐานข้อมูลเทียบกับ API/UI รวม ownership และขอบเขตวันเวลา |
| 7 | Final hardening — #73 | รัน regression, E2E, responsive/accessibility, performance-smoke, migration และ recovery พร้อมเก็บผลจริงที่ไม่มีข้อมูลลับ | ตรวจฟีเจอร์ Lab 4 และการทำงานเดิมจาก Labs 1–3 พร้อมภาพและ browser evidence |
| 8 | Final-main verification — #74 | ตรวจ main หลัง Release โดยแยก tested Product SHA จากเอกสารหลักฐาน และแยกผลเมื่อใช้ helper ที่ปรับใหม่ | บันทึกผลของ main 08328cd แยกจาก feature/staging และแยกภาพเสริมออกจากจำนวน E2E ของ main |

## 3. My Reflection

AI ช่วยทั้งจัดทำ Contract และเขียนโค้ด ทำให้งานเสร็จเร็วขึ้น แต่ผลลัพธ์ไม่ได้ตรงตามที่ต้องการเสมอ ตอนทำ Contract ฉันจึงกำหนดให้เทียบ Labsheet กับงานเดิมก่อน ส่วนการเขียนโค้ดแบ่งตาม Issue และให้ตรวจผลทดสอบจริงก่อนสรุปงาน ตัวอย่างที่ฉันไม่เลือกใช้คือเอกสารรอบท้ายที่มีแผนจัดรายงานและข้อมูลซ้ำเกินความจำเป็น ฉันขอให้ตัดออกและปรับเป็นเอกสารที่อาจารย์เปิดอ่านแล้วเข้าใจงานได้ ประสบการณ์นี้ทำให้เห็นว่าต้องระบุทั้งสิ่งที่ต้องการและขอบเขตให้ชัด บางครั้งฉันจึงใช้ AI ช่วยเรียบเรียงคำสั่งก่อนนำไปสั่งทำงานต่อ แต่ยังต้องตรวจว่าเนื้อหาและผลลัพธ์ตรงกับงานที่ต้องการจริงหรือไม่
