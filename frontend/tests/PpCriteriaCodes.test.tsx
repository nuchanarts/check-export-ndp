/** @jest-environment jsdom */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { PP_ACTIVITIES } from '../src/data/ppActivities'
import { PpCriteriaCodes } from '../src/components/pp/PpCriteriaCodes'
import { checkPpCodes } from '../src/services/ppMappingApi'

jest.mock('../src/services/ppMappingApi', () => ({
  ...jest.requireActual('../src/services/ppMappingApi'),
  checkPpCodes: jest.fn(),
}))

const check = checkPpCodes as jest.MockedFunction<typeof checkPpCodes>
const activity = (no: number) => PP_ACTIVITIES.find(a => a.no === no)!

beforeEach(() => {
  jest.resetAllMocks()
  check.mockImplementation(async (_target, codes) =>
    codes.map(code => (code === '36350'
      ? { code, name: 'ตรวจ Anti-HIV', exists: true }
      : { code, name: null, exists: false })))
})

afterEach(cleanup)

describe('PpCriteriaCodes', () => {
  it('lists the criteria codes with their meaning', async () => {
    render(<PpCriteriaCodes activity={activity(2)} />)
    expect(await screen.findByText('ตรวจ Anti-HIV')).toBeTruthy()
    expect(screen.getAllByText('ไม่พบความหมายใน nhso_adp_code').length).toBeGreaterThan(0)
    expect(screen.getByText('รหัสตามเกณฑ์ของกิจกรรมนี้')).toBeTruthy()
  })

  it('looks up only the types that have a meaning table', async () => {
    render(<PpCriteriaCodes activity={activity(2)} />)
    await screen.findByText('ตรวจ Anti-HIV')
    expect(check.mock.calls.map(([t]) => t).every(t => t === 'csmbs' || t === 'nhso')).toBe(true)
  })

  it('shows nothing for an activity with only ICD-10', async () => {
    const { container } = render(<PpCriteriaCodes activity={activity(1)} />)
    await waitFor(() => expect(container.textContent).toBe(''))
    expect(check).not.toHaveBeenCalled()
  })
})
