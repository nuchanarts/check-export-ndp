/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PpSop } from '../src/components/pp/PpSop'

afterEach(cleanup)

const openSop = () => fireEvent.click(screen.getByRole('button', { name: /SOP การใช้งาน/ }))

describe('PpSop', () => {
  it('is a button until pressed', () => {
    render(<PpSop />)
    expect(screen.queryByRole('dialog')).toBeNull()
    openSop()
    expect(screen.getByRole('dialog', { name: 'SOP การใช้งาน' })).toBeTruthy()
  })

  it('lists the seven steps in order', () => {
    render(<PpSop />)
    openSop()
    const steps = screen.getAllByRole('listitem').filter(li => li.closest('ol'))
    expect(steps).toHaveLength(7)
    expect(steps[0].textContent).toContain('กรองงานที่ต้องทำ')
    expect(steps[6].textContent).toContain('ตรวจผล')
  })

  it('closes on Escape and on the close button', () => {
    render(<PpSop />)
    openSop()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    openSop()
    fireEvent.click(screen.getByRole('button', { name: 'ปิด', exact: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('starts on the unfinished work', () => {
    const onStart = jest.fn()
    render(<PpSop onStart={onStart} />)
    openSop()
    fireEvent.click(screen.getByRole('button', { name: /เริ่มเก็บงานที่ยังไม่สมบูรณ์/ }))
    expect(onStart).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
