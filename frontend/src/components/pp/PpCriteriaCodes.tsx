import { useEffect, useState } from 'react'
import type { PpActivity } from '../../data/ppActivities'
import { PP_TARGET_LABELS, codesForTarget, type PpMapTarget } from '../../data/ppCodeTargets'
import { checkPpCodes, type PpCodeCheck } from '../../services/ppMappingApi'

/** The code types whose meaning comes from nhso_adp_code; others have nothing to look up here. */
const MEANING_TARGETS: PpMapTarget[] = ['csmbs', 'nhso']

/** The activity's criteria codes with their meaning, shown under "รหัสที่ใช้". */
export function PpCriteriaCodes({ activity }: { activity: PpActivity }) {
  const [groups, setGroups] = useState<{ target: PpMapTarget; checks: PpCodeCheck[] }[]>()

  useEffect(() => {
    let stale = false
    setGroups(undefined)
    const targets = MEANING_TARGETS.filter(t => codesForTarget(activity, t).length > 0)
    Promise.all(targets.map(async target => ({ target, checks: await checkPpCodes(target, codesForTarget(activity, target)) })))
      .then(result => { if (!stale) setGroups(result) })
      .catch(() => { if (!stale) setGroups([]) })
    return () => { stale = true }
  }, [activity])

  if (!groups || groups.length === 0) return null

  return (
    <section className="px-6 py-4 border-b border-gray-100">
      <details open className="text-xs">
        <summary className="text-sm font-bold text-gray-700 cursor-pointer">รหัสตามเกณฑ์ของกิจกรรมนี้</summary>
        <div className="mt-2 space-y-2">
          {groups.map(g => (
            <div key={g.target}>
              {groups.length > 1 && <p className="font-semibold text-gray-600 mb-0.5">{PP_TARGET_LABELS[g.target]}</p>}
              <dl className="max-h-40 overflow-y-auto grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5">
                {g.checks.map(c => (
                  <div key={c.code} className="contents">
                    <dt className="font-mono text-gray-800">{c.code}</dt>
                    <dd className={c.name ? 'text-gray-700' : 'text-gray-400'}>{c.name ?? 'ไม่พบความหมายใน nhso_adp_code'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}
