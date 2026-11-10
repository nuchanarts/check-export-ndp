/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PP_ACTIVITIES } from '../src/data/ppActivities'
import { PpCodeMapper } from '../src/components/pp/PpCodeMapper'
import { toCoverage } from '../src/data/ppCodeTargets'
import { checkPpCodes, fetchPpMapped, savePpCode, searchPpItems, type PpItem } from '../src/services/ppMappingApi'

jest.mock('../src/services/ppMappingApi', () => ({
  ...jest.requireActual('../src/services/ppMappingApi'),
  searchPpItems: jest.fn(),
  checkPpCodes: jest.fn(),
  savePpCode: jest.fn(),
  fetchPpMapped: jest.fn(),
}))

const search = searchPpItems as jest.MockedFunction<typeof searchPpItems>
const check = checkPpCodes as jest.MockedFunction<typeof checkPpCodes>
const save = savePpCode as jest.MockedFunction<typeof savePpCode>
const mapped = fetchPpMapped as jest.MockedFunction<typeof fetchPpMapped>

const activity = (no: number) => PP_ACTIVITIES.find(a => a.no === no)!
const item = (over: Partial<PpItem> = {}): PpItem => ({
  code: '3000001', name: 'รายการทดสอบ', price: 140, current: null, active: true, ...over,
})

async function searchAndPick(no: number, found: PpItem) {
  search.mockResolvedValue([found])
  render(<PpCodeMapper activity={activity(no)} />)
  fireEvent.change(screen.getByLabelText('ค้นหารายการของ รพ.'), { target: { value: 'ทดสอบ' } })
  fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
  fireEvent.click(await screen.findByRole('button', { name: 'เลือก' }))
  await waitFor(() => expect(codeSelect().disabled).toBe(false))
}

const codeSelect = () => screen.getByLabelText('เลือกรหัสตามคู่มือ') as HTMLSelectElement
const chooseCode = (code: string) => fireEvent.change(codeSelect(), { target: { value: code } })
const saveButton = () => screen.getByRole('button', { name: 'บันทึก' }) as HTMLButtonElement

beforeEach(() => {
  jest.resetAllMocks()
  check.mockImplementation(async (_target, codes) => codes.map(code => ({ code, name: null, exists: true })))
  save.mockResolvedValue(undefined)
  mapped.mockResolvedValue([])
})

afterEach(cleanup)

describe('saving a code', () => {
  it('saves an empty item without asking to overwrite', async () => {
    await searchAndPick(2, item({ current: null }))
    expect(screen.getByText('ยังว่าง')).toBeTruthy()
    chooseCode('36350')
    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalledWith('csmbs', '3000001', '36350', null, undefined))
    expect(screen.queryByText('ยืนยันบันทึก')).toBeNull()
  })

  it('asks before overwriting an existing value', async () => {
    await searchAndPick(2, item({ current: '38999' }))
    chooseCode('36350')
    fireEvent.click(saveButton())
    expect(await screen.findByText('มีผลกับรายการนี้ทั้งระบบ ไม่ใช่เฉพาะกิจกรรม PP')).toBeTruthy()
    expect(save).not.toHaveBeenCalled()
  })

  it('shows a viewer the permission message next to the save button', async () => {
    save.mockRejectedValue({ response: { status: 403 } })
    await searchAndPick(2, item())
    chooseCode('36350')
    fireEvent.click(saveButton())
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('ไม่มีสิทธิ์แก้ไขข้อมูล กรุณาเข้าสู่ระบบด้วยบัญชีผู้แก้ไข')
    expect(alert.parentElement?.contains(saveButton())).toBe(true)
  })

  it('locks the other controls while saving', async () => {
    save.mockReturnValue(new Promise(() => undefined))
    await searchAndPick(2, item())
    chooseCode('36350')
    fireEvent.click(saveButton())
    await screen.findByRole('button', { name: 'กำลังบันทึก…' })
    expect((screen.getByRole('tab', { name: 'TMLT (Lab)' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'ค้นหา' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'เลือก' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'ยกเลิก' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('checking the manual codes', () => {
  it('offers a retry when the check fails', async () => {
    check.mockRejectedValueOnce(new Error('Network Error'))
    search.mockResolvedValue([item()])
    render(<PpCodeMapper activity={activity(2)} />)
    fireEvent.change(screen.getByLabelText('ค้นหารายการของ รพ.'), { target: { value: 'ทดสอบ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    fireEvent.click(await screen.findByRole('button', { name: 'เลือก' }))
    fireEvent.click(await screen.findByRole('button', { name: 'ลองตรวจรหัสอีกครั้ง' }))
    await waitFor(() => expect(codeSelect().disabled).toBe(false))
    expect(screen.queryByRole('button', { name: 'ลองตรวจรหัสอีกครั้ง' })).toBeNull()
  })

  it('keeps a code missing from its table selectable, with a warning', async () => {
    check.mockImplementation(async (_target, codes) => codes.map(code => ({ code, name: null, exists: false })))
    search.mockResolvedValue([item()])
    render(<PpCodeMapper activity={activity(2)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'TMLT (Lab)' }))
    fireEvent.change(screen.getByLabelText('ค้นหารายการของ รพ.'), { target: { value: 'ทดสอบ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    fireEvent.click(await screen.findByRole('button', { name: 'เลือก' }))
    await waitFor(() => expect(codeSelect().disabled).toBe(false))
    expect((screen.getByRole('option', { name: /300105/ }) as HTMLOptionElement).disabled).toBe(false)
    chooseCode('300105')
    expect(screen.getByText('⚠ ไม่พบรหัสนี้ในตาราง lab_items_tmlt แต่ยังบันทึกได้')).toBeTruthy()
    expect(saveButton().disabled).toBe(false)
  })
})

describe('the meaning of each code', () => {
  beforeEach(() => {
    check.mockImplementation(async (_target, codes) =>
      codes.map(code => (code === '36350'
        ? { code, name: 'ตรวจ Anti-HIV', exists: true }
        : { code, name: null, exists: false })))
  })

  it('shows the meaning in the code choices', async () => {
    await searchAndPick(2, item())
    expect(screen.getByRole('option', { name: '36350 ตรวจ Anti-HIV' })).toBeTruthy()
  })

  it('keeps a CSMBS code without a meaning selectable and quiet', async () => {
    await searchAndPick(2, item())
    const option = screen.getByRole('option', { name: '36351' }) as HTMLOptionElement
    expect(option.disabled).toBe(false)
    chooseCode('36351')
    expect(screen.queryByText(/แต่ยังบันทึกได้/)).toBeNull()
  })

  it('leaves the meaning list to the activity card', async () => {
    render(<PpCodeMapper activity={activity(2)} />)
    await waitFor(() => expect(check).toHaveBeenCalled())
    expect(screen.queryByText('รหัสตามเกณฑ์ของกิจกรรมนี้')).toBeNull()
  })
})

describe('what is left to set up', () => {
  const empty = toCoverage({ csmbs: [], nhso: [], tmlt: [], icd9: [], icd10tm: [], tmt: [] })

  it('leaves the missing code types to the summary at the end', () => {
    render(<PpCodeMapper activity={activity(2)} coverage={toCoverage({ csmbs: ['36350'] })} />)
    expect(screen.queryByText(/ยังขาดรหัสในระบบ/)).toBeNull()
    expect(screen.queryByText('มีรหัสในระบบครบทุกชนิดแล้ว')).toBeNull()
  })

  it('warns about drugs apart from the count', () => {
    render(<PpCodeMapper activity={activity(78)} coverage={empty} />)
    expect(screen.getByText('ยา/วัคซีนยังไม่มีรหัสตรงเกณฑ์ (ระบบตรวจได้อย่างเดียว) หากต้องการแก้ไข ให้แจ้งปรับรหัสใน Drug Catalog ก่อน แล้วจึงปรับในระบบ')).toBeTruthy()
  })

  it('shows no status before the coverage has loaded', () => {
    render(<PpCodeMapper activity={activity(2)} />)
    expect(screen.queryByText(/ยังขาดรหัสในระบบ/)).toBeNull()
  })

  it('asks for a refresh after a save', async () => {
    const onSaved = jest.fn()
    search.mockResolvedValue([item()])
    render(<PpCodeMapper activity={activity(2)} onSaved={onSaved} />)
    fireEvent.change(screen.getByLabelText('ค้นหารายการของ รพ.'), { target: { value: 'ทดสอบ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    fireEvent.click(await screen.findByRole('button', { name: 'เลือก' }))
    await waitFor(() => expect(codeSelect().disabled).toBe(false))
    chooseCode('36350')
    fireEvent.click(saveButton())
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  })
})

describe('the price question', () => {
  it('holds the save until Yes or No is answered', async () => {
    await searchAndPick(13, item({ price: 140 }))
    chooseCode('36003')
    expect(saveButton().disabled).toBe(true)
    expect(screen.getByText('ต้องการอัปเดตราคาให้ตรงตามเกณฑ์ด้วยหรือไม่')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(saveButton().disabled).toBe(false)
  })

  it('sends the price update on Yes', async () => {
    await searchAndPick(13, item({ price: 140 }))
    chooseCode('36003')
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    fireEvent.click(saveButton())
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith('csmbs', '3000001', '36003', null, { activityNo: 13, expected: 140 }))
  })

  it('leaves the price alone on No', async () => {
    await searchAndPick(13, item({ price: 140 }))
    chooseCode('36003')
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    fireEvent.click(saveButton())
    await waitFor(() => expect(save).toHaveBeenCalledWith('csmbs', '3000001', '36003', null, undefined))
  })

  it('does not ask when the price already matches', async () => {
    await searchAndPick(13, item({ price: 50 }))
    chooseCode('36003')
    expect(screen.queryByText('ต้องการอัปเดตราคาให้ตรงตามเกณฑ์ด้วยหรือไม่')).toBeNull()
    expect(saveButton().disabled).toBe(false)
  })

  it('does not ask for a bundled activity', async () => {
    await searchAndPick(2, item())
    chooseCode('36350')
    expect(screen.queryByText('ต้องการอัปเดตราคาให้ตรงตามเกณฑ์ด้วยหรือไม่')).toBeNull()
    expect(screen.getByText(/ราคาเป็นชุด/)).toBeTruthy()
  })
})

describe('drug codes', () => {
  it('warns about a mismatch and offers no way to save', async () => {
    search.mockResolvedValue([item({ current: '111111' })])
    render(<PpCodeMapper activity={activity(78)} />)
    fireEvent.change(screen.getByLabelText('ค้นหารายการของ รพ.'), { target: { value: 'ทดสอบ' } })
    fireEvent.click(screen.getByRole('button', { name: 'ค้นหา' }))
    expect(await screen.findByText('รหัสยา/วัคซีนไม่ตรง ให้แจ้งปรับรหัสใน Drug Catalog ก่อน แล้วจึงปรับในระบบ')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'เลือก' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'บันทึก' })).toBeNull()
  })
})

describe('mapped summary', () => {
  it('lists the items already set to a code in the criteria', async () => {
    mapped.mockImplementation(async target =>
      target === 'csmbs' ? [item({ code: '3001671', name: 'Anti HIV', current: '36350' })] : [])
    render(<PpCodeMapper activity={activity(2)} />)
    expect(await screen.findByText('1 รายการ')).toBeTruthy()
    expect(screen.getByText('Anti HIV')).toBeTruthy()
    expect(mapped).toHaveBeenCalledWith('csmbs', expect.arrayContaining(['36350']))
    expect(screen.getByText('ยังไม่ได้ตั้ง:').parentElement?.textContent).toContain('TMLT (Lab)')
    expect(screen.getByText('ยังไม่ได้ตั้ง:').parentElement?.textContent).not.toContain('CSMBS')
  })

  it('says every code type is set when none is missing', async () => {
    mapped.mockResolvedValue([item({ current: '36350' })])
    render(<PpCodeMapper activity={activity(2)} />)
    expect(await screen.findByText('ตั้งครบทุกชนิดรหัสแล้ว')).toBeTruthy()
  })

  it('says so when nothing is mapped yet', async () => {
    render(<PpCodeMapper activity={activity(2)} />)
    expect(await screen.findByText('ยังไม่มีรายการที่ตั้งรหัสตรงเกณฑ์')).toBeTruthy()
  })

  it('reloads after a save', async () => {
    await searchAndPick(2, item({ current: null }))
    const before = mapped.mock.calls.length
    chooseCode('36350')
    fireEvent.click(saveButton())
    await waitFor(() => expect(mapped.mock.calls.length).toBeGreaterThan(before))
  })
})

describe('search while typing', () => {
  afterEach(() => jest.useRealTimers())

  it('searches after a pause without pressing search', async () => {
    jest.useFakeTimers()
    search.mockResolvedValue([item()])
    render(<PpCodeMapper activity={activity(2)} />)
    fireEvent.change(screen.getByLabelText('ค้นหารายการของ รพ.'), { target: { value: 'ทดสอบ' } })
    expect(search).not.toHaveBeenCalled()
    await act(async () => { jest.advanceTimersByTime(400) })
    expect(search).toHaveBeenCalledWith('csmbs', 'ทดสอบ', false)
  })

  it('waits for two letters', async () => {
    jest.useFakeTimers()
    render(<PpCodeMapper activity={activity(2)} />)
    fireEvent.change(screen.getByLabelText('ค้นหารายการของ รพ.'), { target: { value: 'ท' } })
    await act(async () => { jest.advanceTimersByTime(1000) })
    expect(search).not.toHaveBeenCalled()
  })

  it('does not repeat a search already run, so a pick stays', async () => {
    await searchAndPick(2, item())
    await act(async () => { await new Promise(r => setTimeout(r, 500)) })
    expect(search).toHaveBeenCalledTimes(1)
    expect(codeSelect()).toBeTruthy()
  })
})
