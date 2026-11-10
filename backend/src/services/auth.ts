/**
 * F9 — Lightweight opt-in auth service (pure, no side effects).
 *
 * Auth is DISABLED when AUTH_SECRET is not set or AUTH_USERS is empty/unset.
 * When disabled every function behaves as a no-op / open-pass so existing tests
 * and no-auth deployments keep working with zero changes.
 *
 * Token format: base64url(json) + '.' + hmac-sha256-hex(base64url(json), secret)
 * No new npm deps — uses Node built-in `crypto`.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenPayload {
  u: string
  role: string
  exp: number
}

export interface UserEntry {
  u: string
  p: string
  role: string
}

export interface AuthConfig {
  enabled: boolean
  secret: string
  users: UserEntry[]
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function toBase64Url(s: string): string {
  return Buffer.from(s, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function hmacHex(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Sign a payload and return a token string.
 * Format: `<base64url(json)>.<hmac-sha256-hex>`
 */
export function signToken(payload: TokenPayload, secret: string): string {
  const header = toBase64Url(JSON.stringify(payload))
  const sig = hmacHex(header, secret)
  return `${header}.${sig}`
}

/**
 * Verify a token string.
 * Returns the parsed payload when valid and not expired, null otherwise.
 * Uses a timing-safe comparison to resist timing attacks.
 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const dot = token.indexOf('.')
    if (dot < 1) return null

    const header = token.slice(0, dot)
    const sigProvided = token.slice(dot + 1)

    const sigExpected = hmacHex(header, secret)

    // Constant-time comparison — pad to equal length if needed
    const a = Buffer.from(sigExpected, 'utf8')
    const b = Buffer.from(sigProvided.padEnd(sigExpected.length, ' '), 'utf8')
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null

    const json = Buffer.from(header, 'base64').toString('utf8')
    const payload = JSON.parse(json) as TokenPayload

    if (typeof payload.u !== 'string' || typeof payload.role !== 'string' || typeof payload.exp !== 'number') {
      return null
    }

    if (Date.now() > payload.exp) return null

    return payload
  } catch {
    return null
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

function isUserEntry(value: unknown): value is UserEntry {
  const v = value as Partial<UserEntry> | null
  return !!v && typeof v.u === 'string' && v.u !== '' && typeof v.p === 'string' && v.p !== ''
    && typeof v.role === 'string' && v.role !== ''
}

function parseUsers(raw: string): UserEntry[] | null {
  try {
    const users: unknown = JSON.parse(raw)
    return Array.isArray(users) && users.length > 0 && users.every(isUserEntry) ? users : null
  } catch {
    return null
  }
}

/** A secret nobody knows, so no token verifies against it. Made once per process. */
const LOCKED_SECRET = randomBytes(32).toString('hex')
let warnedLocked = false

/**
 * Read auth configuration from environment variables.
 * - Neither AUTH_SECRET nor AUTH_USERS set: auth is off and saving is open (a deliberate no-login setup).
 * - Both set and valid: auth is on.
 * - Anything else (one missing, bad JSON, a user without u/p/role): auth is ON with no users,
 *   so nobody can log in and every save is refused. A typo must never open saving to everyone.
 * Never throws.
 */
export function authConfig(): AuthConfig {
  const secret = process.env['AUTH_SECRET'] ?? ''
  const rawUsers = process.env['AUTH_USERS'] ?? ''

  if (!secret && !rawUsers) {
    return { enabled: false, secret: '', users: [] }
  }

  const users = secret ? parseUsers(rawUsers) : null
  if (users) return { enabled: true, secret, users }

  if (!warnedLocked) {
    warnedLocked = true
    console.error('[auth] AUTH_SECRET / AUTH_USERS incomplete or invalid — saving is locked until they are fixed')
  }
  return { enabled: true, secret: LOCKED_SECRET, users: [] }
}

// ─── Login check ──────────────────────────────────────────────────────────────

/**
 * Check credentials against the users list.
 * Returns { u, role } on success, null on failure.
 * Plain-text password comparison (LAN-grade; sufficient for this tool).
 */
export function checkLogin(users: UserEntry[], u: string, p: string): { u: string; role: string } | null {
  const found = users.find(entry => entry.u === u && entry.p === p)
  if (!found) return null
  return { u: found.u, role: found.role }
}
