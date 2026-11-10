import 'dotenv/config'
import path from 'path'
import fs from 'fs'
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

// After `npm run build`, serve the web page from the same port so one command runs everything.
const webDir = path.resolve(__dirname, '../../frontend/dist')
if (fs.existsSync(path.join(webDir, 'index.html'))) {
  app.use(express.static(webDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(webDir, 'index.html'))
  })
}

app.use(errorHandler)

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    console.log(`[server] Check Export NDP running on http://localhost:${PORT}`)
  })
}

export default app
