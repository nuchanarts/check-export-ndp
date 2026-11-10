import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import apiRouter from './api/routes/index'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'

const app = express()
const PORT = process.env['PORT'] ?? 6010

app.use(cors())
app.use(express.json())
app.use(requestLogger)
app.use('/api', apiRouter)
app.use(errorHandler)

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server] Check Export NDP API running on http://localhost:${PORT}`)
  })
}

export default app
