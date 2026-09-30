# Lab 4 AI Use and Reflection

สถานะ: บันทึกตั้งต้นก่อนเริ่ม Implementation

- AI tool: OpenAI Codex
- LLM/model: ไม่ได้บันทึกชื่อ variant ไว้ใน Repository; จะยืนยันจาก session metadata ก่อนจัดทำ Final PDF

## 1. ขอบเขตของบันทึกนี้

เอกสารชุดนี้อยู่ในขั้นตอน Read-only audit และจัดทำ Engineering Contract/Test Plan เท่านั้น ยังไม่มี Lab 4 feature, test result หรือ final evidence ที่จะนำมาบันทึกเป็นผลสำเร็จ; Review แบบ Request changes ของ PR #68 บันทึกแยกไว้ใน `reviewer.md`

การใช้ AI ในช่วงนี้ใช้เพื่อช่วยอ่านข้อกำหนด, ตรวจความสอดคล้องกับ Lab 1–3 และจัดโครงร่างเอกสารเท่านั้น ผู้จัดทำยังเป็นผู้ตรวจ Source Code, Labsheet, Git status และตัดสินใจเรื่อง scope, authorization, migration และ security เอง

AI ไม่ใช่ผู้อนุมัติความถูกต้องของ Contract หรือผลทดสอบ ความรับผิดชอบในการตรวจสอบและตัดสินใจยังอยู่ที่ผู้จัดทำ

## 2. Selected Key Prompts

Prompt excerpts ที่บันทึกใน revision นี้คัดจากคำสั่งที่ใช้จริงในการตรวจ PR #68 รอบนี้เท่านั้น:

> “ช่วยตรวจและปรับปรุงเอกสารใน PR #68 ... ห้ามเชื่อ Reviewer feedback โดยอัตโนมัติ ... ห้ามแก้ Source Code, Prisma, Migration, Seed, API implementation หรือ UI implementation ... หยุดก่อน Commit และ Push”

การใช้ Prompt นี้คือการ re-audit Labsheet/Issue/PR และตรวจ cross-file consistency ก่อนแก้เอกสาร โดยไม่สร้าง Prompt ย้อนหลังเพิ่มเติม Prompt อื่นและชื่อ model variant ที่ไม่มีหลักฐานใน Repository ยังไม่ถูกเติม

> “ตอนนี้ถึงแลป4แล้ว ... Reviewer ขอแก้ 6 จุด ... อยากให้ช่วยตรวจสอบอันไหนควรแก้ก็แก้ อันไหนไม่ควรก็ต้องมีเหตุผล ... ไม่ทำเกินขอบเขตงานคือหมายถึงอย่าทำของงานอิชชูถัดไป”

Prompt excerpt นี้ใช้กำหนดการตัดสิน Required/Clarification/Out of Scope และบังคับให้แก้เฉพาะเอกสารใน Issue #67; ไม่ใช่หลักฐานว่า implementation หรือ test ใดผ่านแล้ว

## 3. Reflection สถานะเริ่มต้น

ผลจากช่วงนี้คือปรับ Contract/Test Plan ตามหลักฐาน Labsheet, Lab 3 baseline, Issue #67 และ Review PR #68 โดยยังไม่มี Lab 4 implementation, test result หรือ Final evidence สถานะจึงยังเป็น `Planned`/`Pending` ทั้งหมด ฉันตรวจเองว่า feedback บางข้อเป็นการเพิ่มความชัดเจน, บางข้อเป็น requirement จาก Labsheet และ Idempotency-Key เป็นกลไกที่อยู่นอก Scope

AI ไม่ใช่ผู้อนุมัติความถูกต้องของ Contract หรือผลทดสอบ ความรับผิดชอบในการตรวจสอบและตัดสินใจยังอยู่ที่ผู้จัดทำ
