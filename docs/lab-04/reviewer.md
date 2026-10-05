# TokTickIT Lab 4 Reviewer Record

สถานะ: PR #68, #75, #76, #77, #78 และ #79 ได้รับ Approval และ merge เข้า `lab4-staging` แล้วตาม GitHub events ที่ตรวจวันที่ 5 ตุลาคม 2026 ฐาน Release candidate คือ `3b7291e`; Release PR เข้า `main` และ Final-main verification ยัง Pending

## ขอบเขตการรีวิว

- งาน: [Issue #67 — Engineering Contract and Test Plan](https://github.com/guluJa/toktickit/issues/67)
- Branch: `feature/01-lab4-engineering-contract` → `lab4-staging`
- Reviewer: [PhraewaS](https://github.com/PhraewaS)
- PR นี้แก้เฉพาะเอกสาร Lab 4; Model, Migration, API/UI และ tests เป็นงานของ Issue ถัดไป

## หลักฐานรีวิวของ PR #68

| Revision ที่ตรวจ | ผลรีวิว | คำตอบของผู้จัดทำ | สิ่งที่ปรับในเอกสาร |
|---|---|---|---|
| `72196e8` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5362373108) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5910415518) | เพิ่มกติกา Status, Resolution Gate, API และ Test traceability ใน `f2eddeb` |
| `f2eddeb` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5366175623) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5912423073) | ขยาย timeout flow, Dashboard และ `REOPENED → IN_PROGRESS` ใน `ce86e6b` |
| `ce86e6b` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5368232063) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5914509935) | แก้ error ของ inactive assignee, ชื่อ Model และแผน regression ใน `c245d1d` |
| `c245d1d` | [Request changes](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5369375285) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5930285893) | ปรับ query ของ Requester, แยก `limit`/`pageSize` และคงสถานะไม่แน่ชัดหลัง POST timeout ใน `f8598e5` |
| `f8598e5` | [Commented](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5379981476) / [Approved](https://github.com/guluJa/toktickit/pull/68#pullrequestreview-5380410934) | [ตอบใน PR](https://github.com/guluJa/toktickit/pull/68#issuecomment-5933118215) | Contract ผ่าน review; merge SHA `f4b28b8` |

รายละเอียดข้อเสนอและคำตอบอยู่ในลิงก์รีวิว; ผลการแก้ Contract และ Test Plan ให้ตรวจจาก revision ของ PR โดยตรง

## Review events ของ implementation ที่เกิดขึ้นจริง

Reviewer ของ events ด้านล่างคือ [PhraewaS](https://github.com/PhraewaS) ลิงก์ PR มีรายละเอียดความคิดเห็นและคำตอบของผู้จัดทำ ตารางนี้ไม่ใช่การรีวิวใหม่หรือการรับรอง Final-main

| PR / Issue | Revision ที่ได้รับ Approval | Approval event | Merge SHA |
|---|---|---|---|
| [#75](https://github.com/guluJa/toktickit/pull/75) / #69 — Foundation | `3525ef2` | [Approved](https://github.com/guluJa/toktickit/pull/75#pullrequestreview-5394133690) | `af255b1` |
| [#76](https://github.com/guluJa/toktickit/pull/76) / #70 — Actions UI | `0e82dd5` | [Approved](https://github.com/guluJa/toktickit/pull/76#pullrequestreview-5401587665) | `284c7cb` |
| [#77](https://github.com/guluJa/toktickit/pull/77) / #71 — Workflow | `de4dcb6` | [Approved](https://github.com/guluJa/toktickit/pull/77#pullrequestreview-5406201875) | `bb6049b` |
| [#78](https://github.com/guluJa/toktickit/pull/78) / #72 — Dashboards | `bf04947` | [Approved](https://github.com/guluJa/toktickit/pull/78#pullrequestreview-5407069907) | `51bcf9c` |
| [#79](https://github.com/guluJa/toktickit/pull/79) / #73 — Hardening | `af6fe86` | [Approved](https://github.com/guluJa/toktickit/pull/79#pullrequestreview-5412952624) | `3b7291e` |

PR #79 มี [ความคิดเห็นของ Reviewer](https://github.com/guluJa/toktickit/pull/79#pullrequestreview-5410260883) บน `af6fe86` และ [คำตอบของผู้จัดทำ](https://github.com/guluJa/toktickit/pull/79#issuecomment-5990353143) ก่อน Approval วันที่ 5 ตุลาคม 2026; merge เข้า `lab4-staging` เวลา 17:13 น. (Asia/Bangkok)

Issues #67 และ #69–#73 ปิดแล้วตาม GitHub API ที่ตรวจครั้งนี้ ส่วน Issue #74 ยังเปิดอยู่ การอ่าน GitHub Project ถูกจำกัดเพราะ token ไม่มี `read:project` จึงยังไม่ยืนยันว่าทุกรายการเป็น Done และไม่ได้เพิ่มสิทธิ์หรือเปลี่ยนสถานะแทนผู้จัดทำ

## Issue #74: Pre-release

ตรวจ Release candidate จาก staging commit `3b7291e` แล้วตาม `tests.md` ข้อ 17; เป็นการตรวจทางเทคนิค ไม่ใช่ peer approval ของเอกสารรอบนี้ ไม่มี PR/Review/Approval/Merge ใหม่จากการทำ audit นี้ Release PR และการรีวิวหลักฐาน Final-main ยัง Pending
