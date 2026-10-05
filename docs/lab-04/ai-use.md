# Lab 4 AI Use and Reflection

สถานะ: บันทึกระหว่างจัดทำ Contract และพัฒนา Lab 4; ยังไม่ใช่ Selected Key Prompts/Reflection ฉบับ Final

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

## บันทึกการใช้ AI ใน Issue #73 — 4–5 ตุลาคม 2026

ใช้ Codex อ่าน Issue/Labsheet/Contract และ implementation ก่อนเพิ่ม regression, E2E และ visual evidence บน `feature/06-lab4-final-hardening` ข้อความตัดตอนจาก Prompt ที่ใช้จริงในรอบนี้:

> เริ่มจาก Read-only audit: ตรวจ branch, working tree และยืนยันว่าฐานมี PR #78

> Dashboard: เทียบ selected metrics จาก query ฐานข้อมูลจริงกับ API และ UI รวม date boundaries, ordering, limits และ drill-down

> ใช้ dedicated E2E database และ safety guard กับทุก migration/seed/reset/cleanup ห้ามแตะ development/production data

> ไม่ทำ Release เข้า main, Final-main verification หรือ PDF ส่ง Answer Part 1–9 ของ Issue #74 และห้าม Commit, Push, เปิด PR, Merge หรือเปลี่ยนสถานะ GitHub แทนฉัน

เพิ่ม tests และตรวจผลคำสั่งจริง พร้อมปรับ visible label ของ Owner ID และ safety guard ที่ต้องแยกฐานจากชื่อฐาน/host ไม่ใช่ credentials ผลรันและข้อจำกัด recovery อยู่ใน `tests.md` ข้อ 16 ไม่สร้าง Review หรือข้อสรุปผล Final ล่วงหน้า Selected Key Prompts 6–10 ข้อและ My Reflection ของผู้จัดทำสำหรับส่งงานยัง Pending ไม่เขียนแทนประสบการณ์ของผู้จัดทำ
