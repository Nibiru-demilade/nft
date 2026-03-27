import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { AppError } from '../middleware/errorHandler'
import { randomUUID } from 'crypto'

export const uploadRouter = Router()

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const IPFS_ENABLED = process.env.IPFS_ENABLED === 'true'

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

function getBaseUrl(): string {
  const port = process.env.PORT || '3001'
  const host = process.env.BASE_URL || `http://localhost:${port}`
  return host.replace(/\/$/, '')
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || path.extname(file.mimetype?.split('/')[1] || '') || '.bin'
    cb(null, `${randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'model/gltf-binary',
      'application/json',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

// POST /api/upload - Single file upload (MVP: local; optional IPFS)
uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400)
    }

    if (IPFS_ENABLED && process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
      const buf = fs.readFileSync(req.file.path)
      const formData = new FormData()
      formData.append('file', new Blob([buf], { type: req.file.mimetype }), req.file.originalname)
      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY!,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
        },
        body: formData as any,
      })
      if (!pinataRes.ok) {
        const err = await pinataRes.text()
        throw new AppError(`Pinata upload failed: ${err}`, 502)
      }
      const data = (await pinataRes.json()) as { IpfsHash: string }
      const cid = data.IpfsHash
      return res.json({
        success: true,
        cid,
        uri: `ipfs://${cid}`,
        gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
        url: `https://gateway.pinata.cloud/ipfs/${cid}`,
        size: req.file.size,
        mimeType: req.file.mimetype,
      })
    }

    // MVP: already saved to disk by multer
    const url = `${getBaseUrl()}/uploads/${req.file.filename}`
    res.json({
      success: true,
      url,
      uri: url,
      filename: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/upload/file - Legacy endpoint: file upload (MVP: local storage)
uploadRouter.post('/file', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file provided', 400)
    }

    if (IPFS_ENABLED && process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
      const buf = fs.readFileSync(req.file.path)
      const formData = new FormData()
      formData.append('file', new Blob([buf], { type: req.file.mimetype }), req.file.originalname)
      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY!,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
        },
        body: formData as any,
      })
      if (!pinataRes.ok) throw new AppError('Pinata upload failed', 502)
      const data = (await pinataRes.json()) as { IpfsHash: string }
      const cid = data.IpfsHash
      return res.json({
        success: true,
        cid,
        uri: `ipfs://${cid}`,
        gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
        url: `https://gateway.pinata.cloud/ipfs/${cid}`,
        size: req.file.size,
        mimeType: req.file.mimetype,
      })
    }

    const url = `${getBaseUrl()}/uploads/${req.file.filename}`
    res.json({
      success: true,
      url,
      uri: url,
      cid: req.file.filename,
      gateway: url,
      size: req.file.size,
      mimeType: req.file.mimetype,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/upload/metadata - Save metadata JSON locally and return URL
uploadRouter.post('/metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metadata = req.body
    if (!metadata || typeof metadata !== 'object') {
      throw new AppError('Invalid metadata', 400)
    }
    if (!metadata.name) {
      throw new AppError('Metadata must include a name', 400)
    }

    if (IPFS_ENABLED && process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
      const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      const formData = new FormData()
      formData.append('file', blob, 'metadata.json')
      const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY!,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
        },
        body: formData as any,
      })
      if (!pinataRes.ok) throw new AppError('Pinata metadata upload failed', 502)
      const data = (await pinataRes.json()) as { IpfsHash: string }
      const cid = data.IpfsHash
      return res.json({
        success: true,
        cid,
        uri: `ipfs://${cid}`,
        gateway: `https://gateway.pinata.cloud/ipfs/${cid}`,
      })
    }

    const filename = `metadata_${randomUUID()}.json`
    const filepath = path.join(UPLOAD_DIR, filename)
    fs.writeFileSync(filepath, JSON.stringify(metadata, null, 2))
    const url = `${getBaseUrl()}/uploads/${filename}`
    res.json({
      success: true,
      uri: url,
      url,
      cid: filename,
      gateway: url,
    })
  } catch (error) {
    next(error)
  }
})
