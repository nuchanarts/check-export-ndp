# Check Export NDP — การตั้งค่าเพื่อส่งออก NDP

เว็บแอปสำหรับตั้งรหัสของรายการค่าบริการใน รพ. ให้ตรงตามเกณฑ์กิจกรรม PP 104 รายการ
เพื่อส่งข้อมูลเข้า NHSO Digital Platform (NDP) ได้ถูกต้อง
แยกมาจากเมนู "การตั้งค่าเพื่อส่งออก NDP" ของระบบ BGS Check Export

## ทำอะไรได้บ้าง

- ดูกิจกรรม PP 104 รายการ ราคา เงื่อนไขการเบิก รหัสที่ใช้ และตัวอย่าง JSON
- กรองกิจกรรมตามสถานะการตั้งรหัส (ยังไม่สมบูรณ์ / บางชนิด / ยังไม่มี / ครบทุกชนิด) และศักยภาพ รพ.สต.
- ตั้งรหัส CSMBS, รหัส สปสช., TMLT, ICD-9-CM, ICD-10-TM ทันตกรรม ให้รายการของ รพ. ทีละรายการ
  พร้อมถามก่อนปรับราคาให้ตรงเกณฑ์ ยา/วัคซีน (TMT) ตรวจได้อย่างเดียว
- สรุปรายการใน HIS ที่ตั้งรหัสตรงเกณฑ์แล้ว และบอกชนิดรหัสที่ยังไม่ได้ตั้ง
- Export Excel ตามที่กรอง และ SOP การใช้งานในหน้าจอ
- แท็บ "สำหรับนักพัฒนา API 13 Plus"

ทุกการบันทึกถูกเก็บประวัติในตาราง `bgs_mapping_audit` (สร้างให้อัตโนมัติ)

## ดาวน์โหลด

- **ไฟล์ zip:** ที่หน้า repo บน GitLab กดปุ่ม **Code → Download source code (zip)** หรือเลือกเวอร์ชันที่หน้า **Tags** (เช่น `v1.0.0`)
- **git:** `git clone https://gitlab.bgs.co.th/nuchanart/check-export-ndp.git`

## สิ่งที่ต้องมี

- Node.js 20 ขึ้นไป ([nodejs.org](https://nodejs.org))
- เข้าถึงฐานข้อมูล HIS (MySQL) ที่มีตาราง `nondrugitems`, `lab_items`, `er_oper_code`, `dttm`, `drugitems`
  และตารางรหัสมาตรฐาน `nhso_adp_code`, `lab_items_tmlt`, `icd9cm1`, `icd10tm_operation`
- บัญชีฐานข้อมูลต้องมีสิทธิ์ `SELECT` และ `UPDATE` ตารางรายการด้านบน และสิทธิ์สร้างตาราง `bgs_mapping_audit` ในครั้งแรก

## ใช้งานบน Windows (แนะนำ)

1. แตกไฟล์ zip ไว้ในโฟลเดอร์ที่ต้องการ
2. ดับเบิลคลิก **`start.bat`**
   - ครั้งแรกจะสร้างไฟล์ `backend\.env` แล้วเปิด Notepad ให้ใส่ `DATABASE_URL` ของ รพ. บันทึกแล้วปิด
3. ดับเบิลคลิก **`start.bat`** อีกครั้ง ระบบจะติดตั้ง build และเปิดเบราว์เซอร์ที่ http://localhost:6010 ให้เอง

ครั้งต่อไปดับเบิลคลิก `start.bat` อย่างเดียว ปิดระบบโดยปิดหน้าต่างดำ

ถ้าอัปเดตเป็นเวอร์ชันใหม่ ให้ลบโฟลเดอร์ `frontend\dist` ก่อนเปิด `start.bat` เพื่อให้ build ใหม่

## ใช้งานด้วยคำสั่ง (ทุกระบบปฏิบัติการ)

```bash
npm install
cp backend/.env.example backend/.env   # แล้วใส่ DATABASE_URL ของ รพ.
npm run build
npm start                              # เปิด http://localhost:6010
```

เปลี่ยนพอร์ตได้ที่ `PORT` ใน `backend/.env`

## ตั้งค่าการเข้าสู่ระบบ

ค่าเริ่มต้นไม่ต้อง login และทุกคนที่เปิดหน้าเว็บได้บันทึกรหัสได้ ถ้าเปิดให้หลายคนในเครือข่ายใช้ ควรตั้ง login
โดยใส่ทั้ง `AUTH_SECRET` และ `AUTH_USERS` ใน `backend/.env` ตามตัวอย่างใน `.env.example`
(role `editor` บันทึกได้, `viewer` ดูได้อย่างเดียว) ถ้าตั้งไม่ครบหรือรูปแบบผิด ระบบจะล็อกการบันทึกไว้และแจ้งใน log

## สำหรับนักพัฒนา

| คำสั่ง | ใช้ทำอะไร |
| --- | --- |
| `npm run dev` | โหมดพัฒนา: หน้าเว็บ http://localhost:6011 (แก้แล้วรีโหลดเอง) API ที่พอร์ต 6010 |
| `npm test` | รัน test ทั้ง backend และ frontend |
| `npm run build` | build backend (`backend/dist`) และ frontend (`frontend/dist`) |

## โครงสร้าง

```
backend/   Express API: /api/pp-mapping (ค้นหา ตรวจรหัส สรุป บันทึก) และ /api/auth
frontend/  React + Vite + Tailwind: หน้า "การตั้งค่าเพื่อส่งออก NDP"
scripts/   ppCodeRoutes.ts ใช้ร่วมกันระหว่างข้อมูลคู่มือกับการจัดชนิดรหัส
```

`frontend/src/data/ppActivities.ts` และ `backend/src/services/ppAllowedCodes.ts` สร้างจากคู่มือ PDF
ในโปรเจกต์ต้นทาง ถ้าคู่มือเปลี่ยนให้สร้างใหม่ที่โปรเจกต์ต้นทางแล้วคัดลอกมา
