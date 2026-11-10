/**
 * Excel export for the PP manual browser: one workbook, a summary sheet first,
 * then one sheet per category with one row per activity.
 *
 * The ExcelJS Workbook class is passed in so the page can load exceljs lazily
 * and the tests can hand in the Node build.
 */
import type { Workbook, Worksheet } from 'exceljs'
import type { PpActivity, PpCode, PpCodeKind } from './ppActivities'
import { PP_CATEGORIES, PP_WARNINGS } from './ppActivityMeta'
import { KIND_ORDER, KIND_LABELS } from './ppRulesUtils'

export const PP_SUMMARY_SHEET = 'สรุป'

/** Excel refuses cells longer than this. */
const MAX_CELL_CHARS = 32767

const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } }
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } } as const

function sheetName(label: string): string {
  return label.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim()
}

function cellText(s: string | undefined): string {
  return (s ?? '').slice(0, MAX_CELL_CHARS)
}

/** 'Z340, 36350 (หมวด 14 · CS 06)' — BILLGRCS/CODESYS kept next to the code they belong to. */
function codesText(codes: PpCode[]): string {
  return codes
    .map(c => {
      const extra = [c.billgrcs && `หมวด ${c.billgrcs}`, c.codesys && `CS ${c.codesys}`].filter(Boolean).join(' · ')
      return extra ? `${c.code} (${extra})` : c.code
    })
    .join(', ')
}

interface Column {
  header: string
  width: number
  value: (a: PpActivity) => string | number
}

function columnsFor(activities: PpActivity[]): Column[] {
  const usedKinds = new Set<PpCodeKind>(activities.flatMap(a => a.codes.map(c => c.kind)))
  const codeColumns: Column[] = KIND_ORDER.filter(k => usedKinds.has(k)).map(kind => ({
    header: KIND_LABELS[kind],
    width: 22,
    value: a => codesText(a.codes.filter(c => c.kind === kind)),
  }))

  return [
    { header: 'ข้อ', width: 6, value: a => a.no },
    { header: 'กิจกรรม', width: 40, value: a => cellText(a.title) },
    { header: 'รายละเอียด', width: 40, value: a => cellText(a.subtitle) },
    { header: 'ราคา (บาท)', width: 12, value: a => a.price },
    { header: 'หมายเหตุราคา', width: 20, value: a => cellText(a.priceNote) },
    ...codeColumns,
    { header: 'ข้อควรระวัง', width: 40, value: a => cellText((PP_WARNINGS[a.no] ?? []).map(w => '• ' + w).join('\n')) },
    { header: 'เงื่อนไขการเบิก', width: 70, value: a => cellText(a.conditions) },
    { header: 'ตัวอย่างชุดเบิก', width: 50, value: a => cellText(a.examples) },
    { header: 'ตัวอย่าง JSON', width: 50, value: a => cellText(a.jsonText) },
    { header: 'หน้า PDF', width: 9, value: a => a.pageStart },
  ]
}

function styleHeader(ws: Worksheet): void {
  const head = ws.getRow(1)
  head.font = HEADER_FONT
  head.fill = HEADER_FILL
  head.alignment = { vertical: 'middle', wrapText: true }
}

/** Build the workbook for the given activities; categories with none of them are left out. */
export function buildPpWorkbook(WorkbookClass: new () => Workbook, activities: PpActivity[]): Workbook {
  const wb = new WorkbookClass()
  wb.creator = 'BGS Check Export'
  wb.created = new Date()

  const byNo = new Map(activities.map(a => [a.no, a]))
  const groups = PP_CATEGORIES.map(c => ({
    category: c,
    items: [...c.nos].sort((x, y) => x - y).flatMap(no => byNo.get(no) ?? []),
  })).filter(g => g.items.length > 0)

  const summary = wb.addWorksheet(PP_SUMMARY_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] })
  summary.columns = [
    { header: 'หมวด', width: 34 },
    { header: 'จำนวนกิจกรรม', width: 14 },
    { header: 'ราคาต่ำสุด (บาท)', width: 16 },
    { header: 'ราคาสูงสุด (บาท)', width: 16 },
  ]
  styleHeader(summary)

  const columns = columnsFor(activities)

  for (const { category, items } of groups) {
    const name = sheetName(category.label)
    const prices = items.map(a => a.price)
    const row = summary.addRow([
      { text: category.label, hyperlink: `#'${name}'!A1` },
      items.length,
      Math.min(...prices),
      Math.max(...prices),
    ])
    row.getCell(1).font = { color: { argb: 'FF1D4ED8' }, underline: true }

    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1, xSplit: 2 }] })
    ws.columns = columns.map(c => ({ header: c.header, width: c.width }))
    styleHeader(ws)
    for (const a of items) {
      const r = ws.addRow(columns.map(c => c.value(a)))
      r.alignment = { vertical: 'top', wrapText: true }
    }
    ws.getColumn(4).numFmt = '#,##0'
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
  }

  return wb
}
