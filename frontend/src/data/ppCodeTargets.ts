/** Helpers for setting up the PP manual's codes; the routing rules are in scripts/nhso/ppCodeRoutes. */
import type { PpActivity } from './ppActivities'
import { priceRuleOf, routeOf, type PpMapTarget } from '../../../scripts/nhso/ppCodeRoutes'

export { priceRuleOf, routeOf }
export type { PpMapTarget }
export type { PpCodeRoute, PpPriceRule } from '../../../scripts/nhso/ppCodeRoutes'
export type MapStatus = 'match' | 'mismatch' | 'empty'
export type CoverageLevel = 'done' | 'partial' | 'none' | 'na'

/** The codes active items already hold, per target. */
export type PpCoverage = Record<PpMapTarget, Set<string>>

export interface ActivityCoverage {
  level: CoverageLevel
  /** Code types with no code in the system yet. */
  missing: PpMapTarget[]
  /** Drugs are left out of `level`: they cannot be changed here and need a report to NHSO first. */
  drugsMissing: boolean
}

export const PP_SERVICE_NOTE = 'ลงรหัสนี้ที่เมนูการวินิจฉัย จึงจะเบิกได้'

export const PP_PRICE_EFFECT_NOTE = 'ราคาใหม่จะมีผลกับการบันทึกหลังจากอัปเดตเท่านั้น ไม่รวมรายการที่เคยบันทึกไปแล้ว'

export const PP_TARGET_LABELS: Record<PpMapTarget, string> = {
  csmbs: 'CSMBS (กรมบัญชีกลาง)',
  nhso: 'รหัส สปสช.',
  tmlt: 'TMLT (Lab)',
  icd9: 'ICD-9-CM',
  icd10tm: 'ICD-10-TM ทันตกรรม',
  tmt: 'TMT (ยา/วัคซีน)',
}

/** The activity's codes for this target, each once, in manual order. */
export function codesForTarget(activity: PpActivity, target: PpMapTarget): string[] {
  return [...new Set(activity.codes.filter(c => routeOf(c) === target).map(c => c.code))]
}

const COUNTED_TARGETS: PpMapTarget[] = ['csmbs', 'nhso', 'tmlt', 'icd9', 'icd10tm']

export function toCoverage(data: Partial<Record<PpMapTarget, string[]>>): PpCoverage {
  const set = (target: PpMapTarget) => new Set((data[target] ?? []).map(code => code.trim()))
  return {
    csmbs: set('csmbs'), nhso: set('nhso'), tmlt: set('tmlt'), icd9: set('icd9'), icd10tm: set('icd10tm'), tmt: set('tmt'),
  }
}

/**
 * How far an activity is set up. The manual offers alternatives ("เลือก 1 รหัส") and never
 * names items, so a code type counts once any one of its codes is in the system.
 */
export function coverageOf(activity: Pick<PpActivity, 'codes'>, have: PpCoverage): ActivityCoverage {
  const codesOf = (target: PpMapTarget) => activity.codes.filter(c => routeOf(c) === target).map(c => c.code)
  const present = (target: PpMapTarget) => codesOf(target).some(code => have[target].has(code))

  const counted = COUNTED_TARGETS.filter(t => codesOf(t).length > 0)
  const missing = counted.filter(t => !present(t))
  const drugsMissing = codesOf('tmt').length > 0 && !present('tmt')

  if (counted.length === 0) return { level: 'na', missing, drugsMissing }
  if (missing.length === 0) return { level: 'done', missing, drugsMissing }
  return { level: missing.length === counted.length ? 'none' : 'partial', missing, drugsMissing }
}

export function statusOf(current: string | null | undefined, allowed: string[]): MapStatus {
  const value = (current ?? '').trim()
  if (!value) return 'empty'
  return allowed.includes(value) ? 'match' : 'mismatch'
}

/** Which activities to show by how far their codes are set in the system. */
export type CoverageFilter = 'all' | 'incomplete' | Exclude<CoverageLevel, 'na'>

/**
 * Keep the activities matching `filter`. 'incomplete' = some or none set.
 * Activities with nothing settable here ('na') only show under 'all'.
 * Without coverage yet, nothing is filtered.
 */
export function filterByCoverage<T extends Pick<PpActivity, 'codes'>>(
  activities: T[],
  have: PpCoverage | undefined,
  filter: CoverageFilter,
): T[] {
  if (filter === 'all' || !have) return activities
  return activities.filter(a => {
    const level = coverageOf(a, have).level
    return filter === 'incomplete' ? level === 'partial' || level === 'none' : level === filter
  })
}
