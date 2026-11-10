import { PP_ACTIVITIES } from '../src/data/ppActivities'
import { PP_CATEGORIES, PP_WARNINGS } from '../src/data/ppActivityMeta'
import {
  searchPp,
  lookupCode,
  buildPpTree,
  categoryOf,
  groupCodes,
  keepSelection,
  KIND_ORDER,
} from '../src/data/ppRulesUtils'

const nos = (list: { no: number }[]) => list.map(a => a.no)

describe('PP_CATEGORIES / PP_WARNINGS', () => {
  it('put every activity 1..104 in exactly one category', () => {
    const all = PP_CATEGORIES.flatMap(c => c.nos).sort((a, b) => a - b)
    expect(all).toEqual(Array.from({ length: 104 }, (_, i) => i + 1))
  })

  it('use unique category keys', () => {
    const keys = PP_CATEGORIES.map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('warn wherever the JSON pairs a 6-digit TMLT code with CODESYS 004 (CSMBS)', () => {
    // Staff copy BILLGRCS/CODESYS from the chips; a TMLT code shown as CODESYS 004
    // without a warning would send them the wrong pairing.
    const unflagged = PP_ACTIVITIES.filter(
      a =>
        (a.json.chad ?? []).some(c => c.CODESYS === '004' && /^\d{6}$/.test(String(c.STDCODE))) &&
        !PP_WARNINGS[a.no],
    ).map(a => a.no)
    expect(unflagged).toEqual([])
  })

  it('only warn about activities that exist', () => {
    for (const no of Object.keys(PP_WARNINGS).map(Number)) {
      expect(PP_ACTIVITIES.some(a => a.no === no)).toBe(true)
      expect(PP_WARNINGS[no].length).toBeGreaterThan(0)
    }
  })
})

describe('searchPp', () => {
  it('returns everything for an empty or blank query', () => {
    expect(searchPp('')).toHaveLength(104)
    expect(searchPp('   ')).toHaveLength(104)
  })

  it('finds activities by code, ignoring case and surrounding spaces', () => {
    const hits = nos(searchPp(' z130 '))
    expect(hits.length).toBeGreaterThan(3)
    expect(hits).toEqual(expect.arrayContaining([6, 12, 69]))
  })

  it('finds activities by Thai words in the title or conditions', () => {
    expect(nos(searchPp('ฝากครรภ์'))).toContain(1)
    expect(nos(searchPp('วัคซีน'))).toEqual(expect.arrayContaining([78, 80]))
  })

  it('puts the activity whose number matches exactly first', () => {
    const hits = searchPp('104')
    expect(hits[0].no).toBe(104)
    expect(hits.length).toBeGreaterThan(1) // codes such as 30104 also contain "104"
  })

  it('returns nothing for text that is nowhere in the manual', () => {
    expect(searchPp('ไม่มีคำนี้แน่นอน-xyz')).toEqual([])
  })
})

describe('lookupCode', () => {
  it('finds every activity that uses an exact code, with its BILLGRCS/CODESYS', () => {
    const hits = lookupCode('36350')
    expect(hits.map(h => h.activity.no)).toEqual([2, 3, 104])
    expect(hits[0].code).toEqual({ code: '36350', kind: 'CSMBS', billgrcs: '07', codesys: '004' })
  })

  it('ignores case and spaces', () => {
    expect(lookupCode(' z130 ').length).toBeGreaterThan(3)
  })

  it('does not match partial codes', () => {
    expect(lookupCode('3635')).toEqual([])
    expect(lookupCode('')).toEqual([])
  })
})

describe('buildPpTree', () => {
  it('holds all 104 activities in category order when nothing is filtered', () => {
    const tree = buildPpTree(PP_ACTIVITIES)
    expect(tree.map(c => c.key)).toEqual(PP_CATEGORIES.map(c => c.key))
    expect(tree.reduce((n, c) => n + c.count, 0)).toBe(104)
  })

  it('drops categories with no visible activity', () => {
    const tree = buildPpTree(PP_ACTIVITIES.filter(a => a.no === 104))
    expect(tree).toHaveLength(1)
    expect(tree[0].items.map(a => a.no)).toEqual([104])
    expect(tree[0].count).toBe(1)
  })

  it('keeps manual order inside a category', () => {
    const oral = buildPpTree(PP_ACTIVITIES).find(c => c.key === 'oral')!
    expect(nos(oral.items)).toEqual([51, 70, 97])
  })
})

describe('categoryOf', () => {
  it('names the category of an activity', () => {
    expect(categoryOf(104)?.nos).toContain(104)
    expect(categoryOf(999)).toBeUndefined()
  })
})

describe('groupCodes', () => {
  it('groups codes by kind in display order and skips empty kinds', () => {
    const groups = groupCodes([
      { code: '36350', kind: 'CSMBS', billgrcs: '07', codesys: '004' },
      { code: 'Z340', kind: 'ICD10' },
      { code: '300105', kind: 'TMLT', billgrcs: '07', codesys: '002' },
    ])
    expect(groups.map(g => g.kind)).toEqual(['ICD10', 'TMLT', 'CSMBS'])
    expect(KIND_ORDER.indexOf('ICD10')).toBeLessThan(KIND_ORDER.indexOf('TMLT'))
  })

  it('handles an activity whose codes carry no BILLGRCS (diagnosis only)', () => {
    const a1 = PP_ACTIVITIES.find(a => a.no === 1)!
    const groups = groupCodes(a1.codes)
    expect(groups.map(g => g.kind)).toEqual(['ICD10'])
    expect(groups[0].codes.every(c => c.billgrcs === undefined)).toBe(true)
  })
})

describe('keepSelection', () => {
  it('keeps the selection while it is still visible', () => {
    expect(keepSelection(PP_ACTIVITIES.slice(0, 5), 3)).toBe(3)
  })

  it('moves to the first result when the selection is filtered out', () => {
    expect(keepSelection(PP_ACTIVITIES.slice(10, 12), 3)).toBe(11)
  })

  it('leaves the selection alone when there are no results', () => {
    expect(keepSelection([], 3)).toBe(3)
  })

  it('jumps to the activity whose number the query names, even if the selection is still visible', () => {
    // Activity 1's text contains "50", so it stays in the results for this query.
    const results = searchPp('50')
    expect(results.some(a => a.no === 1)).toBe(true)
    expect(keepSelection(results, 1, ' 50 ')).toBe(50)
  })

  it('ignores a query that is not an activity number', () => {
    expect(keepSelection(PP_ACTIVITIES, 1, 'Z130')).toBe(1)
    expect(keepSelection(PP_ACTIVITIES, 1, '999')).toBe(1)
  })
})
