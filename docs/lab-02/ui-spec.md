# Lab 2 Zen Green UI Specification

เอกสารนี้กำหนด Visual และ Interaction Contract สำหรับ Development Requester Selection, Create Ticket, My Tickets, Requester Ticket Detail และ Attachment behavior โดยต้องใช้ร่วมกับ `specification.md`, `api-spec.md` และ `tests.md`

## 1. Design Principles

- ใช้ Zen Green Theme อย่างสม่ำเสมอ เรียบ อ่านง่าย และไม่เพิ่ม Decorative Element ที่รบกวนงานหลัก
- สถานะทุกชนิดต้องสื่อด้วยข้อความหรือ Icon ร่วมกับสี ไม่ใช้สีเพียงอย่างเดียว
- Editable, Read-only, Invalid, Disabled และ Focused controls ต้องแยกจากกันได้ชัดเจน
- Component และ Layout ต้องนำกลับไปใช้ใน Lab ถัดไปได้
- UI ต้องไม่แสดง Authentication หรือ IT Staff workflow ซึ่งอยู่นอก Scope ของ Lab 2

## 2. Design Tokens

### 2.1 Colors

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#006B3C` | App header, Primary button, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active navigation, link, hover และ focus accent |
| `--color-pale-green` | `#EAF6EF` | Selected item, success background, subtle section emphasis |
| `--color-page` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Card, Form และ Table surface |
| `--color-text` | `#18372B` | Main text |
| `--color-muted` | `#5F6F67` | Supporting text |
| `--color-border` | `#CAD8D1` | Neutral border และ divider |
| `--color-readonly` | `#F0F4F1` | Read-only field background |
| `--color-error` | `#8B1E2D` | Error text/border/icon |
| `--color-warning` | `#9A6700` | Warning text/border/icon |
| `--color-success` | `#176B3A` | Success text/border/icon |

Contrast ของ Text และ Interactive Controls ต้องอ่านได้ตาม WCAG AA ในขนาดข้อความที่ใช้งานจริง

### 2.2 Typography

- ใช้ System Font Stack หรือ Bootstrap default โดยไม่เพิ่ม Font dependency ที่ไม่จำเป็น
- Page title: 28-32 px, Semibold
- Section heading: 20-24 px, Semibold
- Body/Label/Button: 16 px
- Supporting/Error text: 14 px และต้องยังอ่านได้ชัดเจน
- Ticket Number ใช้ Font weight ที่เด่น แต่ไม่ใช้สีเพียงอย่างเดียว

### 2.3 Spacing and Surfaces

- ใช้ Spacing scale 4, 8, 12, 16, 24 และ 32 px
- Form control ระหว่าง Label กับ Input ใช้ 8 px; ระหว่าง Field groups ใช้ 16-24 px
- Card ใช้ Border 1 px, Border radius 8-12 px และ Shadow แบบเบา
- Content มี Sensible Maximum Width ประมาณ 1200 px และจัดกึ่งกลางบน Desktop

## 3. Application Shell

### Required Elements

- TokTickIT application identity
- Navigation: `Create Ticket` และ `My Tickets`
- Current Requester name พร้อมข้อความกำกับว่าเป็น Development Testing Context
- `Change Requester` action
- Active Page indicator
- Responsive Mobile Navigation

### Behavior

- หากไม่มี Valid Current Requester ต้องแสดง Requester Selection แทน Ticket screens
- Change Requester ต้องกลับไปหน้า Selection และล้าง requester-specific UI state
- Navigation ที่ Active ใช้ทั้งสี รูปร่าง/เส้นกำกับ และ `aria-current="page"`
- Mobile Navigation ต้องเปิด/ปิดด้วย Keyboard และมี Accessible Name

## 4. Shared Component Rules

### 4.1 Form Controls

- Label อยู่เหนือ Control และเชื่อมด้วย `for`/`id`
- Required field แสดง `*` สีแดงพร้อมข้อความหรือ `aria-required="true"`
- Editable field ใช้พื้นขาวและ Neutral border
- Read-only field ใช้พื้น `--color-readonly`, ค่าอ่านได้ และมีคำอธิบายเมื่อเป็น Pending
- Invalid field ใช้ Error border, `aria-invalid="true"` และข้อความใต้ Field ที่เชื่อมด้วย `aria-describedby`
- Focused field ต้องมี Visible Focus Ring สี Secondary Green
- Disabled field ต้องแตกต่างจาก Read-only และไม่สามารถ Activate ได้
- Description ใช้ Textarea ที่สูงกว่า Input; Resize ได้เฉพาะแนวตั้งเมื่อไม่ทำให้ Layout แตก

### 4.2 Buttons

| Hierarchy | Use | Style |
|---|---|---|
| Primary | Submit, Continue, Retry สำคัญ | Primary Green background, white text |
| Secondary | Back, Change Requester, Clear Filters | White/pale background, green border/text |
| Tertiary | Low-emphasis navigation/action | Text/link style พร้อม Visible Focus |
| Destructive | Confirm Attachment removal | Error color พร้อมข้อความชัดเจน |
| Disabled | Action ที่ยังใช้ไม่ได้ | Muted style, no activation |
| Busy | Request กำลังประมวลผล | Disabled พร้อม Spinner และข้อความ เช่น `Submitting...` |

Icon-only control ต้องมี Accessible Label และ Tooltip; Action สำคัญต้องมีข้อความ ไม่ใช้ Icon อย่างเดียว

### 4.3 Badges and Feedback

- Requested Priority แสดงข้อความ `Low`, `Medium` หรือ `High`
- Current Status แสดงข้อความ `New`
- Badge ต้องมี Text และไม่พึ่งสีเพียงอย่างเดียว
- Success, Warning และ Error callout ต้องมี Heading/ข้อความที่อธิบายผลและ Next Action
- Safe Error ห้ามแสดง Stack Trace, SQL, Local Path หรือ Secret

## 5. Development Requester Selection

### Structure

1. TokTickIT title
2. ข้อความ: `Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3.`
3. Development Requester dropdown ที่โหลด Active Requesters
4. Primary `Continue` button

### States

- Initial/Loading: Dropdown และ Continue Disabled พร้อม Loading text
- Ready: แสดง Active options; Continue Disabled จนเลือก Requester
- Empty: อธิบายว่าไม่มี Active Requester และไม่แสดงทางเข้าสู่ Ticket screens
- Failure: Safe Error พร้อม Retry
- Continuing: Continue เป็น Busy และป้องกันการกดซ้ำ

## 6. Create Ticket Screen

### 6.1 Field Order and Grouping

1. Page heading และคำอธิบายสั้น
2. System Information: Ticket Number `Pending until saved`, Ticket Date `Assigned when saved`, Requester และ Current Status `New`
3. Classification: Category, Related System และ Requested Priority
4. Ticket Details: Summary และ Description
5. Attachments
6. Form actions

### 6.2 Field Contract

| Field | State | Required | UI Rule |
|---|---|---|---|
| Ticket Number | Read-only/Pending | System | แสดง Official Number หลัง Success เท่านั้น |
| Ticket Date | Read-only/Pending | System | ใช้ค่าจาก Backend |
| Requester | Read-only | System | แสดง Current Requester |
| Current Status | Read-only badge | System | แสดง `New` |
| Category | Select | Yes | Active data จาก API |
| Related System | Select | Yes | Active data จาก API |
| Requested Priority | Select | Yes | Low, Medium, High |
| Summary | Text | Yes | 5-150 ตัวอักษร |
| Description | Textarea | Yes | 10-5000 ตัวอักษร |
| Attachments | File control/list | No | JPG/JPEG, PNG, WEBP, PDF; <= 5 MB/file; <= 5 Active |

### 6.3 Screen States

- Initial: โหลด Category และ Related System
- Ready: Form ใช้งานได้เมื่อ Reference Data พร้อม
- Validation Failure: แสดงข้อความราย Field และรักษาค่าที่ถูกต้อง
- Submitting: Submit Disabled พร้อม Busy text; Form ไม่ Submit ซ้ำ และ Client เก็บ `submissionKey` ของ Submission ปัจจุบันไว้
- Success: แสดง Official Ticket Number, Saved Values และ Actions `View Ticket`/`My Tickets`
- API Failure: แสดง Safe Error, Retry และรักษา Form values โดย Retry ใช้ `submissionKey` เดิม ส่วนการเริ่ม Form ใหม่หลัง Success ใช้ Key ใหม่
- Reference-data Failure: ปิด Submit และมี Retry
- Attachment Invalid: แสดงเหตุผลใกล้รายการไฟล์
- Attachment Upload Failure after Ticket saved: Ticket Success ยังคงอยู่และมี Retry เฉพาะไฟล์

## 7. My Tickets Screen

### 7.1 Controls

- Search by Ticket Number or Summary
- Filters: Category, Related System, Requested Priority, Current Status
- Sort: Last Updated, Ticket Date, Ticket Number และ Ascending/Descending
- Clear Filters
- Pagination พร้อม Page, Page Size, Total Items และ Total Pages
- Primary `Create Ticket` action

### 7.2 Desktop Table

Columns:

1. Ticket Number
2. Summary
3. Category
4. Requested Priority badge
5. Current Status badge
6. Last Updated
7. `View` action

Default Sort คือ Last Updated descending และ Secondary Sort คือ ID descending

### 7.3 Mobile Cards

- ใช้ข้อมูลเดียวกับ Desktop Table โดย Ticket Number และ Summary อยู่บนสุด
- Category, Priority, Status และ Last Updated เรียงเป็น Label/Value ที่อ่านง่าย
- ทั้ง Card หรือปุ่ม `View Details` ต้องใช้ Keyboard ได้
- ห้ามบังคับ Horizontal Table Scrolling บน Mobile

### 7.4 States

- Loading: Skeleton/Loading text ที่มี Accessible Name
- Empty: Current Requester ยังไม่มี Ticket พร้อม Create Ticket action
- No-results: มี Ticket แต่ไม่ตรง Search/Filters พร้อม Clear Filters
- Failure: Safe Error พร้อม Retry
- Loaded: แสดง Results และ Pagination Metadata

## 8. Requester Ticket Detail

### Structure

1. Back to My Tickets
2. Ticket header: Ticket Number, Status badge และ Created Date
3. Requester and Classification
4. Summary and Description
5. Attachment Section

Ticket fields ทั้งหมดเป็น Read-only และต้องไม่เพิ่ม Edit, Status Change, Comments, Internal Notes หรือ Actions Taken

### States

- Loading
- Loaded Owned Ticket
- Not Found/Unauthorized: Safe Not-found โดยไม่เปิดเผย Owner
- Failure: Safe Error พร้อม Retry หรือ Back to My Tickets

## 9. Attachment Section

### Presentation

แต่ละรายการแสดง Original Filename, MIME/Type label, File Size, Uploaded At และ State

| State | Presentation | Permitted Action |
|---|---|---|
| Selected | Filename, size, validation pending/passed | Remove from selection |
| Uploading | Progress/Busy text | None |
| Active | Metadata พร้อม Active label | Download, Remove |
| Invalid | Error reason ใกล้ไฟล์ | Remove from selection |
| Upload Failed | Safe Error | Retry, remove from selection |
| Removed | Metadata, Removed At, Reason | No Download/Preview |
| Unavailable | Safe message | Retry metadata load when applicable |

Removal ใช้ Confirmation dialog ที่ระบุ Filename และมี Required Removal Reason 5-250 ตัวอักษร ปุ่มยืนยันใช้ Destructive hierarchy

Lab 2 ไม่ทำ Inline Preview; Active Attachment ใช้ Download เท่านั้น

## 10. Responsive Layout

| Viewport | Required Layout |
|---|---|
| Desktop >= 992 px | Centered multi-column layout; Create form ใช้สองคอลัมน์ในกลุ่มที่เหมาะสม; My Tickets ใช้ Table |
| Tablet 768-991 px | สองคอลัมน์เมื่อพื้นที่พอ; Summary/Description และ Attachment ใช้ Full Width |
| Mobile < 768 px | ทุก Field Stack; Actions Full-width/Wrap ได้; My Tickets ใช้ Cards; Navigation responsive |

ทุกขนาดต้องไม่มี Clipped Label, Overlapping Error, Hidden Action, Unreadable Filename หรือ Horizontal Page Overflow ที่ไม่ได้ตั้งใจ ปุ่มต้อง Touch-friendly อย่างน้อยประมาณ 44 px ในแกนที่กด

## 11. Accessibility Rules

- ใช้ Semantic headings ตามลำดับและมีหนึ่ง Page heading
- ทุก Control มี Accessible Name และ Label
- Keyboard order ต้องตรงกับ Visual order
- Focus ต้องไม่ถูกซ่อนหลัง Navigation หรือ Dialog
- Dialog ต้องจัดการ Initial Focus, Focus Trap และ Return Focus
- Dynamic Loading/Error/Success ใช้ `aria-live` ที่เหมาะสม
- Table มี Header associations; Mobile Cards มี Label/Value ชัดเจน
- Status, Priority, Required และ Error ไม่สื่อด้วยสีเพียงอย่างเดียว
- Filename ยาวต้อง Wrap/Truncate อย่างปลอดภัยและยังเข้าถึงชื่อเต็มได้

## 12. Visual Inspection and Screenshot Plan

Screenshot ต้องมาจาก Implementation จริงและอ่านได้ ไม่ใช้ Mockup แทน Evidence

### Planned Paths

- `artifacts/lab-02/screenshots/create-ticket/requester-selection.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-initial.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-validation.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-submitting.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-success.png`
- `artifacts/lab-02/screenshots/create-ticket/desktop-failure.png`
- `artifacts/lab-02/screenshots/create-ticket/mobile.png`
- `artifacts/lab-02/screenshots/my-tickets/desktop.png`
- `artifacts/lab-02/screenshots/my-tickets/tablet.png`
- `artifacts/lab-02/screenshots/my-tickets/mobile.png`
- `artifacts/lab-02/screenshots/my-tickets/empty.png`
- `artifacts/lab-02/screenshots/my-tickets/no-results.png`
- `artifacts/lab-02/screenshots/ticket-detail/desktop.png`
- `artifacts/lab-02/screenshots/ticket-detail/tablet.png`
- `artifacts/lab-02/screenshots/ticket-detail/mobile.png`
- `artifacts/lab-02/screenshots/ticket-detail/removed-attachment.png`

### Checklist

- [ ] Zen Green tokens และ Surface styling สม่ำเสมอ
- [ ] Editable และ Read-only fields แยกกันชัดเจน
- [ ] Required marker และ Validation message อยู่ถูกตำแหน่ง
- [ ] Primary, Secondary, Tertiary, Destructive, Disabled และ Busy buttons ถูกต้อง
- [ ] Loading, Empty, No-results, Validation, Success และ Failure states ครบ
- [ ] Priority/Status badges มี Text และไม่พึ่งสี
- [ ] Desktop Table และ Mobile Cards แสดงข้อมูลสำคัญเท่ากัน
- [ ] Attachment states และ Long Filename อ่านได้
- [ ] Desktop, Tablet และ Mobile ไม่มี Clipping, Overlap หรือ Horizontal Overflow
- [ ] Keyboard navigation และ Visible Focus ผ่านการตรวจ

Checklist นี้ยังไม่ควรถูกติ๊กจนตรวจ Implementation และ Screenshot จริงแล้ว
