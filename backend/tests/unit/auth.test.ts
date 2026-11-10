import { authConfig, checkLogin } from '../../src/services/auth'

const saved = { secret: process.env['AUTH_SECRET'], users: process.env['AUTH_USERS'] }

function setEnv(secret?: string, users?: string) {
  if (secret === undefined) delete process.env['AUTH_SECRET']
  else process.env['AUTH_SECRET'] = secret
  if (users === undefined) delete process.env['AUTH_USERS']
  else process.env['AUTH_USERS'] = users
}

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => {
  setEnv(saved.secret, saved.users)
  jest.restoreAllMocks()
})

const valid = JSON.stringify([{ u: 'admin', p: 'pw', role: 'editor' }])

describe('authConfig', () => {
  it('is off when neither is set', () => {
    setEnv()
    expect(authConfig().enabled).toBe(false)
  })

  it('is on with valid settings', () => {
    setEnv('s3cret', valid)
    const cfg = authConfig()
    expect(cfg.enabled).toBe(true)
    expect(cfg.users).toHaveLength(1)
  })

  it.each([
    ['bad JSON', 's3cret', '[{u:admin'],
    ['an empty list', 's3cret', '[]'],
    ['a user without a role', 's3cret', JSON.stringify([{ u: 'admin', p: 'pw' }])],
    ['users but no secret', undefined, valid],
    ['a secret but no users', 's3cret', undefined],
  ])('locks saving on %s', (_label, secret, users) => {
    setEnv(secret, users)
    const cfg = authConfig()
    expect(cfg.enabled).toBe(true)
    expect(cfg.users).toHaveLength(0)
    expect(cfg.secret).not.toBe('')
  })
})

describe('checkLogin when locked', () => {
  it('lets nobody in', () => {
    setEnv('s3cret', 'not json')
    const cfg = authConfig()
    expect(checkLogin(cfg.users, 'admin', 'pw')).toBeNull()
  })
})
