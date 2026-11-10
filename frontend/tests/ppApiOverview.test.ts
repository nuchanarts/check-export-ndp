import {
  API_BASES,
  API_ENDPOINTS,
  API_HEADERS,
  SIGN_ON_STEPS,
  STD_FILES,
  BILLGRCS_TABLE,
  CODESYS_LABELS,
  RECORD_STATUS,
  COMMON_ERRORS,
} from '../src/data/ppApiOverview'

describe('13Plus API overview content', () => {
  it('lists UAT and production bases over https', () => {
    expect(API_BASES.map(b => b.env)).toEqual(['UAT', 'Production'])
    for (const b of API_BASES) expect(b.url).toMatch(/^https:\/\//)
  })

  it('lists the five endpoints under /stddataset/api/v2', () => {
    expect(API_ENDPOINTS).toHaveLength(5)
    for (const e of API_ENDPOINTS) expect(e.path.startsWith('/stddataset/api/v2/')).toBe(true)
  })

  it('lists the request headers and five sign-on steps', () => {
    expect(API_HEADERS.map(h => h.name)).toEqual(['Request-id', 'Authorization', 'x-source-id', 'x-sourceid-key', 'x-fdh-key'])
    expect(SIGN_ON_STEPS).toHaveLength(5)
  })

  it('lists the 15 files of 13F+ numbered 1..15', () => {
    expect(STD_FILES.map(f => f.no)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1))
  })

  it('lists BILLGRCS 01..19, each with at least one allowed CODESYS that has a label', () => {
    expect(BILLGRCS_TABLE.map(r => r.billgrcs)).toEqual(
      Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, '0')),
    )
    const known = new Set(CODESYS_LABELS.map(c => c.codesys))
    for (const r of BILLGRCS_TABLE) {
      expect(r.codesys.length).toBeGreaterThan(0)
      for (const c of r.codesys) expect(known.has(c)).toBe(true)
    }
  })

  it('lists record statuses 0..8 and the common error codes', () => {
    expect(RECORD_STATUS.map(s => s.status)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(COMMON_ERRORS.map(e => e.code)).toEqual(['P118', 'S110', 'S111', 'S112', 'M102', 'R103', 'L1xx'])
  })
})
