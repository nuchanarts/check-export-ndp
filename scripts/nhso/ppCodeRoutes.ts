/**
 * Where each code printed in the PP manual goes when staff set it up.
 * The catalog keeps the manual's labels as printed, so codes the manual files under
 * the wrong heading are corrected here.
 *
 * Kept in scripts/ because buildPpCatalog.ts needs it too, and ts-node cannot load
 * files from the ESM frontend package.
 */
export type PpMapTarget = 'csmbs' | 'nhso' | 'tmlt' | 'icd9' | 'icd10tm' | 'tmt'
export type PpCodeRoute = PpMapTarget | 'service' | 'blocked'

/** Six-digit TMLT codes printed under CSMBS; all of them exist in lab_items_tmlt. */
const TMLT_UNDER_CSMBS = new Set([
  '350057', '381003', '381004', '300124', '300058', '300035', '300034', '320352', '320404', '320371', '320226',
])

/** Seven-digit dental codes printed under ICD-9. */
const DENTAL_UNDER_ICD9 = new Set(['2277320', '2330011', '2330013'])

/**
 * A misprint of DOW_LOGIS. Saving it would store the space, and the correct code is offered beside it.
 * Other unusual codes (DOW_HSEND, DOW_LOGIS, S04) go to billcode as printed, as the owner asked.
 */
const NOT_CSMBS = new Set(['DOW_ LOGIS'])

export function routeOf(code: { code: string; kind: string }): PpCodeRoute {
  switch (code.kind) {
    case 'ICD10': return 'service'
    case 'ICD9': return DENTAL_UNDER_ICD9.has(code.code) ? 'icd10tm' : 'icd9'
    case 'ICD10TM': return 'icd10tm'
    case 'TMLT': return 'tmlt'
    case 'NHSO': return 'nhso'
    case 'TMT': return 'tmt'
    case 'CSMBS':
      if (TMLT_UNDER_CSMBS.has(code.code)) return 'tmlt'
      return NOT_CSMBS.has(code.code) ? 'blocked' : 'csmbs'
    default: return 'blocked'
  }
}

export interface PpPriceRule {
  code: string
  price: number
}

/**
 * The manual prices activities, not items. Only an activity with a single CSMBS or
 * NHSO code can be compared with one item's price; anything else is a bundle.
 */
export function priceRuleOf(activity: {
  price: number
  codes: { code: string; kind: string }[]
}): PpPriceRule | null {
  if (activity.price <= 0) return null
  const codes = new Set(
    activity.codes
      .filter(c => {
        const route = routeOf(c)
        return route === 'csmbs' || route === 'nhso'
      })
      .map(c => c.code),
  )
  if (codes.size !== 1) return null
  return { code: [...codes][0], price: activity.price }
}
