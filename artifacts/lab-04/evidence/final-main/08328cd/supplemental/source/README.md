# Source ของหลักฐานภาพเสริม

Product SHA: `08328cd293c11316da8496857007d781f2dafaa8`

- `final-report-evidence.spec.ts`: source ที่ใช้เก็บภาพหลาย Actions, performer ต่างจาก Owner และ Requester read-only ในรอบภาพเสริม
- `support-accessible-name.patch`: การปรับ helper ใน snapshot ให้ตรวจ accessible name ของ native file input แทน innerText โดยไม่ตัด assertion ด้าน labels, focus หรือ layout
- ผลรันอยู่ใน `../run.json`, `../report-evidence-report.json` และ `../verification/` เป็น supplemental 1 case แยกจาก original-main suite

Helper ก่อนปรับมี SHA-256 `9b5ff2cb5bcf9e2a0a2adc40b70aa42264f324be48a09760a79510fa62ac4778`; หลังปรับมี SHA-256 `ed493982494b483f630926d7a24f48cfd8945c02d3982ee995a2af503fde63b4` ตาม bytes ของ snapshot เดิมที่ใช้ CRLF การเปลี่ยน line endings อาจทำให้ hash ต่างแม้ source เหมือนกัน

## การตรวจซ้ำบน snapshot แยก

1. Export Product SHA ข้างต้นด้วย `git archive` ไปยังโฟลเดอร์ชั่วคราว ไม่ใช้ working tree ปัจจุบันเป็นพื้นที่รัน
2. เตรียม dependencies จาก lockfiles ใน server, client และ e2e รวมถึง Chromium ตาม README ของ Repository
3. เตรียม `server/.env` เฉพาะใน snapshot และกำหนด `E2E_DATABASE_URL` เป็นฐาน PostgreSQL ทดสอบที่แยกจาก Development; database guard ของ main ต้องผ่านก่อนรัน และเก็บ credentials ไว้นอก Git
4. วาง spec นี้ที่ `e2e/lab-04/final-report-evidence.spec.ts` ใน snapshot และวาง helper patch ที่ root ของ snapshot จากนั้นตรวจและ apply:

```powershell
git apply --check support-accessible-name.patch
git apply support-accessible-name.patch
```

5. จากโฟลเดอร์ `e2e` ของ snapshot รันคำสั่งเดียวกับหลักฐาน:

```powershell
npm.cmd test -- lab-04/final-report-evidence.spec.ts
```

รอบตรวจซ้ำสร้าง logs, reports และภาพใน snapshot เท่านั้น ไม่คัดผลใหม่มาทับหลักฐานเดิม ไฟล์ภาพที่มีอยู่ใน snapshot จากการ export ไม่ถือเป็นภาพที่สร้างใหม่ ต้องใช้ timestamps/report ของรอบตรวจซ้ำประกอบ การรันนี้สร้างและล้างเฉพาะ E2E fixtures ผ่าน database guard ไม่ reset หรือลบฐาน Development
