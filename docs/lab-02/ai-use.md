# Lab 2 AI Use and Reflection

ไฟล์นี้เป็น Initial Structure สำหรับ Final AI Use Evidence ข้อมูล Prompt และ Reflection ขั้นสุดท้ายจะถูกคัดจากการใช้งานจริงทั้ง Lab 2 ใน Final Documentation Issue ไม่จำเป็นต้องแก้ไฟล์นี้ทุกครั้งที่ถาม AI

## 1. AI Tool

- AI Tool: Codex
- LLM/Model: GPT-5.6 Sol
- Reasoning Effort: Medium
- Uses: Requirement analysis, Engineering Contract, implementation guidance, debugging, test analysis และ review verification

## 2. Responsibility Statement

ฉันใช้ AI เป็น Engineering Assistant เพื่อช่วยตีความ Requirement ร่างและตรวจเอกสาร เสนอแนวทาง Implement และวิเคราะห์ Error แต่ฉันยังเป็นผู้รับผิดชอบต่อ Specification, Source Files, Commands, Dependencies, Database Migration, Environment Configuration, Tests, Git History และผลลัพธ์ทั้งหมด

ก่อนยอมรับคำแนะนำ ฉันตรวจเทียบกับ Labsheet และ Repository จริง ตรวจ Branch, `git diff`, Changed Files และ Test Output ด้วยตนเอง ฉันจะไม่ระบุ Test เป็น `Pass` ก่อนมีผลจริง ไม่ยอมรับคำว่า “done” เมื่อยังขาด Acceptance Criteria หรือ Evidence และไม่ใส่ Password, Secret หรือค่าจริงจาก `.env` ลงใน Prompt, Commit, PR หรือเอกสารส่งงาน

## 3. Prompt Collection Policy

- GitHub/Codex conversation history เป็น Source สำหรับคัด Prompt จริงภายหลัง
- ไม่จำเป็นต้องบันทึกทุกคำถามหรือทุกคำตอบลง Repository
- ใน Final Documentation Issue ให้เลือกเพียง 6-10 Prompts ที่แสดงงานสำคัญ เช่น Contract decision, Implementation, Migration, Failure debugging, Test verification และ Review response
- Prompt ไม่จำเป็นต้องใช้ภาษาซับซ้อน คะแนนควรมาจากความเกี่ยวข้องและการอธิบายว่า Verify คำตอบอย่างไร
- ห้ามสร้าง Prompt ย้อนหลังหรือปรับข้อความจนไม่ตรงกับสิ่งที่ใช้จริง

## 4. Final Selected Key Prompts

ส่วนนี้จะกรอกครั้งเดียวใน Final Documentation Issue หลังมีหลักฐานจากทั้ง Lab 2

| # | Issue/Prompt Purpose | Actual Prompt Text | AI Assistance | My Verification and Decision |
|---|---|---|---|---|
| Not selected yet | Final selection scheduled after Feature Issues | - | - | - |

## 5. AI-Assisted Contract Decisions Recorded So Far

| Decision | My Verification |
|---|---|
| Development Requester Header เป็น Testing Context ไม่ใช่ Authentication | ตรวจตรงกับ Labsheet และออกแบบให้ Lab 3 แทนด้วย Authenticated Identity ได้ |
| สร้าง Ticket ก่อน Upload Attachment | ตรวจว่ารองรับ Ticket success พร้อม Retry เฉพาะ Upload ที่ล้มเหลวโดยไม่สร้าง Ticket ซ้ำ |
| Lab 2 ไม่ทำ Inline Preview | ตรวจว่าไม่ใช่ Required capability และ Active file ยัง Download ได้ตาม Scope |
| Cross-owner resource ใช้ Safe 404 | ตรวจว่าไม่เปิดเผย Resource existence และมี API/E2E Test รองรับ |
| Planned Tests ยังเป็น `Planned/Not run` | ป้องกันการสร้างผลทดสอบล่วงหน้าและจะอัปเดตจากผลจริงเท่านั้น |

## 6. Final Reflection

Reflection ขั้นสุดท้ายจะเขียนใน Final Documentation Issue จากประสบการณ์จริงตลอด Lab 2 โดยสรุปว่า AI ช่วยอะไร ข้อเสนอใดต้องแก้หรือปฏิเสธ วิธี Verify และสิ่งที่ได้เรียนรู้ ไม่ใช้ข้อความทั่วไปที่ไม่ผูกกับ Evidence

## 7. Final Update Checklist

Checklist นี้ใช้หลัง Feature Issues เสร็จ ไม่ต้องติ๊กใน PR #13

- [ ] Model/Tool ตรงกับที่ใช้จริง
- [ ] มี Selected Prompts จริง 6-10 รายการ
- [ ] Prompts ครอบคลุม Specification, Implementation, Test/Debug และ Review
- [ ] ทุก Prompt อธิบายการ Verify และ Decision ของฉันได้
- [ ] ไม่มี Password, Secret หรือข้อมูลจริงจาก `.env`
- [ ] Reflection อ้างอิงประสบการณ์จริงของ Lab 2
- [ ] Rendered `ai-use.md` อ่านได้และตรงกับ Git/PR/Test evidence
