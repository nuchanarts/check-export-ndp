/** Calls for the code setup panel. Uses the global axios because the login token lives on axios.defaults. */
import axios from 'axios'
import { toCoverage, type PpCoverage, type PpMapTarget } from '../data/ppCodeTargets'

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

export async function searchPpItems(target: PpMapTarget, q: string, includeInactive: boolean): Promise<PpItem[]> {
  const params = { target, q, ...(includeInactive ? { includeInactive: '1' } : {}) }
  const { data } = await axios.get<PpItem[]>('/api/pp-mapping/search', { params })
  return data
}

export async function fetchPpCoverage(): Promise<PpCoverage> {
  const { data } = await axios.get<Partial<Record<PpMapTarget, string[]>>>('/api/pp-mapping/coverage')
  return toCoverage(data)
}

/** Active hospital items already holding one of `codes`. The server returns at most 200. */
export async function fetchPpMapped(target: PpMapTarget, codes: string[]): Promise<PpItem[]> {
  const { data } = await axios.get<PpItem[]>('/api/pp-mapping/mapped', {
    params: { target, codes: codes.join(',') },
  })
  return data
}

export const PP_MAPPED_LIMIT = 200

export async function checkPpCodes(target: PpMapTarget, codes: string[]): Promise<PpCodeCheck[]> {
  const { data } = await axios.get<PpCodeCheck[]>('/api/pp-mapping/code-check', {
    params: { target, codes: codes.join(',') },
  })
  return data
}

export async function savePpCode(
  target: PpMapTarget,
  code: string,
  value: string,
  expected: string | null,
  price?: { activityNo: number; expected: number | null },
): Promise<void> {
  await axios.put(`/api/pp-mapping/${target}/${encodeURIComponent(code)}`, { value, expected, price })
}

export function ppErrorMessage(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response
  if (response?.status === 401 || response?.status === 403) {
    return 'ไม่มีสิทธิ์แก้ไขข้อมูล กรุณาเข้าสู่ระบบด้วยบัญชีผู้แก้ไข'
  }
  if (response?.status === 409) return 'มีผู้แก้ไขรายการนี้ไปแล้ว กรุณาค้นหาใหม่'
  return response?.data?.message ?? (err instanceof Error ? err.message : String(err))
}
