import * as ExcelJS from 'exceljs'
import { PP_ACTIVITIES } from '../src/data/ppActivities'
import { PP_CATEGORIES } from '../src/data/ppActivityMeta'
import { searchPp } from '../src/data/ppRulesUtils'
import { buildPpWorkbook, PP_SUMMARY_SHEET } from '../src/data/ppManualExport'

const build = (list = PP_ACTIVITIES) => buildPpWorkbook(ExcelJS.Workbook, list)

/** Header text of each column in row 1, in order. */
function headers(ws: ExcelJS.Worksheet): string[] {
  return (ws.getRow(1).values as unknown[]).slice(1).map(String)
}

/** Value of the given column in every data row. */
function column(ws: ExcelJS.Worksheet, header: string): unknown[] {
  const col = headers(ws).indexOf(header) + 1
  expect(col).toBeGreaterThan(0)
  const out: unknown[] = []
  for (let r = 2; r <= ws.rowCount; r++) out.push(ws.getRow(r).getCell(col).value)
  return out
}

const categorySheets = (wb: ExcelJS.Workbook) => wb.worksheets.filter(w => w.name !== PP_SUMMARY_SHEET)

describe('buildPpWorkbook', () => {
  const wb = build()

  it('has a summary sheet first, then one sheet per category', () => {
    expect(wb.worksheets[0].name).toBe(PP_SUMMARY_SHEET)
    expect(categorySheets(wb)).toHaveLength(PP_CATEGORIES.length)
  })

  it('names sheets uniquely, within 31 characters, without characters Excel rejects', () => {
    const names = wb.worksheets.map(w => w.name)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) {
      expect(n.length).toBeLessThanOrEqual(31)
      expect(n).not.toMatch(/[\\/?*[\]:]/)
    }
  })

  it('puts every activity on exactly one row, in number order within its sheet', () => {
    const nos = categorySheets(wb).flatMap(ws => {
      const col = column(ws, 'ข้อ') as number[]
      expect(col).toEqual([...col].sort((a, b) => a - b))
      return col
    })
    expect(nos.sort((a, b) => a - b)).toEqual(PP_ACTIVITIES.map(a => a.no).sort((a, b) => a - b))
  })

  it('writes the price as a number', () => {
    for (const ws of categorySheets(wb)) {
      for (const v of column(ws, 'ราคา (บาท)')) expect(typeof v).toBe('number')
    }
  })

  it('puts each code in the column of its kind', () => {
    const a = PP_ACTIVITIES.find(x => x.codes.some(c => c.kind === 'ICD10'))!
    const icd = a.codes.find(c => c.kind === 'ICD10')!
    const ws = categorySheets(wb).find(s => (column(s, 'ข้อ') as number[]).includes(a.no))!
    const row = (column(ws, 'ข้อ') as number[]).indexOf(a.no)
    expect(String(column(ws, 'ICD-10')[row])).toContain(icd.code)
  })

  it('carries conditions, examples and the JSON sample', () => {
    const a = PP_ACTIVITIES[0]
    const ws = categorySheets(wb).find(s => (column(s, 'ข้อ') as number[]).includes(a.no))!
    const row = (column(ws, 'ข้อ') as number[]).indexOf(a.no)
    expect(column(ws, 'เงื่อนไขการเบิก')[row]).toBe(a.conditions)
    expect(column(ws, 'ตัวอย่าง JSON')[row]).toBe(a.jsonText)
  })

  it('omits code columns no exported activity uses', () => {
    const ws = categorySheets(wb)[0]
    const used = new Set(PP_ACTIVITIES.flatMap(a => a.codes.map(c => c.kind)))
    if (!used.has('OTHER')) expect(headers(ws)).not.toContain('อื่น ๆ')
    expect(headers(ws)).toContain('ICD-10')
  })

  it('summarises each category with its count and links to its sheet', () => {
    const summary = wb.worksheets[0]
    expect(summary.rowCount).toBe(1 + PP_CATEGORIES.length)
    const counts = column(summary, 'จำนวนกิจกรรม') as number[]
    expect(counts.reduce((n, c) => n + c, 0)).toBe(PP_ACTIVITIES.length)
    const link = summary.getRow(2).getCell(1).value as ExcelJS.CellHyperlinkValue
    expect(link.hyperlink).toBe(`#'${wb.worksheets[1].name}'!A1`)
  })

  it('exports only the given activities and skips empty categories', () => {
    const hits = searchPp('วัคซีน')
    const small = build(hits)
    const rows = categorySheets(small).reduce((n, ws) => n + ws.rowCount - 1, 0)
    expect(rows).toBe(hits.length)
    for (const ws of categorySheets(small)) expect(ws.rowCount).toBeGreaterThan(1)
  })

  it('serialises to a real xlsx file', async () => {
    const buf = await build(searchPp('วัคซีน')).xlsx.writeBuffer()
    expect(buf.byteLength).toBeGreaterThan(1000)
  })
})
