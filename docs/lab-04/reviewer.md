# บันทึก Peer Review ของ TokTickIT Lab 4

Reviewer: [PhraewaS](https://github.com/PhraewaS)

Repository: [guluJa/toktickit](https://github.com/guluJa/toktickit)

งานแบ่งเป็น Engineering Contract, foundation, Actions UI, workflow, dashboards, hardening และ release โดยใช้ feature branches ผ่าน `lab4-staging` ก่อน Release เข้า `main` ตารางต่อไปนี้สรุปความคิดเห็น คำตอบ การแก้ไข Approval และ Merge ที่เกิดขึ้นจริง

## 1. Engineering Contract — PR #68 / Issue #67

| Revision ที่ตรวจ | ผลรีวิว | คำตอบของผู้จัดทำ | สิ่งที่ปรับในเอกสาร |
|---|---|---|---|
| `72196e8` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5362373108) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5910415518) | เพิ่มกติกา Status, Resolution Gate, API และ Test traceability ใน `f2eddeb` |
| `f2eddeb` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5366175623) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5912423073) | ขยาย timeout flow, Dashboard และ `REOPENED → IN_PROGRESS` ใน `ce86e6b` |
| `ce86e6b` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5368232063) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5914509935) | แก้ error ของ inactive assignee, ชื่อ Model และแผน regression ใน `c245d1d` |
| `c245d1d` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5369375285) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5930285893) | ปรับ query ของ Requester, แยก `limit`/`pageSize` และคงสถานะไม่แน่ชัดหลัง POST timeout ใน `f8598e5` |
| `f8598e5` | [Commented](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5379981476) / [Approved](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5380410934) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5933118215) | Contract ผ่าน review; merge SHA `f4b28b8` |


## 2. ผล Review และ Merge ของ Implementation / Release

| PR / Issue | Revision ที่ได้รับ Approval | Approval event | Merge SHA |
|---|---|---|---|
| [#75](https://github.com/guluJa/toktickit/pull/75) / #69 — Foundation | `3525ef2` | [Approved](https://github.com/guluJa/toktickit/pull/75#pullrequestreview-5394133690) | `af255b1` |
| [#76](https://github.com/guluJa/toktickit/pull/76) / #70 — Actions UI | `0e82dd5` | [Approved](https://github.com/guluJa/toktickit/pull/76#pullrequestreview-5401587665) | `284c7cb` |
| [#77](https://github.com/guluJa/toktickit/pull/77) / #71 — Workflow | `de4dcb6` | [Approved](https://github.com/guluJa/toktickit/pull/77#pullrequestreview-5406201875) | `bb6049b` |
| [#78](https://github.com/guluJa/toktickit/pull/78) / #72 — Dashboards | `bf04947` | [Approved](https://github.com/guluJa/toktickit/pull/78#pullrequestreview-5407069907) | `51bcf9c` |
| [#79](https://github.com/guluJa/toktickit/pull/79) / #73 — Hardening | `af6fe86` | [Approved](https://github.com/guluJa/toktickit/pull/79#pullrequestreview-5412952624) | `3b7291e` |
| [#80](https://github.com/guluJa/toktickit/pull/80) / #74 — Pre-release | `f35b334` | [Approved](https://github.com/guluJa/toktickit/pull/80#pullrequestreview-5478514522) | `48694b8` |
| [#81](https://github.com/guluJa/toktickit/pull/81) / #74 — Release เข้า main | `48694b8` | [Approved](https://github.com/guluJa/toktickit/pull/81#pullrequestreview-5489672078) | `08328cd` |


Release PR #81 merge เข้า main วันที่ 12 ตุลาคม 2026 เวลา 17:48 น. (Asia/Bangkok) เป็น `08328cd293c11316da8496857007d781f2dafaa8` ผลทดสอบหลัง Release อยู่ใน `tests.md` ข้อ 5

## 3. ข้อเสนอแนะและคำตอบ

| PR / reviewed revision | Feedback จริง | คำตอบและหลักฐานการแก้ |
|---|---|---|
| #75 / `c876799` | [Request changes](https://github.com/guluJa/toktickit/pull/75#pullrequestreview-5393565146): migration snapshot, recovery, INTEGER range และ concurrent PATCH | [คำตอบ](https://github.com/guluJa/toktickit/pull/75#issuecomment-5956171344) ระบุสิ่งที่แก้; revision `3525ef2` มี migration/regression/concurrency tests และ recovery evidence |
| #76 / `30dad19` | [Request changes](https://github.com/guluJa/toktickit/pull/76#pullrequestreview-5400942324): ผล GET เก่าทับ Action ใหม่และ Owner ไม่ตรงปัจจุบัน | [คำตอบ](https://github.com/guluJa/toktickit/pull/76#issuecomment-5970512352) และ tests/implementation ใน `fbf4279`; regression cases อยู่ใน ActionsTaken.test.tsx |
| #76 / `fbf4279` | [Request changes](https://github.com/guluJa/toktickit/pull/76#pullrequestreview-5401465171): การรวม Action ต้องเลือก version สูงสุด | [คำตอบ](https://github.com/guluJa/toktickit/pull/76#issuecomment-5970765634) และ revision `0e82dd5` มี regression test |
| #77 / `de4dcb6` | [Comment](https://github.com/guluJa/toktickit/pull/77#pullrequestreview-5402711874): Workflow/gate/concurrency ผ่านใน scope | [คำตอบ](https://github.com/guluJa/toktickit/pull/77#issuecomment-5978587625) ตอบรับผลตรวจ |
| #78 / `bf04947` | [Comment](https://github.com/guluJa/toktickit/pull/78#pullrequestreview-5406634131): Dashboard/API/UI/CI ผ่าน | [คำตอบ](https://github.com/guluJa/toktickit/pull/78#issuecomment-5981894696) ตอบรับผลตรวจ |
| #79 / `af6fe86` | [Comment](https://github.com/guluJa/toktickit/pull/79#pullrequestreview-5410260883): hardening/evidence ผ่าน | [คำตอบ](https://github.com/guluJa/toktickit/pull/79#issuecomment-5990353143) ตอบรับผลตรวจ |
| #80 / `f35b334` | [Comment](https://github.com/guluJa/toktickit/pull/80#pullrequestreview-5438605086): pre-release/evidence แยก revision ถูกต้อง | [คำตอบ](https://github.com/guluJa/toktickit/pull/80#issuecomment-6079183079) ตอบรับผลตรวจ |
| #81 / `48694b8` | [Comment](https://github.com/guluJa/toktickit/pull/81#pullrequestreview-5484028720): staged integration และ CI บน merge จำลองผ่าน | [คำตอบ](https://github.com/guluJa/toktickit/pull/81#issuecomment-6122235362) ตอบรับผลตรวจ; Approval/merge แยกไว้ในตารางด้านบน |
