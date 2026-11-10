// Integration tests for /api/pp-mapping: search, code-check and the manual save path.
import request from 'supertest'

const mockQuery = jest.fn()
jest.mock('../../src/db', () => ({ query: (...a: unknown[]) => mockQuery(...a) }))

import { _resetEnsureForTest } from '../../src/services/auditService'
import { signToken } from '../../src/services/auth'
import app from '../../src/index'

const sqlOf = (filter: string) =>
  mockQuery.mock.calls.filter(([sql]: [string]) => typeof sql === 'string' && sql.includes(filter))
const updates = () => sqlOf('UPDATE ')
const auditRows = () => sqlOf('INSERT INTO `bgs_mapping_audit`')

/** Answers SELECTs by shape so tests state only what matters. */
function db({ current = null as string | null, found = true, master = true, price = 140 as number | null, affected = 1 } = {}) {
  mockQuery.mockImplementation(async (sql: string, params: string[] = []) => {
    if (sql.startsWith('UPDATE ')) return { rows: { affectedRows: affected }, rowCount: 0 }
    if (/AS current_val/.test(sql)) {
      return found ? { rows: [{ current_val: current, current_price: price }], rowCount: 1 } : { rows: [], rowCount: 0 }
    }
    if (/AS master_code/.test(sql)) {
      return master ? { rows: [{ master_code: params[0], master_name: 'ชื่อ' }], rowCount: 1 } : { rows: [], rowCount: 0 }
    }
    return { rows: [], rowCount: 0 }
  })
}

beforeEach(() => {
  mockQuery.mockReset()
  _resetEnsureForTest()
})

describe('GET /api/pp-mapping/search', () => {
  it('searches a whitelisted target with bound params', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '3001671', name: 'Anti HIV(screening)', price: 140, current_val: '36351', active_val: 'Y' }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/pp-mapping/search').query({ target: 'csmbs', q: 'HIV' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ code: '3001671', name: 'Anti HIV(screening)', price: 140, current: '36351', active: true }])
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('FROM `nondrugitems`')
    expect(sql).toContain('LIMIT 50')
    expect(sql).not.toContain('HIV')
    expect(params).toContain('%HIV%')
  })

  it('hides inactive items by default', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/search').query({ target: 'tmlt', q: 'CBC' })
    expect(mockQuery.mock.calls[0][0]).toContain("`active_status` <> 'N'")
  })

  it('shows inactive items when asked', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/search').query({ target: 'tmlt', q: 'CBC', includeInactive: '1' })
    expect(mockQuery.mock.calls[0][0]).not.toContain("<> 'N'")
  })

  it('escapes the escape character itself', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/search').query({ target: 'csmbs', q: 'a|b' })
    expect(mockQuery.mock.calls[0][1]).toContain('%a||b%')
  })

  it('escapes LIKE wildcards', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/search').query({ target: 'csmbs', q: "50%_'" })
    expect(mockQuery.mock.calls[0][0]).toContain("ESCAPE '|'")
    expect(mockQuery.mock.calls[0][1]).toContain("%50|%|_'%")
  })

  it('compares text as utf8mb4 because the connection charset is tis620', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/search').query({ target: 'icd9', q: 'เย็บ' })
    const sql = mockQuery.mock.calls[0][0]
    expect(sql).toContain('CONVERT(`name` USING utf8mb4) LIKE CONVERT(CONVERT(? USING binary) USING utf8mb4)')
    expect(sql).toContain('CONVERT(`er_oper_code` USING utf8mb4) LIKE CONVERT(CONVERT(? USING binary) USING utf8mb4)')
  })

  it('searches drugs for checking', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    const res = await request(app).get('/api/pp-mapping/search').query({ target: 'tmt', q: 'วัคซีน' })
    expect(res.status).toBe(200)
    expect(mockQuery.mock.calls[0][0]).toContain('`sks_drug_code` AS current_val')
  })

  it('rejects an unknown target', async () => {
    const res = await request(app).get('/api/pp-mapping/search').query({ target: 'users', q: 'abc' })
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects a one-letter query', async () => {
    const res = await request(app).get('/api/pp-mapping/search').query({ target: 'csmbs', q: 'a' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/pp-mapping/coverage', () => {
  it('lists the codes active items already hold, per target', async () => {
    mockQuery.mockImplementation(async (sql: string) => ({
      rows: sql.includes('`billcode`') ? [{ code: '36350' }, { code: '36351' }] : [],
      rowCount: 0,
    }))
    const res = await request(app).get('/api/pp-mapping/coverage')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ csmbs: ['36350', '36351'], nhso: [], tmlt: [], icd9: [], icd10tm: [], tmt: [] })
  })

  it('reads every target, drugs included, from active rows only', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/coverage')
    const sqls = mockQuery.mock.calls.map(([sql]: [string]) => sql)
    expect(sqls).toHaveLength(6)
    expect(sqls.some((s: string) => s.includes('`sks_drug_code`') && s.includes('FROM `drugitems`'))).toBe(true)
    expect(sqls.every((s: string) => s.includes("<> 'N'"))).toBe(true)
  })

  it('writes nothing', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/coverage')
    expect(updates()).toHaveLength(0)
  })
})

describe('GET /api/pp-mapping/mapped', () => {
  it('lists active items holding one of the codes, with bound params', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ code: '3001671', name: 'Anti HIV(screening)', price: 140, current_val: '36351', active_val: 'Y' }],
      rowCount: 1,
    })
    const res = await request(app).get('/api/pp-mapping/mapped').query({ target: 'csmbs', codes: '36350,36351' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ code: '3001671', name: 'Anti HIV(screening)', price: 140, current: '36351', active: true }])
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('FROM `nondrugitems`')
    expect(sql).toContain('`billcode` IN (?, ?)')
    expect(sql).toContain("`istatus` <> 'N'")
    expect(sql).not.toContain('36350')
    expect(params).toEqual(['36350', '36351'])
  })

  it('reads drugs too', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await request(app).get('/api/pp-mapping/mapped').query({ target: 'tmt', codes: '123' })
    expect(mockQuery.mock.calls[0][0]).toContain('`sks_drug_code` IN (?)')
  })

  it('asks the database nothing without codes', async () => {
    const res = await request(app).get('/api/pp-mapping/mapped').query({ target: 'csmbs', codes: '' })
    expect(res.body).toEqual([])
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects an unknown target', async () => {
    const res = await request(app).get('/api/pp-mapping/mapped').query({ target: 'users', codes: '1' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/pp-mapping/code-check', () => {
  it('reports codes found and missing in the master table', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ master_code: '8878', master_name: 'ULTRASOUND' }], rowCount: 1 })
    const res = await request(app).get('/api/pp-mapping/code-check').query({ target: 'icd9', codes: '8878,7510' })
    expect(res.body).toEqual([
      { code: '8878', name: 'ULTRASOUND', exists: true },
      { code: '7510', name: null, exists: false },
    ])
    expect(mockQuery.mock.calls[0][0]).toContain('FROM `icd9cm1`')
  })

  it('looks up the meaning of CSMBS codes in nhso_adp_code', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ master_code: '36350', master_name: 'Anti-HIV' }], rowCount: 1 })
    const res = await request(app).get('/api/pp-mapping/code-check').query({ target: 'csmbs', codes: '36350,DOW_HSEND' })
    expect(res.body).toEqual([
      { code: '36350', name: 'Anti-HIV', exists: true },
      { code: 'DOW_HSEND', name: null, exists: false },
    ])
    expect(mockQuery.mock.calls[0][0]).toContain('FROM `nhso_adp_code`')
  })
})

describe('PUT /api/pp-mapping/:target/:code', () => {
  const save = (target: string, code: string, body: object) =>
    request(app).put(`/api/pp-mapping/${target}/${code}`).send(body)

  it('saves billcode only', async () => {
    db({ current: '38999' })
    const res = await save('csmbs', '3001671', { value: '36351', expected: '38999' })
    expect(res.status).toBe(200)
    expect(updates()).toHaveLength(1)
    expect(updates()[0][0]).toContain('UPDATE `nondrugitems` SET `billcode` = ? WHERE `icode` = ?')
    expect(updates()[0][1].slice(0, 2)).toEqual(['36351', '3001671'])
  })

  it('saves nhso_adp_code only', async () => {
    db({ current: null })
    await save('nhso', '3001671', { value: '30015', expected: null })
    expect(updates()[0][0]).toContain('UPDATE `nondrugitems` SET `nhso_adp_code` = ? WHERE `icode` = ?')
  })

  it('allows an NHSO code missing from nhso_adp_code', async () => {
    db({ current: null, master: false })
    const res = await save('nhso', '3001671', { value: 'TSH_ENBS', expected: null })
    expect(res.status).toBe(200)
    expect(updates()).toHaveLength(1)
  })

  it('rejects a code outside the manual', async () => {
    db()
    const res = await save('csmbs', '3001671', { value: '99999', expected: null })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('CODE_NOT_ALLOWED')
    expect(updates()).toHaveLength(0)
  })

  it('rejects a blocked code', async () => {
    db()
    const res = await save('csmbs', '3001671', { value: 'DOW_ LOGIS', expected: null })
    expect(res.body.error).toBe('CODE_NOT_ALLOWED')
  })

  it.each(['DOW_HSEND', 'DOW_LOGIS', 'S04'])('saves %s to billcode', async value => {
    db({ current: null })
    const res = await save('csmbs', '3001671', { value, expected: null })
    expect(res.status).toBe(200)
    expect(updates()[0][1][0]).toBe(value)
  })

  it('saves a CSMBS code that has no meaning in nhso_adp_code', async () => {
    db({ current: null, master: false })
    const res = await save('csmbs', '3001671', { value: 'DOW_HSEND', expected: null })
    expect(res.status).toBe(200)
  })

  it.each([
    ['tmlt', '300105'],
    ['icd9', '7510'],
    ['icd10tm', '2377020'],
  ])('saves a %s code from the manual that is missing from its table', async (target, value) => {
    db({ master: false })
    const res = await save(target, '12', { value, expected: null })
    expect(res.status).toBe(200)
    expect(updates()[0][1][0]).toBe(value)
  })

  it('rejects a stale write', async () => {
    db({ current: '36350' })
    const res = await save('csmbs', '3001671', { value: '36351', expected: '38999' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('STALE_VALUE')
    expect(updates()).toHaveLength(0)
  })

  it('guards the write itself against a concurrent edit', async () => {
    db({ current: '38999' })
    await save('csmbs', '3001671', { value: '36351', expected: '38999' })
    expect(updates()[0][0]).toContain('AND CONVERT(`billcode` USING utf8mb4) = CONVERT(CONVERT(? USING binary) USING utf8mb4)')
    expect(updates()[0][1]).toEqual(['36351', '3001671', '38999'])
  })

  it('guards an empty value against a concurrent edit', async () => {
    db({ current: null })
    await save('csmbs', '3001671', { value: '36351', expected: null })
    expect(updates()[0][0]).toContain("AND (`billcode` IS NULL OR `billcode` = '')")
  })

  it('reports a write lost to a concurrent edit and records nothing', async () => {
    db({ current: '38999', affected: 0 })
    const res = await save('csmbs', '3001671', { value: '36351', expected: '38999' })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('STALE_VALUE')
    expect(auditRows()).toHaveLength(0)
  })

  it('treats NULL and empty as the same expected value', async () => {
    db({ current: null })
    const res = await save('csmbs', '3001671', { value: '36351', expected: '' })
    expect(res.status).toBe(200)
  })

  it('returns 404 for an unknown item', async () => {
    db({ found: false })
    const res = await save('csmbs', 'nope', { value: '36351', expected: null })
    expect(res.status).toBe(404)
    expect(updates()).toHaveLength(0)
  })

  it('never writes for drugs', async () => {
    db()
    const res = await save('tmt', '1000001', { value: '695803', expected: null })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('READ_ONLY_TARGET')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('records an audit row under the registry category', async () => {
    db({ current: '38999' })
    await save('csmbs', '3001671', { value: '36351', expected: '38999' })
    const params = auditRows()[0][1]
    expect(params.slice(0, 6)).toEqual(['eclaim', 'eclaim-charge', '3001671', 'std_code_e0', '38999', '36351'])
  })

  it('audits ICD-9 under the basic registry', async () => {
    db({ current: null })
    await save('icd9', '5', { value: '8878', expected: null })
    expect(auditRows()[0][1].slice(0, 4)).toEqual(['basic', 'procedure', '5', 'std_code'])
  })
})

describe('PUT /api/pp-mapping with a price update', () => {
  // Activity 13 has one CSMBS/NHSO code: 36003 at 50 baht. Activity 2 is a bundle.
  const save = (target: string, body: object) =>
    request(app).put(`/api/pp-mapping/${target}/3000001`).send(body)

  it('updates code and price in one statement', async () => {
    db({ current: null, price: 140 })
    const res = await save('csmbs', { value: '36003', expected: null, price: { activityNo: 13, expected: 140 } })
    expect(res.status).toBe(200)
    expect(updates()).toHaveLength(1)
    expect(updates()[0][0]).toContain('UPDATE `nondrugitems` SET `billcode` = ?, `price` = ? WHERE `icode` = ?')
    expect(updates()[0][1].slice(0, 3)).toEqual(['36003', 50, '3000001'])
  })

  it('takes the price from the rule, not from the request', async () => {
    db({ current: null, price: 140 })
    await save('csmbs', { value: '36003', expected: null, price: { activityNo: 13, expected: 140, value: 9999 } })
    expect(updates()[0][1].slice(0, 3)).toEqual(['36003', 50, '3000001'])
  })

  it('leaves the price alone when not asked', async () => {
    db({ current: null })
    await save('csmbs', { value: '36003', expected: null })
    expect(updates()[0][0]).toContain('UPDATE `nondrugitems` SET `billcode` = ? WHERE `icode` = ?')
    expect(updates()[0][0]).not.toContain('`price`')
  })

  it('refuses a price update for a bundled activity', async () => {
    db({ current: null })
    const res = await save('csmbs', { value: '36350', expected: null, price: { activityNo: 2, expected: 140 } })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('PRICE_NOT_ALLOWED')
    expect(updates()).toHaveLength(0)
  })

  it('refuses a price update when the code is not the rule code', async () => {
    db({ current: null })
    const res = await save('csmbs', { value: '36350', expected: null, price: { activityNo: 13, expected: 140 } })
    expect(res.body.error).toBe('PRICE_NOT_ALLOWED')
  })

  it('refuses a price update outside nondrugitems', async () => {
    db({ current: null })
    const res = await save('tmlt', { value: '300105', expected: null, price: { activityNo: 13, expected: 140 } })
    expect(res.body.error).toBe('PRICE_NOT_ALLOWED')
    expect(updates()).toHaveLength(0)
  })

  it('rejects a stale price', async () => {
    db({ current: null, price: 200 })
    const res = await save('csmbs', { value: '36003', expected: null, price: { activityNo: 13, expected: 140 } })
    expect(res.status).toBe(409)
    expect(updates()).toHaveLength(0)
  })

  it('audits the price apart from the mapping category so undo keeps working', async () => {
    db({ current: null, price: 140 })
    await save('csmbs', { value: '36003', expected: null, price: { activityNo: 13, expected: 140 } })
    const rows = auditRows().map(([, params]: [string, unknown[]]) => params.slice(0, 6))
    expect(rows).toContainEqual(['eclaim', 'pp-price', '3000001', 'price', '140', '50'])
    expect(rows).toContainEqual(['eclaim', 'eclaim-charge', '3000001', 'std_code_e0', null, '36003'])
  })
})

describe('auth', () => {
  const saved = { secret: process.env['AUTH_SECRET'], users: process.env['AUTH_USERS'] }
  afterEach(() => {
    if (saved.secret === undefined) delete process.env['AUTH_SECRET']
    else process.env['AUTH_SECRET'] = saved.secret
    if (saved.users === undefined) delete process.env['AUTH_USERS']
    else process.env['AUTH_USERS'] = saved.users
  })

  it('refuses a viewer', async () => {
    process.env['AUTH_SECRET'] = 'test-secret'
    process.env['AUTH_USERS'] = JSON.stringify([{ u: 'v', p: 'p', role: 'viewer' }])
    const token = signToken({ u: 'v', role: 'viewer', exp: Date.now() + 60_000 }, 'test-secret')
    db()
    const res = await request(app)
      .put('/api/pp-mapping/csmbs/3001671')
      .set('Authorization', `Bearer ${token}`)
      .send({ value: '36351', expected: null })
    expect(res.status).toBe(403)
    expect(updates()).toHaveLength(0)
  })
})
