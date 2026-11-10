/**
 * Pure helpers for the PP manual browser (PpManualPage).
 * Kept apart from the generated catalog so they can be unit-tested.
 */
import { PP_ACTIVITIES, type PpActivity, type PpCode, type PpCodeKind } from './ppActivities'
import { PP_CATEGORIES, type PpCategory } from './ppActivityMeta'
import { PP_RPST, type RpstLevel } from './ppRpstCapability'

function haystack(a: PpActivity): string {
  return [a.title, a.subtitle, a.priceNote ?? '', a.conditions, a.examples, ...a.codes.map(c => c.code)]
    .join('\n')
    .toLowerCase()
}

/**
 * Search number, title, subtitle, conditions, examples and codes. An empty query
 * returns everything. An activity whose number equals the query comes first;
 * the rest keep manual order.
 */
export function searchPp(query: string, list: PpActivity[] = PP_ACTIVITIES): PpActivity[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const hits = list.filter(a => String(a.no) === q || haystack(a).includes(q))
  const exact = hits.filter(a => String(a.no) === q)
  return [...exact, ...hits.filter(a => String(a.no) !== q)]
}

/** Keep the activities at this รพ.สต. level, in the order given. */
export function filterByRpst(list: PpActivity[], level: RpstLevel | 'all'): PpActivity[] {
  if (level === 'all') return list
  return list.filter(a => PP_RPST[a.no]?.level === level)
}

/** How many of these activities sit at each รพ.สต. level. */
export function rpstCounts(list: PpActivity[]): Record<RpstLevel, number> {
  const counts: Record<RpstLevel, number> = { yes: 0, conditional: 0, no: 0 }
  for (const a of list) {
    const level = PP_RPST[a.no]?.level
    if (level) counts[level]++
  }
  return counts
}

export interface CodeHit {
  activity: PpActivity
  code: PpCode
}

/** Activities that use exactly this code (case-insensitive), with the BILLGRCS/CODESYS each one uses. */
export function lookupCode(query: string, list: PpActivity[] = PP_ACTIVITIES): CodeHit[] {
  const q = query.trim().toUpperCase()
  if (!q) return []
  const hits: CodeHit[] = []
  for (const activity of list) {
    for (const code of activity.codes) {
      if (code.code.toUpperCase() === q) hits.push({ activity, code })
    }
  }
  return hits
}

export interface PpTreeCategory {
  key: string
  label: string
  icon: string
  count: number
  items: PpActivity[]
}

/** Group the visible activities by category, in category order; empty categories are dropped. */
export function buildPpTree(visible: PpActivity[]): PpTreeCategory[] {
  const shown = new Map(visible.map(a => [a.no, a]))
  return PP_CATEGORIES.map(c => {
    const items = [...c.nos].sort((a, b) => a - b).flatMap(no => {
      const a = shown.get(no)
      return a ? [a] : []
    })
    return { key: c.key, label: c.label, icon: c.icon, count: items.length, items }
  }).filter(c => c.count > 0)
}

export function categoryOf(no: number): PpCategory | undefined {
  return PP_CATEGORIES.find(c => c.nos.includes(no))
}

export const KIND_ORDER: PpCodeKind[] = ['ICD10', 'ICD9', 'ICD10TM', 'TMLT', 'CSMBS', 'TMT', 'NHSO', 'OTHER']

export const KIND_LABELS: Record<PpCodeKind, string> = {
  ICD10: 'ICD-10',
  ICD9: 'ICD-9-CM',
  ICD10TM: 'ICD-10-TM',
  TMLT: 'TMLT (Lab)',
  CSMBS: 'CSMBS (กรมบัญชีกลาง)',
  TMT: 'TMT (ยา/วัคซีน)',
  NHSO: 'รหัส สปสช.',
  OTHER: 'อื่น ๆ',
}

/** Codes grouped by kind in KIND_ORDER; kinds with no codes are left out. */
export function groupCodes(codes: PpCode[]): { kind: PpCodeKind; codes: PpCode[] }[] {
  return KIND_ORDER.map(kind => ({ kind, codes: codes.filter(c => c.kind === kind) })).filter(
    g => g.codes.length > 0,
  )
}

/**
 * The activity to show for this search. A query that names an activity number opens
 * that activity; otherwise keep `selected` if it is still among the results, else
 * move to the first result.
 */
export function keepSelection(results: PpActivity[], selected: number, query = ''): number {
  const q = query.trim()
  const named = /^\d+$/.test(q) ? results.find(a => String(a.no) === q) : undefined
  if (named) return named.no
  if (!results.length || results.some(a => a.no === selected)) return selected
  return results[0].no
}
