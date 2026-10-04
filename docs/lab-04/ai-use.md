# Lab 4 AI Use and Reflection

สถานะ: บันทึกระหว่างจัดทำ Engineering Contract; ยังไม่ใช่หลักฐาน Final

- AI tool: OpenAI Codex
- LLM/model: ยังไม่ได้ยืนยันชื่อ model variant จากประวัติ session จึงไม่ระบุย้อนหลัง

## การใช้ AI ใน Issue #67

ใช้ Codex ช่วยอ่าน Labsheet, เปรียบเทียบ Contract กับ API และพฤติกรรมเดิมของ Lab 3, ตรวจข้อเสนอใน PR #68 และจัดแผนทดสอบก่อนเริ่มเขียนฟีเจอร์ การตัดสินใจที่สำคัญคือคงชื่อ query ของ API เดิม, แยก Dashboard `limit` จาก Queue `pageSize` และไม่ถือว่า Action ที่ข้อความเหมือนกันเป็นหลักฐานว่าคำขอที่ timeout บันทึกสำเร็จ ทั้งหมดนี้เป็นข้อกำหนดและแผนทดสอบ ไม่ใช่ผลการ implement หรือผลทดสอบที่ผ่านแล้ว

## Selected Key Prompts และ My Reflection

ยังไม่คัด Prompt สำหรับส่ง Final ใน PR เอกสารนี้ เมื่อถึงรอบสรุป Lab 4 จะเลือก 6–10 คำสั่งสำคัญจากประวัติการใช้งานจริง พร้อมอธิบายว่าใช้กับงานใด ได้ผลอะไร และผู้จัดทำตรวจหรือปฏิเสธข้อเสนอใด โดยไม่แต่งข้อความ Prompt หรือผลลัพธ์ย้อนหลัง

AI ไม่ใช่ผู้อนุมัติความถูกต้องของ Contract, security policy หรือผลทดสอบ ผู้จัดทำเป็นผู้รับผิดชอบการตัดสินใจและการตรวจหลักฐานก่อนส่งงาน

## บันทึกการใช้ AI ใน Issue #72 — 4 ตุลาคม 2026

ใช้ Codex ตรวจ Issue/Labsheet/Contract และพัฒนา Dashboard API/UI พร้อม tests บน `feature/05-lab4-role-dashboards` คำสั่งที่ใช้จริงในรอบนี้ (ข้อความตัดตอน ไม่ใช่ Prompt ใหม่):

> Implement Dashboard API และ UI ตาม Scope ของ Issue #72 ให้ครบ

> ใช้ข้อมูลจริงจาก Backend ไม่คำนวณยอดรวมจากรายการที่ถูก pagination แล้ว

> ห้าม Commit, Push, เปิด PR, Merge หรือเปลี่ยนสถานะ GitHub แทนฉัน

ผลการทำงานและข้อจำกัดบันทึกใน `tests.md` ข้อ 13–14 โดยแยก CI ของ PR #77 จากผล Local รอบนี้ ไม่สร้าง Prompt ย้อนหลังหรืออ้างว่า Full Server/Final-main ผ่าน การคัด Selected Key Prompts และ reflection ของผู้จัดทำสำหรับ Final ยังไม่ดำเนินการ
