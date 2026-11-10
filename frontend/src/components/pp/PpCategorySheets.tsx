import type { PpTreeCategory } from '../../data/ppRulesUtils'
import { coverageOf, type CoverageLevel, type PpCoverage } from '../../data/ppCodeTargets'

export const COVERAGE_DOTS: Record<Exclude<CoverageLevel, 'na'>, { dot: string; label: string }> = {
  done: { dot: 'bg-emerald-500', label: 'ครบทุกชนิด' },
  partial: { dot: 'bg-amber-400', label: 'บางชนิด' },
  none: { dot: 'bg-gray-300', label: 'ยังไม่มี' },
}

export type PpListLayout = 'vertical' | 'horizontal'

const LAYOUT_KEY = 'pp-manual-layout'

export function readListLayout(): PpListLayout {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'horizontal' ? 'horizontal' : 'vertical'
  } catch {
    return 'vertical'
  }
}

export function storeListLayout(layout: PpListLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout)
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}

export function LayoutToggle({ value, onChange }: { value: PpListLayout; onChange: (v: PpListLayout) => void }) {
  const options: [PpListLayout, string][] = [['vertical', 'แนวตั้ง'], ['horizontal', 'แนวนอน']]
  return (
    <div className="flex items-center gap-2 text-xs" role="group" aria-label="มุมมองรายการ">
      <span className="font-semibold text-gray-700">มุมมองรายการ</span>
      <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
        {options.map(([v, label]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={`px-3 py-1 ${value === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CoverageDot({ level }: { level: CoverageLevel }) {
  if (level === 'na') return <span className="w-2 h-2 mt-1 shrink-0" />
  return (
    <span
      role="img"
      aria-label={COVERAGE_DOTS[level].label}
      title={COVERAGE_DOTS[level].label}
      className={`w-2 h-2 mt-1 rounded-full shrink-0 ${COVERAGE_DOTS[level].dot}`}
    />
  )
}

/**
 * Categories as a row of sheet tabs that scrolls sideways. Beneath it, the chosen
 * category's activities run down the left beside `children` (the activity detail).
 */
export function PpCategorySheets({ tree, selected, onSelect, coverage, collapsed = false, onCollapse, children }: {
  tree: PpTreeCategory[]
  selected: number
  onSelect: (no: number) => void
  coverage?: PpCoverage
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  children?: React.ReactNode
}) {
  const active = tree.find(c => c.items.some(a => a.no === selected)) ?? tree[0]
  if (!active) return null

  return (
    <div className="space-y-3">
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-[repeat(var(--pp-cols),minmax(0,1fr))] gap-1.5 p-2"
        style={{ '--pp-cols': Math.ceil(tree.length / 2) } as React.CSSProperties}
        role="tablist"
        aria-label="หมวดกิจกรรม PP"
      >
        {tree.map(c => {
          const levels = coverage ? c.items.map(a => coverageOf(a, coverage).level).filter(l => l !== 'na') : []
          const done = levels.filter(l => l === 'done').length
          const on = c.key === active.key
          return (
            <button
              key={c.key}
              role="tab"
              aria-selected={on}
              onClick={() => onSelect(c.items[0].no)}
              title={c.label}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[13px] leading-tight text-left ${
                on ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="shrink-0">{c.icon}</span>
              <span className="flex-1 min-w-0 line-clamp-2">{c.label}</span>
              {levels.length > 0 && (
                <span
                  title={`มีรหัสครบ ${done} จาก ${levels.length} กิจกรรม`}
                  className={`shrink-0 text-[11px] font-semibold rounded-full px-1.5 tabular-nums ${
                    done === levels.length ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {done}/{levels.length}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
    <div className={listGridClass(collapsed)}>
      {collapsed && onCollapse ? <CollapsedList onExpand={() => onCollapse(false)} /> : <div
        className="bg-white rounded-xl border border-gray-200 shadow-sm py-2 lg:sticky lg:top-0 lg:max-h-[calc(100vh-9rem)] overflow-y-auto"
        role="tabpanel"
        aria-label={active.label}
      >
        {onCollapse && <CollapseListButton onClick={() => onCollapse(true)} />}
        {active.items.map(a => {
          const on = a.no === selected
          return (
            <button
              key={a.no}
              onClick={() => onSelect(a.no)}
              aria-current={on ? 'true' : undefined}
              className={`w-full flex items-start gap-2 px-3 py-1.5 text-left text-[13px] leading-snug border-l-2 ${
                on ? 'app-accent-bg app-accent-text border-current font-medium' : 'border-transparent text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-[11px] text-gray-400 w-6 shrink-0 text-right tabular-nums">{a.no}</span>
              <CoverageDot level={coverage ? coverageOf(a, coverage).level : 'na'} />
              <span className="flex-1">{a.title}</span>
              <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{a.price.toLocaleString()}฿</span>
            </button>
          )
        })}
      </div>}
      {children}
    </div>
    </div>
  )
}

const COLLAPSED_KEY = 'pp-manual-list-collapsed'

export function readListCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export function storeListCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
}

/** The list column beside the activity detail; a folded list leaves a thin strip to open it again. */
export function listGridClass(collapsed: boolean) {
  return `grid grid-cols-1 ${collapsed ? 'lg:grid-cols-[44px_1fr]' : 'lg:grid-cols-[minmax(260px,340px)_1fr]'} gap-5 items-start`
}

export function CollapseListButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end px-2 pb-1">
      <button
        onClick={onClick}
        aria-label="ย่อรายการกิจกรรม"
        title="ย่อรายการ ให้รายละเอียดกว้างขึ้น"
        className="text-xs text-gray-500 border border-gray-200 rounded-md px-2 py-0.5 hover:bg-gray-50 hover:text-gray-800"
      >
        « ย่อรายการ
      </button>
    </div>
  )
}

export function CollapsedList({ onExpand }: { onExpand: () => void }) {
  return (
    <button
      onClick={onExpand}
      aria-label="ขยายรายการกิจกรรม"
      title="ขยายรายการกิจกรรม"
      className="hidden lg:flex flex-col items-center gap-2 w-11 py-3 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 lg:sticky lg:top-0"
    >
      <span className="text-sm">»</span>
      <span className="text-xs font-medium [writing-mode:vertical-rl]">รายการกิจกรรม</span>
    </button>
  )
}
