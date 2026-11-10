import { Router, Request, Response } from 'express'
import authRouter from './auth'
import ppMappingRouter from './ppMapping'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

router.use('/auth', authRouter)
router.use('/pp-mapping', ppMappingRouter)

export default router
