import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { PpActivity } from '../../data/ppActivities'
import {
  PP_PRICE_EFFECT_NOTE,
  PP_TARGET_LABELS,
  codesForTarget,
  coverageOf,
  priceRuleOf,
  routeOf,
  statusOf,
  type MapStatus,
  type PpCoverage,
  type PpMapTarget,
} from '../../data/ppCodeTargets'
import {
  checkPpCodes,
  ppErrorMessage,
  savePpCode,
  searchPpItems,
  type PpCodeCheck,
  type PpItem,
} from '../../services/ppMappingApi'
import { PpMappedSummary } from './PpMappedSummary'

const TARGET_ORDER: PpMapTarget[] = ['csmbs', 'nhso', 'tmlt', 'icd9', 'icd10tm', 'tmt']

const FIELD_LABELS: Record<PpMapTarget, string> = {
  csmbs: 'nondrugitems.billcode',
  nhso: 'nondrugitems.nhso_adp_code',
  tmlt: 'lab_items.tmlt_code',
  icd9: 'er_oper_code.icd9cm',
  icd10tm: 'dttm.icd10tm_operation_code',
  tmt: 'drugitems.sks_drug_code',
}

const STATUS: Record<MapStatus, { label: string; style: string }> = {
  match: { label: 'ตรงเกณฑ์', style: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  mismatch: { label: 'ไม่ตรง', style: 'bg-red-50 text-red-800 border-red-200' },
  empty: { label: 'ยังว่าง', style: 'bg-gray-100 text-gray-600 border-gray-200' },
}

/** Pause after the last keystroke before searching. */
const TYPE_DELAY_MS = 400

/** Where a code is looked up. It may be saved when missing there, with a warning. CSMBS has no list of its own. */
const LOOKUP_TABLES: Partial<Record<PpMapTarget, string>> = {
  nhso: 'nhso_adp_code',
  tmlt: 'lab_items_tmlt',
  icd9: 'icd9cm1',
  icd10tm: 'icd10tm_operation',
}

export function PpCodeMapper({ activity, coverage, onSaved }: {
  activity: PpActivity
  coverage?: PpCoverage
  onSaved?: () => void
}) {
  const targets = useMemo(() => TARGET_ORDER.filter(t => codesForTarget(activity, t).length > 0), [activity])
  const blocked = [...new Set(activity.codes.filter(c => routeOf(c) === 'blocked').map(c => c.code))]

  const [target, setTarget] = useState<PpMapTarget | undefined>(targets[0])
  const [query, setQuery] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [items, setItems] = useState<PpItem[]>()
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string>()
  const [checks, setChecks] = useState<PpCodeCheck[]>()
  const [checkFailed, setCheckFailed] = useState(false)
  const [checkRun, setCheckRun] = useState(0)
  const [picked, setPicked] = useState<PpItem>()
  const [value, setValue] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [updatePrice, setUpdatePrice] = useState<boolean>()
  const [saveError, setSaveError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState<string>()
  const [saveCount, setSaveCount] = useState(0)
  const searchId = useRef(0)
  const lastSearch = useRef('')

  const allowed = useMemo(() => (target ? codesForTarget(activity, target) : []), [activity, target])
  const readOnly = target === 'tmt'
  const priceRule = useMemo(() => priceRuleOf(activity), [activity])
  const comparesPrice = target === 'csmbs' || target === 'nhso'
  const priceDiffers = comparesPrice && !!picked && priceRule?.code === value && picked.price !== priceRule.price
  const isBundle = comparesPrice && !priceRule && activity.price > 0

  useEffect(() => {
    if (!target || target === 'tmt') {
      setChecks(undefined)
      return
    }
    let stale = false
    setChecks(undefined)
    setCheckFailed(false)
    checkPpCodes(target, allowed)
      .then(result => { if (!stale) setChecks(result) })
      .catch(() => { if (!stale) setCheckFailed(true) })
    return () => { stale = true }
  }, [target, allowed, checkRun])

  function clearPick() {
    setPicked(undefined)
    setValue('')
    setConfirming(false)
    setUpdatePrice(undefined)
    setSaveError(undefined)
  }

  function chooseTarget(next: PpMapTarget) {
    searchId.current++
    lastSearch.current = ''
    setTarget(next)
    setItems(undefined)
    setSearching(false)
    setError(undefined)
    setSavedNote(undefined)
    clearPick()
  }

  async function search(e: FormEvent) {
    e.preventDefault()
    const text = query.trim()
    if (text.length < 2) {
      setError('พิมพ์คำค้นอย่างน้อย 2 ตัวอักษร')
      return
    }
    await runSearch(text)
  }

  // Search while typing, after a short pause. A search already run for the same
  // words is not repeated, so an item picked from it stays picked.
  useEffect(() => {
    const text = query.trim()
    if (!target || text.length < 2) return
    const timer = setTimeout(() => {
      if (lastSearch.current !== searchKey(text)) void runSearch(text)
    }, TYPE_DELAY_MS)
    return () => clearTimeout(timer)
    // runSearch reads the same state these deps cover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, target, includeInactive])

  function searchKey(text: string) {
    return `${target}|${includeInactive ? 1 : 0}|${text}`
  }

  async function runSearch(text: string) {
    if (!target) return
    lastSearch.current = searchKey(text)
    const id = ++searchId.current
    setSearching(true)
    setError(undefined)
    setSavedNote(undefined)
    clearPick()
    try {
      const found = await searchPpItems(target, text, includeInactive)
      if (id === searchId.current) setItems(found)
    } catch (err) {
      if (id === searchId.current) setError(ppErrorMessage(err))
    } finally {
      if (id === searchId.current) setSearching(false)
    }
  }

  async function save() {
    if (!target || !picked || !value) return
    setSaving(true)
    setSaveError(undefined)
    try {
      const newPrice = priceDiffers && updatePrice ? priceRule?.price : undefined
      await savePpCode(
        target,
        picked.code,
        value,
        picked.current,
        newPrice === undefined ? undefined : { activityNo: activity.no, expected: picked.price },
      )
      setItems(list => list?.map(i => (
        i.code === picked.code ? { ...i, current: value, price: newPrice ?? i.price } : i
      )))
      setSavedNote(
        `บันทึกแล้ว: ${picked.name} → ${value}` +
        (newPrice === undefined ? '' : ` ราคา ${newPrice.toLocaleString()} บาท · ${PP_PRICE_EFFECT_NOTE}`),
      )
      clearPick()
      setSaveCount(n => n + 1)
      onSaved?.()
    } catch (err) {
      setSaveError(ppErrorMessage(err))
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  function requestSave() {
    if (picked?.current?.trim()) setConfirming(true)
    else void save()
  }

  const chosenCheck = checks?.find(c => c.code === value)
  const status = coverage ? coverageOf(activity, coverage) : undefined

  return (
    <section className="mx-4 my-4 rounded-xl border-2 border-blue-500 bg-blue-50/40 px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <h3 className="text-base font-bold text-blue-800">⚙ ตั้งค่ารหัสตามเกณฑ์</h3>
        <p className="text-xs text-blue-900/80">ตั้งรหัสของรายการ รพ. ให้ตรงตามคู่มือที่นี่: เลือกแท็บชนิดรหัส → ค้นหา → เลือก → บันทึก</p>
      </div>

      {targets.length > 0 && <PpMappedSummary activity={activity} targets={targets} run={saveCount} />}

      {status?.drugsMissing && (
        <p className="text-sm bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 mb-3">
          ยา/วัคซีนยังไม่มีรหัสตรงเกณฑ์ (ระบบตรวจได้อย่างเดียว) หากต้องการแก้ไข ให้แจ้งปรับรหัสใน Drug Catalog ก่อน แล้วจึงปรับในระบบ
        </p>
      )}

      {blocked.length > 0 && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 mb-3">
          รหัส &quot;{blocked.join(', ')}&quot; ในคู่มือพิมพ์มีช่องว่าง จึงบันทึกไม่ได้ ให้เลือก DOW_LOGIS แทน
        </p>
      )}

      {!target && blocked.length === 0 && (
        <p className="text-sm text-gray-500">กิจกรรมนี้ไม่มีรหัสให้ตั้งที่หน้านี้</p>
      )}

      {target && (
        <>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="ชนิดรหัส">
            {targets.map(t => (
              <button
                key={t}
                role="tab"
                aria-selected={t === target}
                disabled={saving}
                onClick={() => chooseTarget(t)}
                className={`px-3 py-1 rounded-lg border text-[13px] font-medium ${
                  t === target ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {PP_TARGET_LABELS[t]}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            {readOnly ? 'เทียบกับ' : 'บันทึกลง'} <span className="font-mono">{FIELD_LABELS[target]}</span>
            {readOnly && ' · เช็กอย่างเดียว ไม่แก้ค่าในฐาน'}
          </p>

          <form onSubmit={search} className="flex flex-wrap items-center gap-2 mt-2">
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัสรายการ"
              aria-label="ค้นหารายการของ รพ."
              disabled={saving}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={searching || saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? 'กำลังค้นหา…' : 'ค้นหา'}
            </button>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
              แสดงรายการยกเลิก
            </label>
          </form>

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{error}</p>
          )}
          {savedNote && (
            <p role="status" className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-2">{savedNote}</p>
          )}

          {items && items.length === 0 && <p className="text-sm text-gray-500 mt-3">ไม่พบรายการ</p>}

          {items && items.length > 0 && (
            <div className="overflow-x-auto mt-3 border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">รหัสรายการ</th>
                    <th className="text-left font-semibold px-3 py-2">ชื่อ</th>
                    <th className="text-right font-semibold px-3 py-2">ราคา</th>
                    <th className="text-left font-semibold px-3 py-2">ค่าปัจจุบัน</th>
                    <th className="text-left font-semibold px-3 py-2">สถานะ</th>
                    {!readOnly && <th className="px-3 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const status = statusOf(item.current, allowed)
                    return (
                      <tr key={item.code} className={`border-t border-gray-100 ${picked?.code === item.code ? 'bg-blue-50' : ''}`}>
                        <td className="px-3 py-2 font-mono text-xs">{item.code}</td>
                        <td className="px-3 py-2">
                          {item.name}
                          {!item.active && <span className="ml-1 text-xs text-gray-500">(ยกเลิก)</span>}
                          {readOnly && status !== 'match' && (
                            <p className="text-xs text-red-700 mt-0.5">รหัสยา/วัคซีนไม่ตรง ให้แจ้งปรับรหัสใน Drug Catalog ก่อน แล้วจึงปรับในระบบ</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.price?.toLocaleString() ?? '-'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{item.current || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs border rounded-full px-2 py-0.5 whitespace-nowrap ${STATUS[status].style}`}>
                            {STATUS[status].label}
                          </span>
                        </td>
                        {!readOnly && (
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => { clearPick(); setPicked(item); setError(undefined); setSavedNote(undefined) }}
                              disabled={saving}
                              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50 disabled:opacity-50"
                            >
                              เลือก
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {items?.length === 50 && (
            <p className="text-xs text-gray-500 mt-1">แสดง 50 รายการแรก พิมพ์คำค้นให้ละเอียดขึ้นถ้ายังไม่พบ</p>
          )}

          {picked && !readOnly && (
            <div className="mt-3 border border-blue-200 bg-blue-50 rounded-lg px-3 py-3 text-sm">
              <p className="font-medium text-gray-800">{picked.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <select
                  value={value}
                  onChange={e => { setValue(e.target.value); setConfirming(false); setUpdatePrice(undefined) }}
                  disabled={!checks}
                  aria-label="เลือกรหัสตามคู่มือ"
                  className="flex-1 min-w-[220px] px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-sm"
                >
                  <option value="">
                    {checks ? 'เลือกรหัสตามคู่มือ' : checkFailed ? 'ตรวจรหัสไม่สำเร็จ' : 'กำลังตรวจรหัส…'}
                  </option>
                  {(checks ?? []).map(c => {
                    return (
                      <option key={c.code} value={c.code}>
                        {c.code}{c.name ? ` ${c.name}` : ''}{!c.exists && LOOKUP_TABLES[target] ? ' (ไม่พบในตาราง)' : ''}
                      </option>
                    )
                  })}
                </select>
                <button
                  onClick={requestSave}
                  disabled={!value || saving || (priceDiffers && updatePrice === undefined)}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                </button>
                <button
                  onClick={clearPick}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              </div>

              {checkFailed && (
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-red-700">
                  ตรวจรหัสกับฐานข้อมูลไม่สำเร็จ
                  <button
                    onClick={() => setCheckRun(run => run + 1)}
                    className="text-xs border border-red-300 bg-white rounded-lg px-2.5 py-1 hover:bg-red-50"
                  >
                    ลองตรวจรหัสอีกครั้ง
                  </button>
                </div>
              )}

              {LOOKUP_TABLES[target] && chosenCheck && !chosenCheck.exists && (
                <p className="text-xs text-amber-800 mt-2">⚠ ไม่พบรหัสนี้ในตาราง {LOOKUP_TABLES[target]} แต่ยังบันทึกได้</p>
              )}

              {saveError && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{saveError}</p>
              )}

              {isBundle && value && (
                <p className="text-xs text-gray-600 mt-2">
                  ราคาเป็นชุด ({activity.price.toLocaleString()} บาท) เทียบรายการเดียวไม่ได้
                </p>
              )}

              {priceDiffers && priceRule && (
                <div className="mt-3 bg-white border border-amber-300 rounded-lg px-3 py-2">
                  <p>
                    ราคาปัจจุบัน <b>{picked.price?.toLocaleString() ?? '-'}</b> บาท
                    {(picked.price ?? 0) > priceRule.price ? ' มากกว่า' : ' น้อยกว่า'}เกณฑ์{' '}
                    <b>{priceRule.price.toLocaleString()}</b> บาท
                  </p>
                  <p className="mt-0.5">ต้องการอัปเดตราคาให้ตรงตามเกณฑ์ด้วยหรือไม่</p>
                  <p className="text-xs text-amber-800 mt-0.5">{PP_PRICE_EFFECT_NOTE}</p>
                  <div className="flex gap-2 mt-2" role="group" aria-label="อัปเดตราคาตามเกณฑ์">
                    {[true, false].map(answer => (
                      <button
                        key={String(answer)}
                        onClick={() => { setUpdatePrice(answer); setConfirming(false) }}
                        aria-pressed={updatePrice === answer}
                        className={`px-4 py-1 rounded-lg border text-sm font-semibold ${
                          updatePrice === answer ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {answer ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {confirming && (
                <div className="mt-3 bg-white border border-amber-300 rounded-lg px-3 py-2">
                  <p>
                    เปลี่ยนค่าจาก <b className="font-mono">{picked.current}</b> เป็น <b className="font-mono">{value}</b>
                  </p>
                  {priceDiffers && updatePrice && priceRule && (
                    <p>
                      เปลี่ยนราคาจาก <b>{picked.price?.toLocaleString() ?? '-'}</b> เป็น <b>{priceRule.price.toLocaleString()}</b> บาท
                    </p>
                  )}
                  <p className="text-xs text-amber-800 mt-0.5">มีผลกับรายการนี้ทั้งระบบ ไม่ใช่เฉพาะกิจกรรม PP</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => void save()}
                      disabled={saving}
                      className="px-3 py-1 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                    >
                      ยืนยันบันทึก
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={saving}
                      className="px-3 py-1 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      กลับไปแก้
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </section>
  )
}
