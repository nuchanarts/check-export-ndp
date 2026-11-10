/**
 * Search, check and save for the code setup panel in the PP manual menu.
 *
 * Tables and columns come only from PP_TARGETS, never from a request. Each saved
 * change is audited under a registry category so the existing history and undo work.
 * Drug codes (`tmt`) have no `audit` entry, which is what makes them read-only.
 */
import { query } from '../db'
import { AppError } from '../middleware/errorHandler'
import { recordMappingChange } from './auditService'
import { PP_ALLOWED_CODES, PP_PRICE_RULES, type PpWritableTarget } from './ppAllowedCodes'

export type PpTarget = PpWritableTarget | 'tmt'

interface TargetDef {
  table: string
  pk: string
  name: string
  price: string
  /** Column holding the code. */
  col: string
  active: string
  audit?: { registry: 'basic' | 'eclaim'; category: string; field: string }
  /** Gives a code its meaning. A code from the manual may be saved even when missing here. */
  master?: { table: string; code: string; name: string }
}

const STALE_MESSAGE = 'มีผู้แก้ไขรายการนี้ไปแล้ว กรุณาค้นหาใหม่'

export const PP_TARGETS: Record<PpTarget, TargetDef> = {
  csmbs: {
    table: 'nondrugitems', pk: 'icode', name: 'name', price: 'price', col: 'billcode', active: 'istatus',
    audit: { registry: 'eclaim', category: 'eclaim-charge', field: 'std_code_e0' },
    master: { table: 'nhso_adp_code', code: 'nhso_adp_code', name: 'nhso_adp_code_name' },
  },
  nhso: {
    table: 'nondrugitems', pk: 'icode', name: 'name', price: 'price', col: 'nhso_adp_code', active: 'istatus',
    audit: { registry: 'eclaim', category: 'eclaim-charge', field: 'std_code' },
    master: { table: 'nhso_adp_code', code: 'nhso_adp_code', name: 'nhso_adp_code_name' },
  },
  tmlt: {
    table: 'lab_items', pk: 'lab_items_code', name: 'lab_items_name', price: 'service_price', col: 'tmlt_code',
    active: 'active_status',
    audit: { registry: 'eclaim', category: 'eclaim-lab-tmlt', field: 'std_code' },
    master: { table: 'lab_items_tmlt', code: 'tmlt_code', name: 'tmlt_name' },
  },
  icd9: {
    table: 'er_oper_code', pk: 'er_oper_code', name: 'name', price: 'price', col: 'icd9cm', active: 'active_status',
    audit: { registry: 'basic', category: 'procedure', field: 'std_code' },
    master: { table: 'icd9cm1', code: 'code', name: 'name' },
  },
  icd10tm: {
    table: 'dttm', pk: 'code', name: 'name', price: 'opd_price1', col: 'icd10tm_operation_code', active: 'active_status',
    audit: { registry: 'eclaim', category: 'eclaim-dental-tm', field: 'std_code' },
    master: { table: 'icd10tm_operation', code: 'icd10tm_operation_code', name: 'description_thai' },
  },
  tmt: { table: 'drugitems', pk: 'icode', name: 'name', price: 'unitprice', col: 'sks_drug_code', active: 'istatus' },
}

/** Asks to set the item's price to the activity's rule price; the price itself comes from PP_PRICE_RULES. */
export interface PpPriceUpdate {
  activityNo: number
  expected: number | null
}

export interface PpItem {
  code: string
  name: string
  price: number | null
  current: string | null
  active: boolean
}

export interface PpCodeCheck {
  code: string
  name: string | null
  exists: boolean
}

const q = (identifier: string) => `\`${identifier}\``

/**
 * The server sets the connection to tis620, but mysql2 sends UTF-8 bytes, so a Thai
 * parameter arrives garbled. Read the bytes as utf8mb4 and compare in utf8mb4.
 */
const textLike = (column: string) =>
  `CONVERT(${q(column)} USING utf8mb4) LIKE CONVERT(CONVERT(? USING binary) USING utf8mb4) ESCAPE '|'`
const textEquals = (column: string) =>
  `CONVERT(${q(column)} USING utf8mb4) = CONVERT(CONVERT(? USING binary) USING utf8mb4)`

/** Uses `|` with an explicit ESCAPE, so it also works under NO_BACKSLASH_ESCAPES. */
function escapeLike(text: string): string {
  return text.replace(/[|%_]/g, m => `|${m}`)
}

function isEmpty(value: string | null | undefined): boolean {
  return value === null || value === undefined || value === ''
}

export async function searchItems(target: PpTarget, text: string, includeInactive: boolean): Promise<PpItem[]> {
  const t = PP_TARGETS[target]
  const like = `%${escapeLike(text)}%`
  const active = includeInactive ? '' : ` AND (${q(t.active)} IS NULL OR ${q(t.active)} <> 'N')`
  const sql =
    `SELECT ${q(t.pk)} AS code, ${q(t.name)} AS name, ${q(t.price)} AS price, ` +
    `${q(t.col)} AS current_val, ${q(t.active)} AS active_val FROM ${q(t.table)} ` +
    `WHERE (${textLike(t.name)} OR ${textLike(t.pk)})${active} ORDER BY ${q(t.name)} LIMIT 50`
  const { rows } = await query(sql, [like, like])
  return rows.map(r => ({
    code: String(r.code),
    name: String(r.name ?? ''),
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    current: r.current_val === null || r.current_val === undefined ? null : String(r.current_val),
    active: r.active_val !== 'N',
  }))
}

/** The codes active items already hold, per target. Read-only; the page compares them with the manual. */
export async function coverage(): Promise<Record<PpTarget, string[]>> {
  const targets = Object.keys(PP_TARGETS) as PpTarget[]
  const lists = await Promise.all(targets.map(async target => {
    const t = PP_TARGETS[target]
    const { rows } = await query(
      `SELECT DISTINCT ${q(t.col)} AS code FROM ${q(t.table)} ` +
      `WHERE ${q(t.col)} IS NOT NULL AND ${q(t.col)} <> '' AND (${q(t.active)} IS NULL OR ${q(t.active)} <> 'N')`,
    )
    return rows.map(r => String(r.code))
  }))
  return Object.fromEntries(targets.map((target, i) => [target, lists[i]])) as Record<PpTarget, string[]>
}

export const MAPPED_LIMIT = 200

/** Active items whose code is one of `codes`: what the hospital has already mapped to an activity's criteria. */
export async function mappedItems(target: PpTarget, codes: string[]): Promise<PpItem[]> {
  if (codes.length === 0) return []
  const t = PP_TARGETS[target]
  const marks = codes.map(() => '?').join(', ')
  const sql =
    `SELECT ${q(t.pk)} AS code, ${q(t.name)} AS name, ${q(t.price)} AS price, ` +
    `${q(t.col)} AS current_val, ${q(t.active)} AS active_val FROM ${q(t.table)} ` +
    `WHERE ${q(t.col)} IN (${marks}) AND (${q(t.active)} IS NULL OR ${q(t.active)} <> 'N') ` +
    `ORDER BY ${q(t.col)}, ${q(t.name)} LIMIT ${MAPPED_LIMIT}`
  const { rows } = await query(sql, codes)
  return rows.map(r => ({
    code: String(r.code),
    name: String(r.name ?? ''),
    price: r.price === null || r.price === undefined ? null : Number(r.price),
    current: r.current_val === null || r.current_val === undefined ? null : String(r.current_val),
    active: true,
  }))
}

export async function checkCodes(target: PpTarget, codes: string[]): Promise<PpCodeCheck[]> {
  const master = PP_TARGETS[target].master
  if (!master || codes.length === 0) return codes.map(code => ({ code, name: null, exists: true }))
  const marks = codes.map(() => '?').join(', ')
  const sql =
    `SELECT ${q(master.code)} AS master_code, ${q(master.name)} AS master_name FROM ${q(master.table)} ` +
    `WHERE ${q(master.code)} IN (${marks})`
  const { rows } = await query(sql, codes)
  const names = new Map(rows.map(r => [String(r.master_code), r.master_name as string | null]))
  return codes.map(code => ({ code, name: names.get(code) ?? null, exists: names.has(code) }))
}

export async function saveCode(
  target: PpTarget,
  code: string,
  value: string,
  expected: string | null | undefined,
  actor: string,
  priceUpdate?: PpPriceUpdate,
): Promise<void> {
  const t = PP_TARGETS[target]
  if (target === 'tmt' || !t.audit) {
    throw new AppError(400, 'READ_ONLY_TARGET', 'รหัสยา/วัคซีนแก้จากเมนูนี้ไม่ได้ ให้แจ้งปรับรหัสใน Drug Catalog ก่อน แล้วจึงปรับในระบบ')
  }
  if (!PP_ALLOWED_CODES[target].includes(value)) {
    throw new AppError(400, 'CODE_NOT_ALLOWED', `รหัส ${value} ไม่อยู่ในเกณฑ์ตามคู่มือ`)
  }
  const rule = priceUpdate ? PP_PRICE_RULES[priceUpdate.activityNo] : undefined
  if (priceUpdate && (t.table !== 'nondrugitems' || rule?.code !== value)) {
    throw new AppError(400, 'PRICE_NOT_ALLOWED', 'กิจกรรมนี้เทียบราคารายการเดียวไม่ได้')
  }

  const priceSelect = rule ? `, ${q(t.price)} AS current_price` : ''
  const { rows } = await query(
    `SELECT ${q(t.col)} AS current_val${priceSelect} FROM ${q(t.table)} WHERE ${q(t.pk)} = ?`,
    [code],
  )
  if (rows.length === 0) throw new AppError(404, 'NOT_FOUND', `ไม่พบรายการ: ${code}`)
  const raw = rows[0].current_val
  const current = raw === null || raw === undefined ? null : String(raw)
  const unchanged = isEmpty(current) ? isEmpty(expected) : current === expected
  const rawPrice = rows[0].current_price
  const currentPrice = rawPrice === null || rawPrice === undefined ? null : Number(rawPrice)
  if (!unchanged || (rule && currentPrice !== (priceUpdate?.expected ?? null))) {
    throw new AppError(409, 'STALE_VALUE', STALE_MESSAGE)
  }

  // The WHERE repeats the values just read, so a concurrent edit makes this match no row.
  const setPrice = rule ? `, ${q(t.price)} = ?` : ''
  const setParams = rule ? [value, rule.price] : [value]
  const codeGuard = isEmpty(current) ? `(${q(t.col)} IS NULL OR ${q(t.col)} = '')` : textEquals(t.col)
  const codeParams = isEmpty(current) ? [] : [current as string]
  const priceGuard = !rule ? '' : currentPrice === null ? ` AND ${q(t.price)} IS NULL` : ` AND ${q(t.price)} = ?`
  const priceParams = rule && currentPrice !== null ? [currentPrice] : []
  const result = await query(
    `UPDATE ${q(t.table)} SET ${q(t.col)} = ?${setPrice} WHERE ${q(t.pk)} = ? AND ${codeGuard}${priceGuard}`,
    [...setParams, code, ...codeParams, ...priceParams],
  )
  // For a write, mysql2 hands back its result header where query() puts rows.
  if ((result.rows as unknown as { affectedRows?: number }).affectedRows === 0) {
    throw new AppError(409, 'STALE_VALUE', STALE_MESSAGE)
  }

  await recordMappingChange({
    registry: t.audit.registry,
    category: t.audit.category,
    code,
    field: t.audit.field,
    oldValue: current,
    newValue: value,
    actor,
  })
  if (rule) {
    // Its own category: undo reverts the newest row of a category, and it cannot revert a price.
    await recordMappingChange({
      registry: 'eclaim',
      category: 'pp-price',
      code,
      field: 'price',
      oldValue: currentPrice === null ? null : String(currentPrice),
      newValue: String(rule.price),
      actor,
    })
  }
}
