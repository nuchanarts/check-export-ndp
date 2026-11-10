import { useEffect, useState } from 'react'
import type { PpActivity } from '../../data/ppActivities'
import { PP_TARGET_LABELS, codesForTarget, type PpMapTarget } from '../../data/ppCodeTargets'
import { PP_MAPPED_LIMIT, fetchPpMapped, type PpItem } from '../../services/ppMappingApi'

type Loaded = { target: PpMapTarget; items: PpItem[] }[]

/** What the hospital has already set to a code inside this activity's criteria, per code type. */
export function PpMappedSummary({ activity, targets, run }: {
  activity: PpActivity
  targets: PpMapTarget[]
  /** Bumped after each save so the summary reloads. */
  run: number
}) {
  const [loaded, setLoaded] = useState<Loaded>()
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let stale = false
    setFailed(false)
    Promise.all(targets.map(async target => ({
      target,
      items: await fetchPpMapped(target, codesForTarget(activity, target)),
    })))
      .then(result => { if (!stale) setLoaded(result) })
      .catch(() => { if (!stale) setFailed(true) })
    return () => { stale = true }
  }, [activity, targets, run, retry])

  const total = loaded?.reduce((n, g) => n + g.items.length, 0) ?? 0
  const missing = loaded?.filter(g => g.items.length === 0).map(g => g.target) ?? []
  const missingSettable = missing.filter(t => t !== 'tmt')

  return (
    <div className="mb-4 pb-3 border-b border-blue-200">
      <h4 className="text-sm font-bold text-gray-800">
        สรุปรายการในระบบที่ตั้งรหัสตรงเกณฑ์ในระบบ HIS แล้ว
        {loaded && <span className="ml-1.5 text-emerald-700 tabular-nums">{total} รายการ</span>}
      </h4>

      {failed && (
        <p className="text-sm text-red-700 mt-1">
          ดึงสรุปไม่สำเร็จ
          <button onClick={() => setRetry(r => r + 1)} className="ml-2 underline">ลองอีกครั้ง</button>
        </p>
      )}
      {!loaded && !failed && <p className="text-sm text-gray-500 mt-1">กำลังโหลด…</p>}
      {loaded && total === 0 && <p className="text-sm text-gray-500 mt-1">ยังไม่มีรายการที่ตั้งรหัสตรงเกณฑ์</p>}

      {loaded && missing.length === 0 && (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mt-2">
          ตั้งครบทุกชนิดรหัสแล้ว
        </p>
      )}
      {loaded && missing.length > 0 && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
          <b>ยังไม่ได้ตั้ง:</b> {missing.map(t => PP_TARGET_LABELS[t]).join(', ')}
          {missingSettable.length > 0 && (
            <span className="text-xs"> · กดแท็บ {missingSettable.map(t => PP_TARGET_LABELS[t]).join(', ')} ด้านบน แล้วค้นหาและบันทึกรหัส</span>
          )}
          {missing.includes('tmt') && (
            <span className="text-xs"> · ยา/วัคซีน: แจ้งปรับรหัสใน Drug Catalog ก่อน แล้วจึงปรับในระบบ</span>
          )}
        </p>
      )}

      {loaded && total > 0 && (
        <div className="overflow-auto max-h-60 mt-2 border border-gray-200 rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 sticky top-0">
              <tr>
                <th className="text-left font-semibold px-3 py-2">ชนิดรหัส</th>
                <th className="text-left font-semibold px-3 py-2">รหัสรายการ</th>
                <th className="text-left font-semibold px-3 py-2">ชื่อ</th>
                <th className="text-left font-semibold px-3 py-2">รหัสที่ตั้ง</th>
                <th className="text-right font-semibold px-3 py-2">ราคา</th>
              </tr>
            </thead>
            <tbody>
              {loaded.flatMap(g => g.items.map((item, i) => (
                <tr key={`${g.target}-${item.code}`} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                    {i === 0 ? `${PP_TARGET_LABELS[g.target]} (${g.items.length})` : ''}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-1.5">{item.name}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-emerald-800">{item.current}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{item.price?.toLocaleString() ?? '-'}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
      {loaded?.some(g => g.items.length >= PP_MAPPED_LIMIT) && (
        <p className="text-xs text-gray-500 mt-1">บางชนิดแสดงเพียง {PP_MAPPED_LIMIT} รายการแรก</p>
      )}
    </div>
  )
}
