import { PP_ACTIVITIES, type PpCodeKind } from '../src/data/ppActivities'
import { PP_SERVICE_NOTE, codesForTarget, coverageOf, filterByCoverage, priceRuleOf, routeOf, statusOf, toCoverage } from '../src/data/ppCodeTargets'

const c = (code: string, kind: PpCodeKind) => ({ code, kind })

describe('routeOf', () => {
  it('routes each kind', () => {
    expect(routeOf(c('Z340', 'ICD10'))).toBe('service')
    expect(routeOf(c('8878', 'ICD9'))).toBe('icd9')
    expect(routeOf(c('2377020', 'ICD10TM'))).toBe('icd10tm')
    expect(routeOf(c('36350', 'CSMBS'))).toBe('csmbs')
    expect(routeOf(c('30015', 'NHSO'))).toBe('nhso')
    expect(routeOf(c('300105', 'TMLT'))).toBe('tmlt')
    expect(routeOf(c('695803', 'TMT'))).toBe('tmt')
  })

  it('moves misfiled codes', () => {
    for (const x of ['350057', '381003', '381004', '300124', '300058', '300035', '300034', '320352', '320404', '320371', '320226'])
      expect(routeOf(c(x, 'CSMBS'))).toBe('tmlt')
    for (const x of ['2277320', '2330011', '2330013']) expect(routeOf(c(x, 'ICD9'))).toBe('icd10tm')
  })

  it('blocks the misprint with a space, because DOW_LOGIS is offered beside it', () => {
    expect(routeOf(c('DOW_ LOGIS', 'CSMBS'))).toBe('blocked')
  })

  it('sends unusual codes to billcode, as the owner asked', () => {
    for (const x of ['DOW_HSEND', 'DOW_LOGIS', 'S04']) expect(routeOf(c(x, 'CSMBS'))).toBe('csmbs')
  })

  it('every catalog code has a route', () => {
    expect(PP_ACTIVITIES.flatMap(a => a.codes).filter(x => x.kind === 'OTHER')).toEqual([])
  })
})

describe('statusOf', () => {
  it('compares the current value with the allowed codes', () => {
    expect(statusOf('36350', ['36350'])).toBe('match')
    expect(statusOf('38999', ['36350'])).toBe('mismatch')
    expect(statusOf(null, ['36350'])).toBe('empty')
    expect(statusOf(undefined, ['36350'])).toBe('empty')
    expect(statusOf('  ', ['36350'])).toBe('empty')
  })
})

describe('codesForTarget', () => {
  it('uses the corrected route', () => {
    const a2 = PP_ACTIVITIES.find(a => a.no === 2)!
    expect(codesForTarget(a2, 'tmlt')).toContain('350057')
    expect(codesForTarget(a2, 'csmbs')).not.toContain('350057')
  })

  it('lists each code once', () => {
    const a = PP_ACTIVITIES.find(x => x.no === 2)!
    const codes = codesForTarget(a, 'csmbs')
    expect(new Set(codes).size).toBe(codes.length)
  })
})

describe('PP_SERVICE_NOTE', () => {
  it('tells staff where to record the diagnosis', () => {
    expect(PP_SERVICE_NOTE).toBe('ลงรหัสนี้ที่เมนูการวินิจฉัย จึงจะเบิกได้')
  })
})

describe('priceRuleOf', () => {
  const activity = (no: number) => PP_ACTIVITIES.find(a => a.no === no)!

  it('gives the price of an activity with one CSMBS or NHSO code', () => {
    expect(priceRuleOf(activity(13))).toEqual({ code: '36003', price: 50 })
  })

  it('gives nothing for a bundled activity', () => {
    expect(priceRuleOf(activity(2))).toBeNull()
  })

  it('gives nothing for an activity priced at zero', () => {
    expect(priceRuleOf({ price: 0, codes: [{ code: '36003', kind: 'CSMBS' }] })).toBeNull()
  })

  it('counts CSMBS and NHSO codes together', () => {
    const codes = [{ code: '36003', kind: 'CSMBS' }, { code: '30015', kind: 'NHSO' }]
    expect(priceRuleOf({ price: 50, codes })).toBeNull()
  })

  it('covers the 34 single-code activities less any priced at zero', () => {
    const rules = PP_ACTIVITIES.filter(a => priceRuleOf(a))
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.length).toBeLessThanOrEqual(34)
  })
})

describe('coverageOf', () => {
  const a = (codes: { code: string; kind: PpCodeKind }[]) => ({ codes })
  const have = (over = {}) => toCoverage({ csmbs: [], nhso: [], tmlt: [], icd9: [], icd10tm: [], tmt: [], ...over })
  const labs = a([c('36350', 'CSMBS'), c('36351', 'CSMBS'), c('300105', 'TMLT')])

  it('is done when every code type has at least one code in the system', () => {
    expect(coverageOf(labs, have({ csmbs: ['36351'], tmlt: ['300105'] }))).toEqual({
      level: 'done', missing: [], drugsMissing: false,
    })
  })

  it('is partial and names what is left', () => {
    expect(coverageOf(labs, have({ csmbs: ['36350'] }))).toEqual({
      level: 'partial', missing: ['tmlt'], drugsMissing: false,
    })
  })

  it('is none when no code type has a code', () => {
    expect(coverageOf(labs, have()).level).toBe('none')
  })

  it('leaves drugs out of the level and flags them apart', () => {
    const mixed = a([c('36350', 'CSMBS'), c('695803', 'TMT')])
    expect(coverageOf(mixed, have({ csmbs: ['36350'] }))).toEqual({
      level: 'done', missing: [], drugsMissing: true,
    })
  })

  it('does not flag drugs that are in the system', () => {
    const drug = a([c('695803', 'TMT')])
    expect(coverageOf(drug, have({ tmt: ['695803'] })).drugsMissing).toBe(false)
  })

  it('has nothing to count for ICD-10 or drug-only activities', () => {
    expect(coverageOf(a([c('Z340', 'ICD10')]), have()).level).toBe('na')
    expect(coverageOf(a([c('695803', 'TMT')]), have()).level).toBe('na')
  })

  it('ignores padding around stored codes', () => {
    expect(coverageOf(a([c('36350', 'CSMBS')]), have({ csmbs: [' 36350 '] })).level).toBe('done')
  })
})

describe('filterByCoverage', () => {
  const have = toCoverage({ csmbs: ['36350'] })
  const levelOf = (a: (typeof PP_ACTIVITIES)[number]) => coverageOf(a, have).level

  it('keeps everything for "all" and before coverage loads', () => {
    expect(filterByCoverage(PP_ACTIVITIES, have, 'all')).toHaveLength(PP_ACTIVITIES.length)
    expect(filterByCoverage(PP_ACTIVITIES, undefined, 'none')).toHaveLength(PP_ACTIVITIES.length)
  })

  it('keeps one level', () => {
    const shown = filterByCoverage(PP_ACTIVITIES, have, 'partial')
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.every(a => levelOf(a) === 'partial')).toBe(true)
  })

  it('treats incomplete as partial plus none, never na', () => {
    const shown = filterByCoverage(PP_ACTIVITIES, have, 'incomplete')
    const expected = PP_ACTIVITIES.filter(a => ['partial', 'none'].includes(levelOf(a)))
    expect(shown).toEqual(expected)
  })
})
