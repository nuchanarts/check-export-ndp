import { PP_ACTIVITIES } from '../src/data/ppActivities'
import { PP_RPST, RPST_LEVELS, type RpstLevel } from '../src/data/ppRpstCapability'
import { filterByRpst, keepSelection, lookupCode, rpstCounts, searchPp } from '../src/data/ppRulesUtils'

const nos = (list: { no: number }[]) => list.map(a => a.no)

describe('PP_RPST', () => {
  it('assesses every activity 1..104, each with a reason', () => {
    expect(Object.keys(PP_RPST).map(Number).sort((a, b) => a - b)).toEqual(PP_ACTIVITIES.map(a => a.no))
    expect(Object.values(PP_RPST).filter(r => !r.reason.trim())).toEqual([])
  })

  it('keeps the totals of the assessment workbook', () => {
    expect(rpstCounts(PP_ACTIVITIES)).toEqual({ yes: 30, conditional: 26, no: 48 })
  })

  it('has a label for every level', () => {
    const levels = new Set<RpstLevel>(Object.values(PP_RPST).map(r => r.level))
    expect(new Set(RPST_LEVELS.map(l => l.level))).toEqual(levels)
  })
})

describe('filterByRpst', () => {
  it('returns the same list for "all"', () => {
    expect(filterByRpst(PP_ACTIVITIES, 'all')).toBe(PP_ACTIVITIES)
  })

  it('keeps only the chosen level', () => {
    expect(nos(filterByRpst(PP_ACTIVITIES, 'yes'))).toContain(1)
    expect(nos(filterByRpst(PP_ACTIVITIES, 'yes'))).not.toContain(2)
    expect(nos(filterByRpst(PP_ACTIVITIES, 'conditional'))).toContain(2)
    expect(nos(filterByRpst(PP_ACTIVITIES, 'no'))).toContain(4)
  })

  it('narrows search results and keeps their order', () => {
    const found = searchPp('104')
    const filtered = filterByRpst(found, 'yes')
    expect(filtered[0].no).toBe(104)
    expect(filtered.every(a => PP_RPST[a.no].level === 'yes')).toBe(true)
  })

  it('counts only the list it is given', () => {
    const list = PP_ACTIVITIES.filter(a => [1, 2, 4].includes(a.no))
    expect(rpstCounts(list)).toEqual({ yes: 1, conditional: 1, no: 1 })
  })
})

describe('the filter with the rest of the page', () => {
  it('moves the selection when the open activity is filtered out', () => {
    const visible = filterByRpst(PP_ACTIVITIES, 'yes')
    expect(keepSelection(visible, 4)).toBe(visible[0].no)
  })

  it('lists only visible activities in the code lookup', () => {
    const code = PP_ACTIVITIES.find(a => a.no === 1)!.codes[0].code
    const visible = filterByRpst(PP_ACTIVITIES, 'no')
    const hits = lookupCode(code, visible)
    expect(hits.every(h => PP_RPST[h.activity.no].level === 'no')).toBe(true)
  })
})
