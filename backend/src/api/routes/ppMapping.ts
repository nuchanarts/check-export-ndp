import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { requireEditor } from '../../middleware/auth'
import { AppError } from '../../middleware/errorHandler'
import { PP_TARGETS, checkCodes, coverage, mappedItems, saveCode, searchItems, type PpTarget } from '../../services/ppMapping'

const router = Router()

const MAX_CODES = 400

const saveSchema = z.object({
  value: z.string().min(1).max(50),
  expected: z.string().max(50).nullable().optional(),
  price: z.object({ activityNo: z.number().int().positive(), expected: z.number().nullable() }).optional(),
})

function targetOf(value: unknown): PpTarget {
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(PP_TARGETS, value)) return value as PpTarget
  throw new AppError(400, 'INVALID_TARGET', 'ไม่พบชนิดรหัสนี้')
}

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = targetOf(req.query.target)
    const text = String(req.query.q ?? '').trim()
    if (text.length < 2) throw new AppError(400, 'QUERY_TOO_SHORT', 'พิมพ์คำค้นอย่างน้อย 2 ตัวอักษร')
    res.json(await searchItems(target, text, req.query.includeInactive === '1'))
  } catch (err) { next(err) }
})

router.get('/coverage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await coverage())
  } catch (err) { next(err) }
})

function codesOf(value: unknown): string[] {
  return String(value ?? '').split(',').map(c => c.trim()).filter(Boolean).slice(0, MAX_CODES)
}

router.get('/code-check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = targetOf(req.query.target)
    res.json(await checkCodes(target, codesOf(req.query.codes)))
  } catch (err) { next(err) }
})

router.get('/mapped', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = targetOf(req.query.target)
    res.json(await mappedItems(target, codesOf(req.query.codes)))
  } catch (err) { next(err) }
})

router.put('/:target/:code', requireEditor, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = targetOf(req.params.target)
    const parsed = saveSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError(400, 'INVALID_BODY', 'ต้องระบุรหัสที่จะบันทึก')
    const actor = req.authUser ?? req.header('x-actor') ?? 'pp-manual'
    await saveCode(target, String(req.params.code), parsed.data.value, parsed.data.expected, actor, parsed.data.price)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
