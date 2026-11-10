import { useEffect, useState } from 'react'

const STEPS: { icon: string; title: string; detail: string }[] = [
  { icon: '🎯', title: 'กรองงานที่ต้องทำ', detail: 'ตัวกรองข้อมูล: กด "ยังไม่สมบูรณ์" · ใช้ร่วมกับศักยภาพ รพ.สต. และช่องค้นหาได้' },
  { icon: '📂', title: 'เลือกกิจกรรม', detail: 'เลือกหมวด แล้วเลือกกิจกรรม · สลับมุมมองแนวตั้ง/แนวนอนได้ที่ "มุมมองรายการ"' },
  { icon: '🔎', title: 'ดูว่าขาดอะไร', detail: 'ใต้หัวข้อ "ตั้งค่ารหัสตามเกณฑ์" บรรทัด "ยังไม่ได้ตั้ง" บอกชนิดรหัสที่ขาด' },
  { icon: '⌨️', title: 'ค้นหารายการ รพ.', detail: 'กดแท็บชนิดรหัสนั้น แล้วพิมพ์ชื่อหรือรหัสอย่างน้อย 2 ตัว ระบบค้นให้เอง' },
  { icon: '✅', title: 'เลือกรหัสตามคู่มือ', detail: 'กด "เลือก" ที่รายการ · ราคาไม่ตรงเกณฑ์: Yes = ปรับราคาด้วย, No = ปรับเฉพาะรหัส' },
  { icon: '💾', title: 'กดบันทึก', detail: 'มีค่าเดิม: ตรวจ "เปลี่ยนค่าจาก … เป็น …" แล้วกดยืนยัน' },
  { icon: '🏁', title: 'ตรวจผล', detail: 'สรุป "ในระบบ HIS แล้ว" มีรายการเพิ่ม และขึ้น "ตั้งครบทุกชนิดรหัสแล้ว"' },
]

const CAUTIONS = [
  'รหัสที่บันทึกมีผลกับรายการนั้นทั้งระบบ ไม่ใช่เฉพาะกิจกรรม PP',
  'บันทึกทีละรายการ เลือกได้เฉพาะรหัสตามคู่มือ',
  'ICD-10 ลงที่เมนูการวินิจฉัย ไม่ได้ตั้งที่หน้านี้',
  'ยา/วัคซีนตรวจได้อย่างเดียว ไม่ตรง: แจ้งปรับรหัสใน Drug Catalog ก่อน แล้วจึงปรับในระบบ',
]

/** A button that opens the how-to as a dialog. `onStart` jumps straight to the unfinished work. */
export function PpSop({ onStart }: { onStart?: () => void }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white border border-white/50 bg-white/10 shadow-sm hover:bg-white/25 hover:border-white transition"
      >
        <span className="relative flex w-2 h-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-75 animate-ping" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-sky-300" />
        </span>
        📘 SOP การใช้งาน
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="SOP การใช้งาน"
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl text-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative rounded-t-2xl bg-gradient-to-r from-blue-700 to-indigo-600 px-6 py-5 text-white">
              <p className="text-sm text-white/80">คู่มือการใช้งาน</p>
              <h2 className="text-xl font-bold mt-0.5">ตั้งรหัสให้ครบใน 7 ขั้นตอน พร้อมส่งออก NDP</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="ปิดคู่มือ"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-5">
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="relative rounded-xl border border-blue-100 bg-blue-50/50 p-4 hover:border-blue-300 hover:shadow-sm transition">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-xl" aria-hidden="true">{s.icon}</span>
                    </div>
                    <p className="mt-2 font-bold text-gray-900">{s.title}</p>
                    <p className="mt-1 text-xs text-gray-600 leading-relaxed">{s.detail}</p>
                  </li>
                ))}
              </ol>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-amber-900">⚠ ข้อควรรู้</p>
                <ul className="mt-1 grid gap-x-6 gap-y-1 sm:grid-cols-2 text-xs text-amber-900 list-disc pl-5">
                  {CAUTIONS.map(c => <li key={c}>{c}</li>)}
                </ul>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                >
                  ปิด
                </button>
                {onStart && (
                  <button
                    onClick={() => { setOpen(false); onStart() }}
                    className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700"
                  >
                    🚀 เริ่มเก็บงานที่ยังไม่สมบูรณ์
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
