import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { contractService } from '../services/contracts'

export const collectionsRouter = Router()

const createCollectionSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  creator: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
})

// POST /api/collections/create - Create collection (uses contract service: mock or real)
collectionsRouter.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCollectionSchema.parse(req.body)
    const result = await contractService.createCollection(body)
    res.status(201).json(result)
  } catch (error) {
    next(error instanceof Error ? error : new AppError('Create collection failed', 400))
  }
})

// Query schema
const listCollectionsSchema = z.object({
  creator: z.string().optional(),
  verified: z.string().optional(),
  featured: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['volume', 'floor', 'created', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET /api/collections - List all collections
collectionsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listCollectionsSchema.parse(req.query)
    
    const page = parseInt(query.page || '1')
    const limit = Math.min(parseInt(query.limit || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (query.creator) {
      where.creator = query.creator
    }

    if (query.verified === 'true') {
      where.verified = true
    }

    if (query.featured === 'true') {
      where.featured = true
    }

    if (query.category) {
      where.categories = { has: query.category }
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const orderBy: any = {}
    switch (query.sortBy) {
      case 'volume':
        orderBy.totalVolume = query.sortOrder || 'desc'
        break
      case 'floor':
        orderBy.floorPrice = query.sortOrder || 'asc'
        break
      case 'name':
        orderBy.name = query.sortOrder || 'asc'
        break
      default:
        orderBy.createdAt = query.sortOrder || 'desc'
    }

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.collection.count({ where }),
    ])

    res.json({
      collections,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/collections/:address - Get collection by address
collectionsRouter.get('/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: address },
      include: {
        _count: {
          select: { nfts: true },
        },
      },
    })

    if (!collection) {
      throw new AppError('Collection not found', 404)
    }

    res.json({ collection })
  } catch (error) {
    next(error)
  }
})

// GET /api/collections/:address/nfts - Get NFTs in collection
collectionsRouter.get('/:address/nfts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params
    const page = parseInt(req.query.page as string || '1')
    const limit = Math.min(parseInt(req.query.limit as string || '20'), 100)
    const skip = (page - 1) * limit

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: address },
    })

    if (!collection) {
      throw new AppError('Collection not found', 404)
    }

    const [nfts, total] = await Promise.all([
      prisma.nft.findMany({
        where: { collectionId: collection.id },
        include: {
          listings: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
        },
        skip,
        take: limit,
      }),
      prisma.nft.count({ where: { collectionId: collection.id } }),
    ])

    res.json({
      nfts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/collections/:address/activity - Get collection activity
collectionsRouter.get('/:address/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 100)

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: address },
    })

    if (!collection) {
      throw new AppError('Collection not found', 404)
    }

    const activities = await prisma.activity.findMany({
      where: {
        nft: {
          collectionId: collection.id,
        },
      },
      include: {
        nft: {
          select: {
            tokenId: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    res.json({ activities })
  } catch (error) {
    next(error)
  }
})

// GET /api/collections/:address/stats - Get collection stats
collectionsRouter.get('/:address/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: address },
      select: {
        floorPrice: true,
        totalVolume: true,
        totalSales: true,
        totalListings: true,
        ownerCount: true,
        itemCount: true,
      },
    })

    if (!collection) {
      throw new AppError('Collection not found', 404)
    }

    res.json({ stats: collection })
  } catch (error) {
    next(error)
  }
})
