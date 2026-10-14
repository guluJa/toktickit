# การใช้ AI และ Reflection ของ TokTickIT Lab 4

## 1. เครื่องมือที่ใช้

- เครื่องมือ: OpenAI Codex
- LLM ที่ใช้ตลอดงาน Lab 4: GPT-6.1 Sol
- Reasoning effort: Medium

ใช้ AI ช่วยจัดทำ Engineering Contract เขียนและปรับปรุงโค้ด วิเคราะห์ข้อเสนอจาก peer review และตรวจผลทดสอบ โดยตรวจความสอดคล้องกับ Labsheet และขอบเขตของแต่ละ Issue ก่อนนำผลลัพธ์ไปใช้

## 2. Selected Key Prompts

เลือก Prompt สำคัญ 8 รายการจากการทำงานจริง โดยตัดตอนเฉพาะส่วนที่แสดงเป้าหมาย ขอบเขตและข้อจำกัด และคงถ้อยคำต้นฉบับ เครื่องหมาย […] หมายถึงส่วนที่ละไว้เพื่อให้เอกสารกระชับ ส่วนคอลัมน์การนำผลลัพธ์ไปใช้เป็นคำอธิบายประกอบ

| ลำดับ | งาน | ข้อความตัดตอนจาก Prompt จริง | การนำผลลัพธ์ไปใช้ |
|---|---|---|---|
| 1 | Engineering Contract — #67 | จากนั้นช่วยจัดทำเฉพาะ Engineering Contract และ Test Plan ของ Lab 4 โดยยังห้าม implement Model, Migration, Seed, API, UI หรือ Feature Code […] ตรวจความสอดคล้องข้ามทุกไฟล์ เช่น ชื่อ Model, route, role, status, field และ test path | กำหนด Model, fields, roles, routes, Status Matrix และ FR/BR–AC–Test traceability ก่อน implementation |
| 2 | ปรับ Contract — PR #68 | ก่อนแก้ ให้จัดประเภท Reviewer feedback ทั้ง 8 ข้อเป็น REQUIRED, CLARIFY หรือ OUT_OF_SCOPE พร้อมเหตุผลจาก Labsheet/Issue/Contract ห้ามยอมรับข้อเสนอโดยอัตโนมัติ และห้ามเพิ่มฟีเจอร์ที่โจทย์ไม่ได้กำหนด | ปรับ Resolution Gate, Dashboard, conflict และ timeout flow; ไม่เพิ่ม Action deletion, edit-history model หรือ Idempotency-Key |
| 3 | Actions Taken foundation — #69 | เพิ่ม ActionTaken และ Ticket.version ด้วย additive migration ที่รักษาข้อมูลเดิม […] ตรวจ migration, seed ซ้ำ และ recovery เฉพาะบนฐานข้อมูลทดสอบที่แยกจาก Development ห้าม reset หรือลบข้อมูลในฐาน Development | สร้าง foundation และเพิ่มการตรวจข้อมูลก่อน–หลัง migration, seed ซ้ำ, recovery และ concurrent PATCH |
| 4 | Actions Taken UI — #70 | กรณี POST timeout หรือไม่ทราบผล ให้คงข้อมูลในฟอร์มและแสดงสถานะ submission-uncertain ตรวจรายการใหม่ให้ครบทุกหน้า pagination ได้ แต่ห้ามสรุปว่าสำเร็จเพียงเพราะพบข้อความเหมือนกัน ห้ามแจ้ง success หรือ retry POST อัตโนมัติ […] | เพิ่ม submission-uncertain, saving guard และคำเตือนก่อนผู้ใช้ส่งใหม่ พร้อม tests สำหรับ timeout และ conflict |
| 5 | Ticket workflow — #71 | ทำ version/gate checking และ status update แบบ atomic สำเร็จแล้วเพิ่ม Ticket.version หนึ่งครั้ง; stale version ตอบ 409 STALE_UPDATE และ gate ไม่ผ่านตอบ 409 RESOLUTION_GATE_FAILED โดยไม่เปลี่ยน status/version […] อย่าแยก transaction ที่ยังเกิดช่องว่างระหว่างตรวจและเขียน | ใช้ Ticket.version แยกจาก ActionTaken.version และตรวจ Action/Status ที่ทำงานพร้อมกันทั้งสองลำดับ |
| 6 | Role dashboards — #72 | Metrics, breakdowns, recent lists, สูตรคำนวณ, timezone, date boundaries, limit, sorting และ drill-down ตรงกันทุกชั้น […] ใช้ข้อมูลจริงจาก Backend ไม่คำนวณยอดรวมจากรายการที่ถูก pagination แล้ว | พัฒนา Dashboard ตาม role และตรวจค่าจากฐานข้อมูลเทียบกับ API/UI รวม ownership และขอบเขตวันเวลา |
| 7 | Final hardening — #73 | หลังแก้ ให้รัน Prisma/migration/seed checks ที่เกี่ยวข้อง, focused และ full Server/Client tests, builds, E2E, responsive/accessibility, performance-smoke และ git diff --check เก็บ stdout/stderr และผลคำสั่งจริงจากรอบล่าสุด ตรวจลบ secrets ก่อนเก็บ evidence | ตรวจฟีเจอร์ Lab 4 และการทำงานเดิมจาก Labs 1–3 พร้อมภาพและ browser evidence |
| 8 | Final-main verification — #74 | ผลทดสอบต้องระบุ tested product SHA แยกจาก evidence branch/commit อย่างชัดเจน […] หาก runner เปลี่ยน ให้แยก original-main run ออกจาก corrected-runner run ห้ามอ้างว่าทั้งหมดรันด้วย runner เดิมจาก 08328cd | บันทึกผลของ main 08328cd แยกจาก feature/staging และแยกภาพเสริมออกจากจำนวน E2E ของ main |

## 3. My Reflection

AI ช่วยจัดทำ Contract และเขียนโค้ด ทำให้งานเสร็จเร็วขึ้น แต่ผลลัพธ์ไม่ได้ตรงตามที่ต้องการเสมอ ฉันใช้ Labsheet และงานเดิมเป็นหลักในการกำหนดข้อกำหนด และแบ่งงานพัฒนาตาม Issue เพื่อควบคุมขอบเขตและตรวจความสอดคล้องของงานแต่ละส่วน ระหว่างทำงานพบว่าคำสั่งบางครั้งยังไม่ครอบคลุมสิ่งที่ต้องการ ฉันจึงปรับรายละเอียดและใช้ AI ช่วยเรียบเรียงคำสั่งให้ชัดขึ้น ก่อนตรวจข้อความและนำไปใช้ สิ่งที่ได้เรียนรู้คือการใช้ AI ไม่ได้จบที่การเขียนคำสั่งครั้งเดียว แต่ต้องทบทวนทั้งคำสั่งและผลลัพธ์โดยเทียบกับข้อกำหนด ไม่ยอมรับผลเพียงเพราะดูสมบูรณ์หรือทำงานได้
