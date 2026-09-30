# TokTickIT Lab 4 Reviewer Record

สถานะ: PR #68 มี Review แบบ Request changes; ยังไม่มี Approval, Merge หรือ Final-main verification

## 1. Audit Baseline

- Repository: https://github.com/guluJa/toktickit
- Baseline branch inspected: main
- Baseline commit inspected: da82338
- Lab 3 executable verification reference: 8755d21
- Lab 4 Issue: [#67](https://github.com/guluJa/toktickit/issues/67)
- Lab 4 PR: [#68](https://github.com/guluJa/toktickit/pull/68)
- Lab 4 branch: `feature/01-lab4-engineering-contract`

## 2. PR #68 Review Evidence

- Reviewer: [PhraewaS](https://github.com/PhraewaS)
- Review status: Request changes
- Review link: [PR #68 review](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5362373108)
- Latest revision inspected: [ce86e6b](https://github.com/guluJa/toktickit/commit/ce86e6be5984a8e8847c792c36a73d473bd61462)
- Review scope: ตรวจเอกสาร Lab 4 ทั้ง 6 ไฟล์และเสนอข้อสังเกต 8 ข้อ
- Approval: Pending
- Merge SHA: Pending
- Final-main verification: Pending

## 3. Reviewer Feedback Classification

| # | Classification | Decision and evidence-based reason |
|---|---|---|
| 1 | REQUIRED | Lab 4 ขอ lifecycle ที่เดินต่อได้และให้ผู้จัดทำกำหนด Matrix; จึงเพิ่มเฉพาะ `REOPENED → IN_PROGRESS` พร้อม actor/version/route เดิม ไม่เพิ่ม transition อื่น และบันทึกว่าเป็นการตัดสินใจใน Issue #67 |
| 2 | REQUIRED | Resolution Gate ต้องระบุผลเมื่อมีหลาย Actions และ follow-up ค้าง จึงกำหนดว่า RESOLVED ยังทำได้แต่ CLOSED ต้องรอให้ follow-up ถูกเคลียร์ และเพิ่ม Test coverage โดยไม่บังคับให้ทุก Action เป็น false ตั้งแต่ต้น |
| 3 | REQUIRED | Labsheet บังคับให้กำหนด concurrent Status/Action mutation, version และ conflict response; จึงกำหนด atomic no-partial-write behavior และ `ACTION_STATE_CONFLICT` โดยไม่บังคับวิธีฐานข้อมูลเฉพาะ |
| 4 | REQUIRED | Issue กำหนด Lab 3 compatibility จึงยืนยัน additive routes, response envelope เดิม และเพิ่ม API-09 regression traceability |
| 5 | REQUIRED (behavior) / OUT_OF_SCOPE (Idempotency-Key) | Labsheet กำหนดให้ duplicate action จาก repeated click/network retry ต้องถูกป้องกันหรือจัดการอย่างปลอดภัย จึงเพิ่ม saving guard, submission-uncertain state, GET reconciliation และห้าม retry POST อัตโนมัติ; แต่ไม่เพิ่ม `Idempotency-Key`, model หรือ route เพราะ Labsheet ไม่กำหนดกลไกนั้น |
| 6 | REQUIRED | Dashboard ต้องมีสูตร, timezone, date range, limit, sort, empty state และ drill-down จึงเพิ่มกติกาเหล่านี้ใน specification/api-spec และ Test Plan |
| 7 | REQUIRED | Issue ต้องตรวจสอบย้อนกลับได้ จึงเพิ่ม FR/BR IDs และตาราง trace ไปยัง AC และ Test ID |
| 8 | REQUIRED | ขอบเขต Assignment, Action completion/deletion/history และ Admin permission ต้องไม่ขัด Lab 3 จึงระบุว่า assignment ใช้ baseline เดิมและปฏิเสธ inactive assignee, complete/cancel คือ Ticket status, Comments/Internal Notes append-only, ไม่มี Action delete/completion state/edit-history model และ Admin เปลี่ยน Status ไม่ได้ |

| Scope | Issue/PR | Reviewer | Comment | Response | Approval | Merge SHA |
|---|---|---|---|---|---|---|
| Lab 4 Engineering Contract and Test Plan | [Issue #67](https://github.com/guluJa/toktickit/issues/67) / [PR #68](https://github.com/guluJa/toktickit/pull/68) | [PhraewaS](https://github.com/PhraewaS) | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5362373108): 8 points classified above | No separate author-response event recorded in this audit | Pending | Pending |

No separate review event was recorded for Actions Taken, Ticket workflow, Dashboards or Final regression/hardening; these remain part of the same PR #68 document review scope.

## 3.1 Follow-up points from the revision review

รายการต่อไปนี้เป็นการจำแนก follow-up ที่ผู้จัดทำได้รับใน review รอบ revision `f2eddeb` ของ PR #68 และยังอ้างอิง review thread เดิมด้านบน; ระหว่าง audit นี้ไม่พบลิงก์ review event แยกอีกอัน จึงไม่เติมลิงก์หรือ Approval ใหม่:

| # | Classification | Decision |
|---|---|---|
| 1 | REQUIRED | เพิ่ม submission-uncertain/reconciliation flow และ test case; ไม่เพิ่ม Idempotency-Key เพราะไม่อยู่ใน Labsheet |
| 2 | REQUIRED | ทำ Staff Dashboard/API ให้ใช้ 7-day window, recently resolved และ current user’s recent Actions พร้อม shape/sort/link เดียวกัน |
| 3 | REQUIRED | ระบุ `REOPENED → IN_PROGRESS` ใน Matrix ของ Issue #67 เพื่อไม่ให้ lifecycle ค้าง; ไม่สร้าง route ใหม่ |
| 4 | REQUIRED | trace assignment/complete/cancel, inactive-assignee rejection และ append-only ไปยัง API/E2E ที่ Labsheet กำหนด; ยังไม่มี TA confirmation ให้บันทึก |
| 5 | CLARIFY | ระบุแหล่งอ่าน `Ticket.version`, สิทธิ์แก้ Action ของผู้อื่น, Requester-visible fields และชื่อ authentication errors ตาม Lab 3 |
| 6 | CLARIFY | เพิ่มชนิดข้อมูล/FK/index rationale และ recovery procedure ใน Contract/Test Plan; ไม่แก้ Prisma หรือสร้าง migration ใน Issue นี้ |

## 3.2 Follow-up review on revision `ce86e6b`

ลิงก์ Revision ล่าสุดถูกบันทึกไว้ด้านบนตามหลักฐานที่ตรวจสอบได้; ยังไม่มีลิงก์ Review event แยกจาก thread เดิม จึงไม่เติม Approval หรือ Merge:

| # | Classification | Decision and evidence-based reason |
|---|---|---|
| 1 | REQUIRED | แก้ inactive assignee เป็น `404 USER_NOT_FOUND` ให้ตรงกับ Lab 3 baseline และเพิ่มใน Test Plan |
| 2 | REQUIRED | เพิ่มแผนปรับ regression assertions สำหรับ `Ticket.version`, Resolution Gate และ `REOPENED → IN_PROGRESS` โดยไม่แก้ test code ใน PR นี้ |
| 3 | REQUIRED | เปลี่ยน FK ในเอกสารเป็น Prisma `RequesterUser.id`; คำว่า User ใช้ได้เฉพาะในฐานะคำเชิงแนวคิด |
| 4 | REQUIRED | ระบุผลลัพธ์เมื่อ reconcile พบรายการเดิม/ไม่พบ/GET ล้มเหลว และเพิ่ม test case สำหรับ POST เดิมที่สำเร็จภายหลัง |
| 5 | REQUIRED | เพิ่ม Dashboard link object, Queue query ที่ใช้ parameter ของ Lab 3 และค่า 0 ครบทุก key เมื่อ `byStatus`/`byPriority` ไม่มีข้อมูล |

## 4. Current Verification State

- Contract ก่อน Implementation: จัดทำแล้ว แต่ยังเป็น Draft
- API/UI/Test cross-file consistency: ตรวจระดับเอกสารแล้ว
- Migration, seed, authorization และ workflow implementation: ยังไม่มี
- Lab 1–3 regression: ยังไม่ได้รันในขอบเขต Lab 4
- Responsive/accessibility evidence: ยังไม่มี Lab 4 evidence
- Final-main verification: Pending

## 5. Current Result

Lab 4 review status: Changes requested
Approval, merge และ Final Result ยังเป็น Pending
