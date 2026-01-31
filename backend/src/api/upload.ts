import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { AppError } from '../middleware/errorHandler'

export const uploadRouter = Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'model/gltf-binary',
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

// POST /api/upload/file - Upload file to IPFS
uploadRouter.post('/file', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400)
    }

    // In production, upload to Pinata or NFT.Storage
    // For now, return a mock IPFS URI
    const mockCid = `Qm${Buffer.from(Date.now().toString()).toString('base64').slice(0, 44)}`
    
    // Mock IPFS upload
    console.log(`Uploading file: ${req.file.originalname} (${req.file.size} bytes)`)
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    res.json({
      success: true,
      cid: mockCid,
      uri: `ipfs://${mockCid}`,
      gateway: `https://ipfs.io/ipfs/${mockCid}`,
      size: req.file.size,
      mimeType: req.file.mimetype,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/upload/metadata - Upload JSON metadata to IPFS
uploadRouter.post('/metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metadata = req.body

    if (!metadata || typeof metadata !== 'object') {
      throw new AppError('Invalid metadata', 400)
    }

    // Validate required fields
    if (!metadata.name) {
      throw new AppError('Metadata must include a name', 400)
    }

    // In production, upload to Pinata or NFT.Storage
    const mockCid = `Qm${Buffer.from(JSON.stringify(metadata)).toString('base64').slice(0, 44)}`
    
    console.log(`Uploading metadata for: ${metadata.name}`)
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500))

    res.json({
      success: true,
      cid: mockCid,
      uri: `ipfs://${mockCid}`,
      gateway: `https://ipfs.io/ipfs/${mockCid}`,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/upload/pin - Pin existing IPFS content
uploadRouter.post('/pin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cid } = req.body

    if (!cid) {
      throw new AppError('CID is required', 400)
    }

    // In production, pin to Pinata
    console.log(`Pinning CID: ${cid}`)

    res.json({
      success: true,
      cid,
      pinned: true,
    })
  } catch (error) {
    next(error)
  }
})
