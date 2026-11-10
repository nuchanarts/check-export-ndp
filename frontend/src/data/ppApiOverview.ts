/**
 * Static content for the "ภาพรวม API 13Plus" tab, taken from pages 7–10 of
 * "คู่มือการเบิกจ่ายกิจกรรม PP + API 13Plus" v1.4 (which cites API Specification
 * 13Plus for NHSO Digital Platform V1.3.4).
 *
 * CODESYS meanings are not spelled out in the manual; the labels below follow the
 * codes' use throughout its 104 activities (001 TMT, 002 TMLT, 004 CSMBS, …).
 */

export const API_BASES = [
  { env: 'UAT', url: 'https://uat-api-dplatform.uat.krungthai.com' },
  { env: 'Production', url: 'https://api-nhsodp.nhso.go.th' },
]

export const API_ENDPOINTS: { method: 'POST' | 'PUT'; path: string; purpose: string }[] = [
  { method: 'POST', path: '/stddataset/api/v2/sign-on', purpose: 'ลงชื่อเข้าใช้งานเพื่อรับ token สำหรับเรียก API อื่น ๆ' },
  { method: 'POST', path: '/stddataset/api/v2/create-std-data', purpose: 'ส่งชุดข้อมูลมาตรฐาน 13 แฟ้ม Plus เพื่อขอเบิกค่าใช้จ่าย' },
  { method: 'PUT', path: '/stddataset/api/v2/create-std-data/cancel', purpose: 'ยกเลิกรายการเบิกที่ส่งไปแล้ว' },
  { method: 'POST', path: '/stddataset/api/v2/status-tracks', purpose: 'ตรวจสอบสถานะการเบิก (สรุป)' },
  {
    method: 'POST',
    path: '/stddataset/api/v2/status-tracks/details',
    purpose: 'ตรวจสอบสถานะแบบละเอียด (รายการเบิก / เงินที่จ่าย / กองทุน / statement)',
  },
]

export const API_HEADERS = [
  { name: 'Request-id', detail: 'รูปแบบ hcodeYYYYMMDDHHmmssSSS เช่น 0000020260508160819405' },
  { name: 'Authorization', detail: 'Bearer <token> ที่ได้จาก sign-on (ยกเว้นการเรียก sign-on เอง)' },
  { name: 'x-source-id', detail: 'รหัส source ของหน่วยบริการ / ระบบ HIS' },
  { name: 'x-sourceid-key', detail: 'ค่าที่เข้ารหัสด้วย RSA-OAEP (SHA-256) ด้วย public key ของ สปสช. แล้วเข้ารหัส Base64' },
  { name: 'x-fdh-key', detail: '(ถ้าผ่านช่องทาง FDH) เข้ารหัสแบบเดียวกับ x-sourceid-key' },
]

export const SIGN_ON_STEPS = [
  'รับ public key จาก สปสช. ตาม environment',
  'เข้ารหัสค่าลับด้วย RSA/OAEP + SHA-256 (ต้องกำหนด MGF1 = SHA-256 ด้วย)',
  'เข้ารหัสผลลัพธ์เป็น Base64',
  'ใส่ผลลัพธ์ใน header แล้วเรียก POST sign-on ด้วย body {"client_id": …, "client_secret": …} เพื่อรับ token',
  'ใช้ token เป็น Bearer token ในการเรียก API อื่น ๆ',
]

export const STD_FILES = [
  { no: 1, name: 'NHSO Patient (ข้อมูลทั่วไป)', key: 'patient', required: 'Y', array: false },
  { no: 2, name: 'NHSO Provider (ข้อมูลหน่วยบริการ)', key: 'provider', required: 'Y', array: false },
  { no: 3, name: 'NHSO Practitioner (ผู้ให้บริการ)', key: 'practitioner', required: 'N', array: true },
  { no: 4, name: 'NHSO OPD (รับบริการผู้ป่วยนอก)', key: 'opd', required: 'Y/N', array: false },
  { no: 5, name: 'NHSO Diagnosis (วินิจฉัยโรค)', key: 'diagnosis', required: 'Y', array: true },
  { no: 6, name: 'NHSO Procedure (ทำหัตถการ)', key: 'procedure', required: 'N', array: true },
  { no: 7, name: 'NHSO CHAD (รายละเอียดค่าใช้จ่ายรายการ)', key: 'chad', required: 'Y', array: true },
  { no: 8, name: 'NHSO CHA (รายละเอียดทางการเงิน)', key: 'cha', required: 'Y', array: true },
  { no: 9, name: 'NHSO AER (อุบัติเหตุ / ฉุกเฉิน / ส่งต่อ)', key: 'aer', required: 'Y', array: false },
  { no: 10, name: 'NHSO Prenatal (ประวัติการตั้งครรภ์)', key: 'prenatal', required: 'N', array: false },
  { no: 11, name: 'NHSO Newborn (ประวัติการคลอด)', key: 'newborn', required: 'N', array: true },
  { no: 12, name: 'NHSO CMHS (ผู้ป่วยจิตเวชเรื้อรังในชุมชน)', key: 'cmhs', required: 'N', array: false },
  { no: 13, name: 'NHSO Disability (ผู้พิการ)', key: 'disability', required: 'N', array: false },
  { no: 14, name: 'NHSO IPD (ผู้ป่วยใน)', key: 'ipd', required: 'Y/N', array: false },
  { no: 15, name: 'NHSO LVD (ผู้ป่วยในลากลับบ้าน)', key: 'lvd', required: 'Y/N', array: true },
]

export const BILLGRCS_TABLE = [
  { billgrcs: '01', label: 'ห้องค่าอาหาร', codesys: ['004', '006'] },
  { billgrcs: '02', label: 'อวัยวะเทียมและอุปกรณ์บำบัด', codesys: ['005', '006', '007'] },
  { billgrcs: '03', label: 'ยา / สารอาหารทางเส้นเลือด ใช้ที่ รพ.', codesys: ['001', '003'] },
  { billgrcs: '04', label: 'ยา / สารอาหารทางเส้นเลือด ใช้ที่บ้าน', codesys: ['001', '003'] },
  { billgrcs: '05', label: 'เวชภัณฑ์ที่มิใช่ยา', codesys: ['004', '005'] },
  { billgrcs: '06', label: 'บริการโลหิตและส่วนประกอบของโลหิต', codesys: ['004', '006'] },
  { billgrcs: '07', label: 'การตรวจทางเทคนิคการแพทย์ / พยาธิ (LAB)', codesys: ['002', '004', '006'] },
  { billgrcs: '08', label: 'การวินิจฉัย / รักษาทางรังสีวิทยา', codesys: ['004', '005', '006'] },
  { billgrcs: '09', label: 'การตรวจวินิจฉัยด้วยวิธีพิเศษอื่น ๆ (เช่น อัลตราซาวด์)', codesys: ['004', '005', '006'] },
  { billgrcs: '10', label: 'อุปกรณ์ของใช้ / เครื่องมือแพทย์', codesys: ['004', '006'] },
  { billgrcs: '11', label: 'การทำหัตถการและวิสัญญี', codesys: ['004', '006', '007'] },
  { billgrcs: '12', label: 'บริการทางการพยาบาล', codesys: ['004', '006'] },
  { billgrcs: '13', label: 'บริการทางทันตกรรม', codesys: ['004', '005', '008'] },
  { billgrcs: '14', label: 'กายภาพบำบัดและเวชกรรมฟื้นฟู', codesys: ['003', '004', '005'] },
  { billgrcs: '15', label: 'ฝังเข็ม / บำบัดโดยผู้ประกอบโรคศิลปะอื่น ๆ', codesys: ['004', '005', '008'] },
  { billgrcs: '16', label: 'ห้องผ่าตัดและห้องคลอด', codesys: ['004'] },
  { billgrcs: '17', label: 'ค่าธรรมเนียมบุคลากรทางการแพทย์', codesys: ['005'] },
  { billgrcs: '18', label: 'ค่าบริการอื่น ๆ และส่งเสริมป้องกันโรค (กิจกรรม PP ส่วนใหญ่)', codesys: ['004', '005'] },
  { billgrcs: '19', label: 'บริการอื่น ๆ ที่ยังไม่จัดหมวด', codesys: ['005', '006'] },
]

export const CODESYS_LABELS = [
  { codesys: '001', label: 'TMT — ยา / วัคซีน' },
  { codesys: '002', label: 'TMLT — รายการ Lab' },
  { codesys: '003', label: 'รหัสยา / รายการอื่น (คู่มือไม่ระบุ — ตรวจกับประกาศโครงสร้าง 13 แฟ้ม Plus)' },
  { codesys: '004', label: 'CSMBS — รหัสกรมบัญชีกลาง' },
  { codesys: '005', label: 'รหัส สปสช. (NHSO)' },
  { codesys: '006', label: 'รหัสท้องถิ่น / อื่น ๆ (คู่มือไม่ระบุ — ตรวจกับประกาศโครงสร้าง 13 แฟ้ม Plus)' },
  { codesys: '007', label: 'ICD-9-CM — หัตถการ' },
  { codesys: '008', label: 'ICD-10-TM — หัตถการทันตกรรม' },
]

export const RECORD_STATUS = [
  { status: 0, label: 'ยกเลิก' },
  { status: 1, label: 'ข้อมูลใหม่ / ยกเลิกได้' },
  { status: 2, label: 'อยู่ระหว่างประมวลผล' },
  { status: 3, label: 'ไม่ผ่านการตรวจสอบ / ยกเลิกได้' },
  { status: 4, label: 'ผ่านการตรวจสอบ' },
  { status: 5, label: 'ออกรายงานจ่ายเงิน' },
  { status: 6, label: 'โอนเงินสำเร็จ' },
  { status: 7, label: 'อุทธรณ์' },
  { status: 8, label: 'ส่งเบิกแล้ว / ยกเลิกได้' },
]

export const COMMON_ERRORS = [
  { code: 'P118', label: 'ต้องมีโรคหลัก (Pdx, DIAGTYPE = "1") 1 รายการพอดี' },
  { code: 'S110', label: 'diagnosis ซ้ำ' },
  { code: 'S111', label: 'procedure ซ้ำ' },
  { code: 'S112', label: 'chad ซ้ำ' },
  { code: 'M102', label: 'ไม่มีข้อมูล ICD-10' },
  { code: 'R103', label: 'ต้องระบุฟิลด์เมื่อเข้าเงื่อนไข เช่น AEDATE เมื่อ UCAE = A' },
  { code: 'L1xx', label: 'รหัส CODESYS / BILLGRCS / STDCODE ไม่ถูกต้องหรือไม่พบในตาราง' },
]
