import { useCallback, useState, useMemo, useEffect, useDeferredValue } from 'react'
import type { PpActivity, PpCode } from '../data/ppActivities'
import { PP_WARNINGS } from '../data/ppActivityMeta'
import { PP_RPST, RPST_LEVELS, type RpstLevel } from '../data/ppRpstCapability'
import {
  searchPp,
  filterByRpst,
  rpstCounts,
  lookupCode,
  buildPpTree,
  categoryOf,
  groupCodes,
  keepSelection,
  KIND_LABELS,
  type CodeHit,
} from '../data/ppRulesUtils'
import { PpApiOverview } from '../components/pp/PpApiOverview'
import { PpCodeMapper } from '../components/pp/PpCodeMapper'
import { PpSop } from '../components/pp/PpSop'
import { PpCriteriaCodes } from '../components/pp/PpCriteriaCodes'
import {
  COVERAGE_DOTS,
  CollapseListButton,
  CollapsedList,
  CoverageDot,
  LayoutToggle,
  PpCategorySheets,
  listGridClass,
  readListCollapsed,
  readListLayout,
  storeListCollapsed,
  storeListLayout,
  type PpListLayout,
} from '../components/pp/PpCategorySheets'
import {
  PP_SERVICE_NOTE,
  coverageOf,
  filterByCoverage,
  routeOf,
  type CoverageFilter,
  type PpCoverage,
} from '../data/ppCodeTargets'
import { fetchPpCoverage } from '../services/ppMappingApi'
import { buildPpWorkbook } from '../data/ppManualExport'

type Tab = 'activities' | 'api'

const RPST_STYLES: Record<RpstLevel, { on: string; badge: string }> = {
  yes: { on: 'bg-emerald-600 border-emerald-600 text-white', badge: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
  conditional: { on: 'bg-amber-500 border-amber-500 text-white', badge: 'bg-amber-50 border-amber-200 text-amber-900' },
  no: { on: 'bg-gray-600 border-gray-600 text-white', badge: 'bg-gray-50 border-gray-200 text-gray-700' },
}


export function PpManualPage() {
  const [tab, setTab] = useState<Tab>('activities')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [selected, setSelected] = useState(1)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [layout, setLayout] = useState<PpListLayout>(readListLayout)
  const [listCollapsed, setListCollapsed] = useState(readListCollapsed)

  function collapseList(next: boolean) {
    setListCollapsed(next)
    storeListCollapsed(next)
  }

  function chooseLayout(next: PpListLayout) {
    setLayout(next)
    storeListLayout(next)
  }

  const [rpst, setRpst] = useState<RpstLevel | 'all'>('all')
  const [coverage, setCoverage] = useState<PpCoverage>()
  const [coverageFailed, setCoverageFailed] = useState(false)

  const loadCoverage = useCallback(() => {
    fetchPpCoverage()
      .then(result => { setCoverage(result); setCoverageFailed(false) })
      .catch(() => setCoverageFailed(true))
  }, [])

  useEffect(loadCoverage, [loadCoverage])

  const found = useMemo(() => searchPp(deferredQuery), [deferredQuery])
  const counts = useMemo(() => rpstCounts(found), [found])
  const byRpst = useMemo(() => filterByRpst(found, rpst), [found, rpst])
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all')

  // Counted after search and capability, so each chip says how many it would show.
  const coverageTotals = useMemo(() => {
    const totals = { done: 0, partial: 0, none: 0, na: 0 }
    if (coverage) for (const a of byRpst) totals[coverageOf(a, coverage).level]++
    return totals
  }, [coverage, byRpst])

  const results = useMemo(() => filterByCoverage(byRpst, coverage, coverageFilter), [byRpst, coverage, coverageFilter])
  const codeHits = useMemo(() => lookupCode(deferredQuery, results), [deferredQuery, results])
  const tree = useMemo(() => buildPpTree(results), [results])
  const trimmed = deferredQuery.trim()
  const rpstLabel = RPST_LEVELS.find(l => l.level === rpst)?.label

  // Open the activity a number query names; otherwise keep a visible activity selected.
  useEffect(() => {
    setSelected(prev => keepSelection(results, prev, deferredQuery))
  }, [results, deferredQuery])

  function toggle(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const current = results.find(a => a.no === selected)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string>()

  // exceljs is large, so it is loaded only when someone actually exports.
  async function exportExcel() {
    if (!results.length) return
    setExporting(true)
    setExportError(undefined)
    try {
      const mod = await import('exceljs')
      const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod
      const buf = await buildPpWorkbook(ExcelJS.Workbook, results).xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `คู่มือเบิกกิจกรรม-PP-${results.length}-กิจกรรม.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError('Export ไม่สำเร็จ: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="w-full space-y-5 text-gray-800 pb-10">
      <section className="app-header text-white rounded-2xl px-7 py-6 shadow-lg">
        <p className="text-white/70 text-sm font-medium tracking-wide">การส่งข้อมูล NHSO Digital Platform 104 กิจกรรม</p>
        <h1 className="text-2xl font-bold mt-1 leading-snug">การตั้งค่าเพื่อส่งออก NDP</h1>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="flex gap-2" role="tablist">
            <TabButton active={tab === 'activities'} onClick={() => setTab('activities')}>กิจกรรม 104 รายการ</TabButton>
            <TabButton active={tab === 'api'} onClick={() => setTab('api')}>สำหรับนักพัฒนา API 13 Plus</TabButton>
          </div>
          <PpSop onStart={() => { setTab('activities'); setCoverageFilter('incomplete') }} />
        </div>
      </section>

      {tab === 'api' ? (
        <PpApiOverview />
      ) : (
        <>
          <div className="flex gap-3 items-start">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหา เช่น 'Z340', '36350', 'ฝากครรภ์', 'วัคซีน', '104'…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              aria-label="ค้นหากิจกรรม PP"
            />
            <p className="text-xs text-gray-500 mt-1.5 pl-1">
              {trimmed || rpstLabel ? <>พบ <b className="text-gray-700">{results.length}</b> จาก 104 กิจกรรม</> : '104 กิจกรรม'}
            </p>
          </div>
            <button
              onClick={exportExcel}
              disabled={exporting || results.length === 0}
              className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="1 หมวด = 1 sheet พร้อม sheet สรุป"
            >
              📥 {exporting ? 'กำลังสร้างไฟล์…' : `Export Excel (${results.length} กิจกรรม)`}
            </button>
          </div>
          {exportError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{exportError}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-2">
            {coverage && (
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5"
                role="group"
                aria-label="ตัวกรองข้อมูล"
              >
                <span
                  className="font-semibold text-blue-900 mr-1 cursor-help"
                  title="เขียว = มีรหัสแล้ว ยังไม่ยืนยันว่าถูกทุกรายการ · ไม่นับ ICD-10, ยา/วัคซีน"
                >
                  🎯 ตัวกรองข้อมูล ⓘ
                </span>
                <CoverageChip active={coverageFilter === 'all'} onClick={() => setCoverageFilter('all')}>
                  ทั้งหมด <b className="tabular-nums">{byRpst.length}</b>
                </CoverageChip>
                <CoverageChip active={coverageFilter === 'incomplete'} onClick={() => setCoverageFilter('incomplete')}>
                  ยังไม่สมบูรณ์ <b className="tabular-nums">{coverageTotals.partial + coverageTotals.none}</b>
                </CoverageChip>
                {(['partial', 'none', 'done'] as const).map(level => (
                  <CoverageChip key={level} active={coverageFilter === level} onClick={() => setCoverageFilter(level)}>
                    <span className={`w-2.5 h-2.5 rounded-full ${COVERAGE_DOTS[level].dot}`} />
                    {COVERAGE_DOTS[level].label} <b className="tabular-nums">{coverageTotals[level]}</b>
                  </CoverageChip>
                ))}
              </div>
            )}
            <div
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5"
              role="group"
              aria-label="กรองตามศักยภาพ รพ.สต."
            >
              <span className="font-semibold text-emerald-900 mr-1">🏥 ศักยภาพ รพ.สต.</span>
              <RpstChip active={rpst === 'all'} activeClass="bg-blue-600 border-blue-600 text-white" onClick={() => setRpst('all')}>
                ทั้งหมด ({found.length})
              </RpstChip>
              {RPST_LEVELS.map(l => (
                <RpstChip
                  key={l.level}
                  active={rpst === l.level}
                  activeClass={RPST_STYLES[l.level].on}
                  title={l.description}
                  onClick={() => setRpst(l.level)}
                >
                  {l.label} ({counts[l.level]})
                </RpstChip>
              ))}
            </div>
            <div className="ml-auto">
              <LayoutToggle value={layout} onChange={chooseLayout} />
            </div>
          </div>
          {coverageFailed && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ดึงสถานะรหัสในระบบไม่สำเร็จ จึงยังไม่แสดงสี
              <button onClick={loadCoverage} className="ml-2 underline">ลองอีกครั้ง</button>
            </p>
          )}

          {codeHits.length > 0 && <CodeLookup code={trimmed} hits={codeHits} onSelect={setSelected} />}

          {results.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center bg-white rounded-xl border border-gray-200">
              <span className="text-5xl mb-4">🔍</span>
              <p className="text-base font-medium text-gray-600">
                ไม่พบกิจกรรมที่ตรงกับ <span className="font-semibold text-gray-800">"{trimmed}"</span>
                {rpstLabel && <> ในกลุ่ม {rpstLabel}</>}
                {coverageFilter !== 'all' && <> ที่ตัวกรองข้อมูล "{COVERAGE_FILTER_LABELS[coverageFilter]}"</>}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {rpstLabel || coverageFilter !== 'all'
                  ? 'ลองเลือก "ทั้งหมด" ที่ตัวกรองข้อมูลหรือศักยภาพ หรือค้นด้วยคำอื่น'
                  : 'ลองค้นด้วยรหัส (เช่น Z130, 36350) หรือคำที่สั้นลง'}
              </p>
            </div>
          ) : layout === 'horizontal' ? (
            <PpCategorySheets
              tree={tree}
              selected={selected}
              onSelect={setSelected}
              coverage={coverage}
              collapsed={listCollapsed}
              onCollapse={collapseList}
            >
              {current && <ActivityCard key={current.no} a={current} onCode={setQuery} coverage={coverage} onSaved={loadCoverage} />}
            </PpCategorySheets>
          ) : (
            <div className={listGridClass(listCollapsed)}>
              {listCollapsed ? <CollapsedList onExpand={() => collapseList(false)} /> : <nav
                className="bg-white rounded-xl border border-gray-200 shadow-sm py-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] overflow-y-auto"
                aria-label="หมวดกิจกรรม PP"
              >
                <CollapseListButton onClick={() => collapseList(true)} />
                {tree.map(c => {
                  const open = !collapsed.has(c.key)
                  const levels = coverage ? c.items.map(a => coverageOf(a, coverage).level).filter(l => l !== 'na') : []
                  const done = levels.filter(l => l === 'done').length
                  return (
                    <div key={c.key}>
                      <button
                        onClick={() => toggle(c.key)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm font-bold app-accent-text hover:bg-gray-50"
                        aria-expanded={open}
                      >
                        <span className={`text-[10px] transition-transform ${open ? '' : '-rotate-90'}`}>▼</span>
                        <span>{c.icon}</span>
                        <span className="flex-1">{c.label}</span>
                        {levels.length > 0 && (
                          <span
                            title={`มีรหัสครบ ${done} จาก ${levels.length} กิจกรรม`}
                            className={`text-[11px] font-semibold rounded-full px-2 py-0.5 tabular-nums ${
                              done === levels.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {done}/{levels.length}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{c.count}</span>
                      </button>
                      {open && c.items.map(a => {
                        const level = coverage ? coverageOf(a, coverage).level : 'na'
                        return (
                        <button
                          key={a.no}
                          onClick={() => setSelected(a.no)}
                          className={`w-full flex items-start gap-2 pl-10 pr-3 py-1.5 text-left text-[13px] leading-snug border-l-2 ${
                            a.no === selected ? 'app-accent-bg app-accent-text border-current font-medium' : 'border-transparent text-gray-600 hover:bg-gray-50'
                          }`}
                          aria-current={a.no === selected ? 'true' : undefined}
                        >
                          <span className="text-[11px] text-gray-400 w-6 shrink-0 text-right tabular-nums">{a.no}</span>
                          <CoverageDot level={level} />
                          <span className="flex-1">{a.title}</span>
                          <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{a.price.toLocaleString()}฿</span>
                        </button>
                        )
                      })}
                    </div>
                  )
                })}
              </nav>}

              {current && <ActivityCard key={current.no} a={current} onCode={setQuery} coverage={coverage} onSaved={loadCoverage} />}
            </div>
          )}

          <p className="text-xs text-gray-400 pt-2 border-t">
            ข้อความตามคู่มือต้นฉบับ (ดึงจาก PDF 163 หน้า) — ชนิดรหัสที่อ่านจากข้อความเงื่อนไขเป็นการจำแนกอัตโนมัติ
            ให้ยึดตัวอย่าง JSON และประกาศโครงสร้างชุดข้อมูล 13 แฟ้ม Plus ของ สปสช. เป็นหลัก
          </p>
        </>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium ${active ? 'bg-white text-gray-900 shadow' : 'bg-white/15 text-white hover:bg-white/25'}`}
    >
      {children}
    </button>
  )
}

const COVERAGE_FILTER_LABELS: Record<CoverageFilter, string> = {
  all: 'ทั้งหมด',
  incomplete: 'ยังไม่สมบูรณ์',
  partial: COVERAGE_DOTS.partial.label,
  none: COVERAGE_DOTS.none.label,
  done: COVERAGE_DOTS.done.label,
}

function CoverageChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
        active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function RpstChip({ active, activeClass, title, onClick, children }: {
  active: boolean
  activeClass: string
  title?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`px-2.5 py-1 rounded-full border text-xs font-medium ${
        active ? activeClass : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function CodeLookup({ code, hits, onSelect }: { code: string; hits: CodeHit[]; onSelect: (no: number) => void }) {
  return (
    <section className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-sky-900">
        รหัส <span className="font-mono">{code.toUpperCase()}</span> พบใน {new Set(hits.map(h => h.activity.no)).size} กิจกรรม
      </p>
      <ul className="mt-2 space-y-1">
        {hits.map(h => (
          <li key={h.activity.no + h.code.kind + (h.code.billgrcs ?? '')}>
            <button onClick={() => onSelect(h.activity.no)} className="text-left hover:underline">
              <span className="text-gray-500 tabular-nums">ข้อ {h.activity.no}</span> · {h.activity.title}{' '}
              <span className="text-xs text-sky-800">
                ({KIND_LABELS[h.code.kind]}{h.code.billgrcs ? ` · BILLGRCS ${h.code.billgrcs}` : ''}
                {h.code.codesys ? ` · CODESYS ${h.code.codesys}` : ''})
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ActivityCard({ a, onCode, coverage, onSaved }: {
  a: PpActivity
  onCode: (code: string) => void
  coverage?: PpCoverage
  onSaved: () => void
}) {
  const [jsonOpen, setJsonOpen] = useState(false)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const category = categoryOf(a.no)
  const warnings = PP_WARNINGS[a.no] ?? []
  const assessment = PP_RPST[a.no]
  const assessmentLabel = RPST_LEVELS.find(l => l.level === assessment?.level)?.label

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(a.jsonText)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <header className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono font-bold app-accent-bg app-accent-text rounded px-2 py-0.5">ข้อ {a.no}</span>
          {category && <span className="text-gray-500">{category.icon} {category.label}</span>}
          <span className="ml-auto text-gray-400">หน้า {a.pageStart} ใน PDF</span>
        </div>
        <div className="flex items-start gap-4 mt-2.5">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{a.title}</h2>
            {a.subtitle && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{a.subtitle}</p>}
          </div>
          <p className="shrink-0 text-right">
            <span className="block text-xl font-bold text-emerald-700 tabular-nums whitespace-nowrap">{a.price.toLocaleString()} บาท</span>
            {a.priceNote && <span className="block text-xs font-medium text-gray-500 max-w-[14rem]">{a.priceNote}</span>}
          </p>
        </div>
        {assessment && (
          <p className={`mt-3 text-sm border rounded-lg px-3 py-2 ${RPST_STYLES[assessment.level].badge}`}>
            <b>{assessmentLabel}</b> · {assessment.reason}
          </p>
        )}
        {warnings.length > 0 && (
          <div className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
            <b>⚠ ข้อควรระวัง</b>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {warnings.map(w => <li key={w}>{w}</li>)}
            </ul>
            <p className="mt-1 text-xs">รหัสนี้จะต้องตรง สามารถตรวจสอบได้จากหน้าจอการส่งข้อมูลในระบบ</p>
          </div>
        )}
      </header>

      <section className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 mb-2">รหัสที่ใช้</h3>
        <div className="space-y-2">
          {groupCodes(a.codes).map(g => (
            <div key={g.kind} className="grid sm:grid-cols-[150px_1fr] gap-x-3 gap-y-1 text-sm">
              <span className="text-gray-500 font-medium">{KIND_LABELS[g.kind]}</span>
              <div className="flex flex-wrap gap-1.5">
                {g.codes.map(c => <CodeChip key={c.code + (c.billgrcs ?? '')} c={c} found={isInSystem(c, coverage)} onClick={() => onCode(c.code)} />)}
                {g.kind === 'ICD10' && <p className="basis-full text-xs text-sky-800">{PP_SERVICE_NOTE}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <PpCriteriaCodes activity={a} />

      <PpCodeMapper activity={a} coverage={coverage} onSaved={onSaved} />

      <TextSection title="เงื่อนไขการเบิก" text={a.conditions} />
      {a.examples && <TextSection title="ตัวอย่างชุดเบิก" text={a.examples} />}

      <section className="px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setJsonOpen(o => !o)}
            className="flex items-center gap-2 text-sm font-bold text-gray-700"
            aria-expanded={jsonOpen}
          >
            <span className={`text-[9px] text-gray-400 transition-transform ${jsonOpen ? '' : '-rotate-90'}`}>▼</span>
            ตัวอย่าง JSON (diagnosis / procedure / chad)
          </button>
          <button onClick={copyJson} className="ml-auto text-xs border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50">
            📋 คัดลอก
          </button>
        </div>
        {copy === 'copied' && <p className="text-xs text-emerald-700 mt-1">คัดลอกแล้ว</p>}
        {copy === 'failed' && <p className="text-xs text-red-700 mt-1">คัดลอกไม่ได้ — เปิด JSON แล้วเลือกข้อความเอง</p>}
        {jsonOpen && (
          <pre className="mt-2 bg-gray-900 text-gray-100 rounded-lg px-4 py-3 text-xs overflow-x-auto max-h-[60vh]">{a.jsonText}</pre>
        )}
      </section>
    </article>
  )
}

function isInSystem(c: PpCode, coverage?: PpCoverage): boolean {
  const route = routeOf(c)
  return !!coverage && route !== 'service' && route !== 'blocked' && coverage[route].has(c.code)
}

function CodeChip({ c, found, onClick }: { c: PpCode; found: boolean; onClick: () => void }) {
  const suffix = [c.billgrcs && `หมวด ${c.billgrcs}`, c.codesys && `CS ${c.codesys}`].filter(Boolean).join(' · ')
  return (
    <button
      onClick={onClick}
      title={found ? 'มีรหัสนี้ในระบบแล้ว · กดเพื่อค้นหากิจกรรมอื่นที่ใช้รหัสนี้' : 'ค้นหากิจกรรมอื่นที่ใช้รหัสนี้'}
      className={`font-mono text-xs border rounded-md px-2 py-0.5 ${
        found ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-900' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'
      }`}
    >
      {found && '✓ '}{c.code}
      {suffix && <span className="ml-1 font-sans text-[10px] text-gray-500">{suffix}</span>}
    </button>
  )
}

function TextSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="px-6 py-4 border-b border-gray-100">
      <h3 className="text-sm font-bold text-gray-700 mb-2">{title}</h3>
      <pre className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap font-sans">{text}</pre>
    </section>
  )
}
