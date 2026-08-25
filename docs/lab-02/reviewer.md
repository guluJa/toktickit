# Lab 2 Peer Review Record

ไฟล์นี้เป็น Initial Structure สำหรับรวบรวม Peer Review Evidence ตอน Final Documentation Issue โดยบันทึกเฉพาะข้อมูลที่เกิดขึ้นจริงจาก GitHub ห้ามคาดเดา Reviewer, Comment, Verdict หรือ Approval

## 1. Author Information

- Name: ณัฐวดี ภูเขม่า
- Student ID: 67070507201
- GitHub Username: `guluJa`
- Repository: https://github.com/guluJa/toktickit
- Integration Branch: `lab2-staging`

## 2. Update Policy

- ระหว่าง Feature Issues ใช้ GitHub PR Conversation เป็น Source of Truth โดยยังไม่ต้องแก้ไฟล์นี้ทุกครั้ง
- หลัง Feature PRs ทั้งหมด Merge เข้า `lab2-staging` ให้สร้าง Final Documentation Issue/Branch แล้วรวบรวมข้อมูลจริงมาอัปเดตไฟล์นี้ครั้งเดียว
- หาก Contract PR #13 ได้รับ Material Review ที่ต้องแก้เอกสาร ให้บันทึก Review นั้นก่อน Merge เพราะเป็นส่วนหนึ่งของ Issue เดียวกัน
- Final record ต้องมี Working PR links, Reviewer identities, Comments received/given, Responses, Actions และ Approvals

## 3. Pull Requests Authored by Me

เพิ่มข้อมูลจาก GitHub ใน Final Documentation Issue โดยไม่สร้างแถวแทน PR ที่ยังไม่มีจริง

| Issue/Scope | Branch | Pull Request | Reviewer | Verdict | Merge Evidence |
|---|---|---|---|---|---|
| #13 Engineering Contract and Test Plan | `docs/lab2-engineering-contract` | Add after PR creation | Add after review | Pending peer review | Add after merge |

## 4. Material Feedback Received and My Response

อัปเดตเฉพาะ Comment ที่มีผลต่อ Requirement, Code, Test, Migration, Dependency, UI หรือ Security ไม่จำเป็นต้องคัดทุกข้อความสนทนาทั่วไป

| PR | Reviewer Comment | My Verification/Response | Action Taken | Final Review Result |
|---|---|---|---|---|
| No review recorded yet | - | - | - | - |

## 5. Pull Requests Reviewed by Me

บันทึกอย่างน้อย Review ที่ทำให้เพื่อนจริง พร้อม Working Link และผลหลังเพื่อนตอบหรือแก้ไข

| Partner/Repository | Pull Request | Comment Given | Partner Response/Action | My Final Verdict |
|---|---|---|---|---|
| No peer review recorded yet | - | - | - | - |

## 6. Review Standard

- ตรวจ Base/Compare Branch, Issue linkage และ Scope ก่อนตรวจไฟล์
- ตรวจทั้ง PR Diff และ Full Source File เมื่อ Diff ซ่อน Context
- เปรียบเทียบกับ Approved Contract และ Acceptance Criteria ไม่ใช้ความชอบส่วนตัว
- ตรวจ Commands, Dependencies, Migration, Tests, Generated Files และ Secret handling
- Request Changes ต้องระบุปัญหา ผลกระทบ และวิธีตรวจยืนยันหลังแก้
- Author ตอบ Material Comments และ Reviewer ตรวจซ้ำก่อน Approve/Merge

## 7. Final Evidence Checklist

Checklist นี้ใช้ใน Final Documentation Issue หลังงาน Feature เสร็จ ไม่ต้องติ๊กใน PR #13

- [ ] ทุก Feature PR มี Working Link และ Reviewer identity จริง
- [ ] Material comments ที่ได้รับมี Response และ Action/Reason ครบ
- [ ] มีหลักฐาน PR ที่ฉัน Review ให้เพื่อนอย่างน้อยหนึ่งรายการ
- [ ] Required PRs ถูก Approved ก่อน Merge เข้า `lab2-staging`
- [ ] Release PR จาก `lab2-staging` เข้า `main` ผ่าน Review
- [ ] Rendered `reviewer.md` อ่านได้และไม่เปิดเผย Secret
