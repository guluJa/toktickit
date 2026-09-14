# TokTickIT Lab 3 UI Specification

## 1. Application Shell
ใช้ Zen Green tokens, cards, badges, form conventions และ feedback patterns ต่อจาก Lab 2 โดย shell ต้องแสดงชื่อผู้ใช้ที่ authenticated, role badge, role-specific navigation และ Logout production client จะไม่มี Development Requester selector หรือ Change Requester action

## 2. Screens and Modes
| หน้าจอ | โหมดหลัก | Controls และ feedback |
|---|---|---|
| Login | view, submitting, validation, failure | email, password, busy state และ safe error |
| Change Password | mandatory form, submitting, success/failure | new/confirm password, rules และ continuation |
| Create Ticket | create, loading, validation, success/failure | fields และ attachments ของ Lab 2; Requester identity เป็น read-only |
| My Tickets | loading, populated, empty, no-results, failure | search/filter/sort/pagination และ own-ticket results |
| Requester Ticket Detail | loading, view, comment, resolved, failure | read-only detail, attachments, Public Comments และ resolved indication |
| Staff Ticket Queue | loading, populated, empty/no-results, forbidden/failure | search, filters, sortable queue, pagination, ownership/status/priority และ open detail |
| Staff Ticket Detail | view/edit, saving, success/validation/conflict/failure | assignment, IT Priority, status, Public Comments, Internal Notes และ attachments |
| User Management | loading, list, create, edit, reset, validation/forbidden/conflict/failure | user list, search, role filter, modal/form และ deactivation confirmation |

### 2.1 User Management list and feedback

เมื่อ Administrator เปิดหน้า User Management รายการต้องแสดงคอลัมน์ต่อไปนี้อย่างชัดเจน:

- `Name`
- `Email`
- `Role`
- `Status` โดยแสดง `Active` หรือ `Inactive` เป็นข้อความ ไม่ใช้สีเพียงอย่างเดียว
- `Edit` action สำหรับเปิดฟอร์มแก้ไข User

หลังดำเนินการสำเร็จ ให้แสดง success feedback ที่อ่านได้และประกาศผ่าน `aria-live`:

- Create: `User created successfully.`
- Edit: `User updated successfully.`
- Reset initial password: `Initial password reset successfully.`

ระหว่างบันทึกให้ปิดปุ่มที่เกี่ยวข้องและแสดง saving state; เมื่อ validation, forbidden, conflict หรือ server failure ให้แสดงข้อความที่ปลอดภัยใกล้ฟอร์มหรือรายการโดยไม่เปิดเผย password, session หรือข้อมูลภายในระบบ

## 3. Role Behavior
- Requester เห็นเฉพาะ Create Ticket, My Tickets และ Ticket Detail ของตนเอง
- IT Staff เห็น Staff Queue และ Staff Ticket Detail พร้อม controls ตาม authorization matrix
- Administrator เห็น User Management และ staff ticket information แบบ read-only ยกเว้น IT Priority ที่แก้ได้
- Internal Notes มี private warning ชัดเจนว่า “private to IT Staff and Administrators” และไม่แสดงใน Requester response
- Editable fields ต้องแตกต่างจาก read-only fields อย่างชัดเจน

## 4. Responsive and Accessibility Rules
- Desktop ใช้ queue table ที่มี Ticket Number, Summary, Category, Requested Priority, IT Priority, Status, Owner และ Last Updated
- Tablet จัดข้อมูลใน card/table ที่ไม่ทำให้ page overflow
- Mobile เปลี่ยนแต่ละแถวเป็น stacked card และยังเข้าถึง actions ได้
- Form เปลี่ยนเป็นหนึ่งคอลัมน์เมื่อความกว้างต่ำกว่า 760px
- ทุก input มี visible label; error อยู่ติด input และเชื่อมด้วย `aria-describedby`
- Keyboard focus ต้องมองเห็นได้; status ห้ามสื่อสารด้วยสีเพียงอย่างเดียว
- Loading/saving และ alert ใช้ `aria-live`, `role="status"` หรือ `role="alert"` ตามความเหมาะสม

## 5. Visual Review Checklist
รายการนี้เป็นเกณฑ์ตรวจเมื่อ implementation เสร็จ ไม่ใช่ผลการทดสอบใน PR เอกสารนี้:
- [x] Zen Green tokens และ button/badge conventions ต่อเนื่องจาก Lab 2 (ZenGreenStyle component assertions และ final screenshots)
- [x] ชื่อและ role ของ authenticated user กับ navigation ถูกต้องตาม role (ตรวจจาก final E2E screenshots)
- [x] Status, Requested Priority, IT Priority และ role มี text label (ตรวจจาก final E2E screenshots)
- [x] Validation, forbidden, empty/no-results, saving และ failure feedback อ่านได้ชัดเจน (component/API tests และ final E2E evidence)
- [x] Editable และ read-only fields แตกต่างกันชัดเจน (ตรวจ Staff Ticket Detail final screenshot)
- [x] Desktop, tablet และ mobile ไม่มี clipping, overlap หรือ horizontal overflow (Playwright overflow assertions และ visual inspection)
- [x] Keyboard focus, labels, table/card semantics และ non-color state cues ผ่าน accessibility review (AccessibilityStyle component test, semantic table/card markup and text status labels)
