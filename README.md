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

## ติดตั้งและรัน

ต้องมี Node.js 20 ขึ้นไป และฐานข้อมูล HIS (MySQL) ที่มีตาราง `nondrugitems`, `lab_items`,
`er_oper_code`, `dttm`, `drugitems` และตารางรหัสมาตรฐาน (`nhso_adp_code`, `lab_items_tmlt`,
`icd9cm1`, `icd10tm_operation`)

```bash
npm install
cp backend/.env.example backend/.env   # แล้วใส่ DATABASE_URL ของ รพ.
npm run dev
```

เปิด http://localhost:6011 (API อยู่ที่พอร์ต 6010)

ถ้าต้องการให้ login ก่อนบันทึก ให้ตั้ง `AUTH_SECRET` และ `AUTH_USERS` ใน `backend/.env`
ตามตัวอย่างใน `.env.example` (ผู้ใช้ role `editor` บันทึกได้, `viewer` ดูได้อย่างเดียว)

## คำสั่งอื่น

| คำสั่ง | ใช้ทำอะไร |
| --- | --- |
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
