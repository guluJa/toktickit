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
- Review scope: ตรวจเอกสาร Lab 4 ทั้ง 6 ไฟล์และเสนอข้อสังเกต 8 ข้อ
- Approval: Pending
- Merge SHA: Pending
- Final-main verification: Pending

## 3. Reviewer Feedback Classification

| # | Classification | Decision and evidence-based reason |
|---|---|---|
| 1 | CLARIFY | Labsheet/Issue ต้องมี Status Matrix ที่ implement ได้ แต่ไม่อนุญาตให้เดา transition ใหม่ จึงคง `REOPENED → ไม่มี` ตาม Lab 3 และระบุ policy ให้ชัด |
| 2 | REQUIRED | Resolution Gate ต้องระบุผลเมื่อมีหลาย Actions และ follow-up ค้าง จึงกำหนดว่า RESOLVED ยังทำได้แต่ CLOSED ต้องรอให้ follow-up ถูกเคลียร์ และเพิ่ม Test coverage โดยไม่บังคับให้ทุก Action เป็น false ตั้งแต่ต้น |
| 3 | REQUIRED | Labsheet บังคับให้กำหนด concurrent Status/Action mutation, version และ conflict response; จึงกำหนด atomic no-partial-write behavior และ `ACTION_STATE_CONFLICT` โดยไม่บังคับวิธีฐานข้อมูลเฉพาะ |
| 4 | REQUIRED | Issue กำหนด Lab 3 compatibility จึงยืนยัน additive routes, response envelope เดิม และเพิ่ม API-09 regression traceability |
| 5 | REQUIRED (behavior) / OUT_OF_SCOPE (Idempotency-Key) | Labsheet กำหนดให้ duplicate action จาก repeated click/network retry ต้องถูกป้องกันหรือจัดการอย่างปลอดภัย จึงเพิ่ม saving guard และ reload/retry behavior; แต่ไม่เพิ่ม `Idempotency-Key`, model หรือ route เพราะ Labsheet ไม่กำหนดกลไกนั้น |
| 6 | REQUIRED | Dashboard ต้องมีสูตร, timezone, date range, limit, sort, empty state และ drill-down จึงเพิ่มกติกาเหล่านี้ใน specification/api-spec และ Test Plan |
| 7 | REQUIRED | Issue ต้องตรวจสอบย้อนกลับได้ จึงเพิ่ม FR/BR IDs และตาราง trace ไปยัง AC และ Test ID |
| 8 | REQUIRED | ขอบเขต Assignment, Action completion/deletion/history และ Admin permission ต้องไม่ขัด Lab 3 จึงระบุว่า assignment ใช้ baseline เดิม, Admin ได้สิทธิ์แบบ IT Staff เฉพาะ Actions Taken ตาม Lab 4, ไม่มี Action delete/completion state/edit-history model และ Admin เปลี่ยน Status ไม่ได้ |

| Scope | Issue/PR | Reviewer | Comment | Response | Approval | Merge SHA |
|---|---|---|---|---|---|---|
| Lab 4 Engineering Contract and Test Plan | [Issue #67](https://github.com/guluJa/toktickit/issues/67) / [PR #68](https://github.com/guluJa/toktickit/pull/68) | [PhraewaS](https://github.com/PhraewaS) | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5362373108): 8 points classified above | No separate author-response event recorded in this audit | Pending | Pending |

No separate review event was recorded for Actions Taken, Ticket workflow, Dashboards or Final regression/hardening; these remain part of the same PR #68 document review scope.

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
