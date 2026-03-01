import express from 'express'
import path from 'path'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

import { collectionsRouter } from './api/collections'
import { nftsRouter } from './api/nfts'
import { usersRouter } from './api/users'
import { activityRouter } from './api/activity'
import { statsRouter } from './api/stats'
import { uploadRouter } from './api/upload'
import { listingsRouter } from './api/listings'
import { discoveryRouter } from './api/discovery'
import { contractActionsRouter } from './api/contractActions'
import { errorHandler } from './middleware/errorHandler'
import { startIndexer } from './indexer'

dotenv.config()

// Allow JSON serialization of Prisma BigInt fields
;(BigInt.prototype as any).toJSON = function () { return this.toString() }

const app = express()
const PORT = process.env.PORT || 3001
const USE_MOCK_CONTRACTS = process.env.USE_MOCK_CONTRACTS === 'true'

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(morgan('combined'))
app.use(express.json())

// Static uploads (MVP: local file storage)
const uploadsDir = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsDir))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), useMockContracts: USE_MOCK_CONTRACTS })
})

// API routes
app.use('/api', discoveryRouter) // GET /api/trending, GET /api/recent (mount first so paths don't conflict)
app.use('/api/collections', collectionsRouter)
app.use('/api/nfts', nftsRouter)
app.use('/api/users', usersRouter)
app.use('/api/activity', activityRouter)
app.use('/api/stats', statsRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/listings', listingsRouter)
app.use('/api', contractActionsRouter) // POST /api/mint, /api/list, /api/buy, /api/cancel-listing

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  if (USE_MOCK_CONTRACTS) console.log('Using mock contract service (USE_MOCK_CONTRACTS=true)')

  // Start blockchain indexer only when using real contracts
  if (!USE_MOCK_CONTRACTS && process.env.ENABLE_INDEXER === 'true') {
    startIndexer().catch(console.error)
  }
})

export default app
