/**
 * Hand-maintained companions to the generated ./ppActivities catalog:
 * which category each activity sits in, and warnings about places where the
 * manual contradicts itself. The manual's text is never corrected; the page
 * shows these warnings next to it instead.
 */

export interface PpCategory {
  key: string
  label: string
  icon: string
  /** Activity numbers (PpActivity.no) in this category. */
  nos: number[]
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

export const PP_CATEGORIES: PpCategory[] = [
  { key: 'anc', label: 'ฝากครรภ์และทารกในครรภ์', icon: '🤰', nos: [...range(1, 12), ...range(20, 26)] },
  { key: 'syphilis', label: 'ซิฟิลิส', icon: '🧪', nos: range(13, 19) },
  { key: 'newborn', label: 'ทารกแรกเกิด', icon: '👶', nos: [27, 28, 29, 98] },
  { key: 'postnatal', label: 'หลังคลอด', icon: '🍼', nos: [30, 31] },
  { key: 'family', label: 'วางแผนครอบครัวและการตั้งครรภ์', icon: '💊', nos: range(32, 41) },
  { key: 'vision', label: 'สายตาเด็ก', icon: '👓', nos: [42, 43] },
  { key: 'cervical', label: 'มะเร็งปากมดลูก', icon: '🔬', nos: range(44, 50) },
  { key: 'oral', label: 'สุขภาพช่องปาก', icon: '🦷', nos: [51, 70, 97] },
  { key: 'tb', label: 'วัณโรค', icon: '🫁', nos: range(52, 63) },
  { key: 'ncd', label: 'เบาหวานและไขมัน', icon: '📈', nos: [64, 65, 66] },
  { key: 'breast', label: 'มะเร็งเต้านมและ BRCA', icon: '🎗️', nos: [67, 68, 77] },
  { key: 'anemia', label: 'โลหิตจางและธาตุเหล็ก', icon: '🩸', nos: [69, 93, 94, 95, 96] },
  { key: 'colorectal', label: 'มะเร็งลำไส้', icon: '🧫', nos: [71] },
  { key: 'hepatitis', label: 'ตับอักเสบและพยาธิใบไม้ตับ', icon: '🧬', nos: range(72, 76) },
  { key: 'vaccine', label: 'วัคซีน', icon: '💉', nos: range(78, 92) },
  { key: 'checkup', label: 'ตรวจสุขภาพและผู้สูงอายุ', icon: '🩺', nos: range(99, 103) },
  { key: 'hiv', label: 'HIV', icon: '❤️', nos: [104] },
]

/** Activity number → warnings shown in the "⚠ ข้อควรระวัง" box. Found while reading v1.4. */
export const PP_WARNINGS: Record<number, string[]> = {
  2: ['ตัวอย่าง JSON ใส่ STDCODE 350057 (รหัส TMLT) คู่กับ CODESYS 004 — ที่ถูกควรเป็น CODESYS 002'],
  9: ['ตัวอย่าง JSON ใส่รหัส TMLT 381003 / 381004 คู่กับ CODESYS 004 — ข้อความเงื่อนไขจัดไว้ใต้ CODESYS 002 (TMLT) ซึ่งถูกต้อง'],
  11: ['ตัวอย่าง JSON ใส่รหัส TMLT 300124 คู่กับ CODESYS 004 — ข้อความเงื่อนไขจัดไว้ใต้ CODESYS 002 (TMLT) ซึ่งถูกต้อง'],
  12: ['รหัส TMLT 300034 / 300035 / 300058 ถูกจัดไว้ใต้ CODESYS 004 (CSMBS) — รหัส TMLT ต้องใช้ CODESYS 002'],
  22: ['ตัวอย่าง JSON ใส่รหัส TMLT 320371 (inhibin A) คู่กับ CODESYS 004 — รหัส TMLT ต้องใช้ CODESYS 002'],
  23: ['ตัวอย่าง JSON ใส่รหัส TMLT 320371 (inhibin A) คู่กับ CODESYS 004 — รหัส TMLT ต้องใช้ CODESYS 002'],
  28: ['ตัวอย่าง JSON ใส่รหัส TMLT 320226 (T3) คู่กับ CODESYS 004 — ข้อความเงื่อนไขจัดไว้ใต้ TMLT ซึ่งต้องใช้ CODESYS 002'],
  44: ['ประวัติเอกสาร v1.3 ระบุว่าย้ายรหัส C30 ไปเป็น STDCODE ใน chad แล้ว แต่ตัวอย่าง JSON ยังใส่ C30 ไว้ใน diagnosis'],
  51: ['เงื่อนไขกำหนด ICD-10 Z128 แต่ตัวอย่างชุดเบิกใช้ Z014'],
  64: ['เงื่อนไขกำหนด ICD-10 Z018 แต่ตัวอย่างชุดเบิกใช้ Z111'],
  66: [
    'รหัส 12004 / S04: หัวข้อระบุ BILLGRCS 15 CODESYS 005 (NHSO) แต่บรรทัดรหัสเขียนว่า "รหัสกรมบัญชีกลาง (CSMBS)" — แอปจึงแสดงเป็น CSMBS ตามบรรทัดรหัส',
    'BILLGRCS 15 ไม่ใช่หมวดที่กิจกรรม PP ใช้ตามปกติ (ส่วนใหญ่ใช้ 18) ควรตรวจสอบก่อนส่ง',
  ],
  70: ['BILLGRCS 13 (ทันตกรรม) คู่กับ CODESYS 008 (ICD-10-TM) ยังไม่อยู่ในตาราง lookup ที่อนุญาต (คู่มือหมายเหตุไว้เอง)'],
  71: ['เงื่อนไขกำหนด ICD-10 Z121 แต่ตัวอย่างชุดเบิกใช้ Z130 / Z108'],
  76: ['เงื่อนไขกำหนด ICD-10 Z207 แต่ตัวอย่างชุดเบิกใช้ Z115'],
  92: ['เงื่อนไขกำหนด ICD-10 Z258 แต่ตัวอย่างชุดเบิกใช้ Z235'],
  97: ['BILLGRCS 13 (ทันตกรรม) คู่กับ CODESYS 008 (ICD-10-TM) ยังไม่อยู่ในตาราง lookup ที่อนุญาต (คู่มือหมายเหตุไว้เอง)'],
}
