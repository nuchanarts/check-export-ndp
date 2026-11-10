import { PP_ACTIVITIES } from '../src/data/ppActivities'

const byNo = (no: number) => PP_ACTIVITIES.find(a => a.no === no)!

describe('PP catalog integrity', () => {
  it('holds all 104 activities numbered 1..104 in order', () => {
    expect(PP_ACTIVITIES.map(a => a.no)).toEqual(Array.from({ length: 104 }, (_, i) => i + 1))
  })

  it('gives every activity a title, a numeric price and a page', () => {
    for (const a of PP_ACTIVITIES) {
      expect(a.title.trim().length).toBeGreaterThan(3)
      expect(Number.isFinite(a.price)).toBe(true)
      expect(a.price).toBeGreaterThanOrEqual(0)
      expect(a.pageStart).toBeGreaterThanOrEqual(11)
    }
  })

  it('gives every activity condition text and at least one code', () => {
    for (const a of PP_ACTIVITIES) {
      expect(a.conditions.length).toBeGreaterThan(0)
      expect(a.codes.length).toBeGreaterThan(0)
    }
  })

  it('stores JSON text that round-trips to the parsed JSON', () => {
    for (const a of PP_ACTIVITIES) expect(JSON.parse(a.jsonText)).toEqual(a.json)
  })
})

describe('PP catalog golden values', () => {
  it('activity 2 is the first lab set at 600 baht with its CSMBS and TMLT codes', () => {
    const a = byNo(2)
    expect(a.price).toBe(600)
    expect(a.codes).toContainEqual({ code: '36350', kind: 'CSMBS', billgrcs: '07', codesys: '004' })
    expect(a.codes).toContainEqual({ code: '300105', kind: 'TMLT', billgrcs: '07', codesys: '002' })
  })

  it('activity 23 totals 1300 baht', () => {
    expect(byNo(23).price).toBe(1300)
  })

  it('activity 65 keeps the Bangkok note', () => {
    expect(byNo(65).priceNote).toContain('กรุงเทพมหานคร')
  })

  it('activity 104 lists 36350 and 351233', () => {
    const codes = byNo(104).codes.map(c => c.code)
    expect(codes).toEqual(expect.arrayContaining(['36350', '351233']))
  })
})
