import { ppErrorMessage } from '../src/services/ppMappingApi'

const http = (status: number, message?: string) => ({ isAxiosError: true, response: { status, data: { message } } })

describe('ppErrorMessage', () => {
  it('explains a missing login', () => {
    expect(ppErrorMessage(http(401))).toBe('ไม่มีสิทธิ์แก้ไขข้อมูล กรุณาเข้าสู่ระบบด้วยบัญชีผู้แก้ไข')
  })

  it('explains a viewer account', () => {
    expect(ppErrorMessage(http(403))).toBe('ไม่มีสิทธิ์แก้ไขข้อมูล กรุณาเข้าสู่ระบบด้วยบัญชีผู้แก้ไข')
  })

  it('explains a stale value', () => {
    expect(ppErrorMessage(http(409))).toBe('มีผู้แก้ไขรายการนี้ไปแล้ว กรุณาค้นหาใหม่')
  })

  it('uses the server message for other errors', () => {
    expect(ppErrorMessage(http(400, 'รหัส 1 ไม่อยู่ในเกณฑ์ตามคู่มือ'))).toBe('รหัส 1 ไม่อยู่ในเกณฑ์ตามคู่มือ')
  })

  it('falls back when there is no server message', () => {
    expect(ppErrorMessage(new Error('Network Error'))).toBe('Network Error')
  })
})
