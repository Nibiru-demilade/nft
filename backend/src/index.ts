import express from 'express'
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
import { errorHandler } from './middleware/errorHandler'
import { startIndexer } from './indexer'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(morgan('combined'))
app.use(express.json())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/collections', collectionsRouter)
app.use('/api/nfts', nftsRouter)
app.use('/api/users', usersRouter)
app.use('/api/activity', activityRouter)
app.use('/api/stats', statsRouter)
app.use('/api/upload', uploadRouter)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  
  // Start blockchain indexer
  if (process.env.ENABLE_INDEXER === 'true') {
    startIndexer().catch(console.error)
  }
})

export default app
