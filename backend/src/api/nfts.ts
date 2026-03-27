import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export const nftsRouter = Router()

// Query schema
const listNftsSchema = z.object({
  collection: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(['all', 'listed', 'has_offers']).optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  traits: z.string().optional(), // JSON string of trait filters
  search: z.string().optional(),
  sortBy: z.enum(['price', 'recent', 'rarity', 'favorites']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET /api/nfts - List NFTs with filters
nftsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listNftsSchema.parse(req.query)
    
    const page = parseInt(query.page || '1')
    const limit = Math.min(parseInt(query.limit || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {}

    if (query.collection) {
      const collection = await prisma.collection.findUnique({
        where: { contractAddress: query.collection },
      })
      if (collection) {
        where.collectionId = collection.id
      }
    }

    if (query.owner) {
      where.owner = query.owner
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ]
    }

    // Include listings for status and price filters
    const includeListings = query.status === 'listed' || query.minPrice || query.maxPrice

    if (query.status === 'listed') {
      where.listings = {
        some: {
          status: 'ACTIVE',
        },
      }
    }

    const orderBy: any = {}
    switch (query.sortBy) {
      case 'rarity':
        orderBy.rarityRank = query.sortOrder || 'asc'
        break
      case 'favorites':
        orderBy.favoriteCount = query.sortOrder || 'desc'
        break
      default:
        orderBy.createdAt = query.sortOrder || 'desc'
    }

    const [nfts, total] = await Promise.all([
      prisma.nft.findMany({
        where,
        include: {
          collection: {
            select: {
              name: true,
              contractAddress: true,
              verified: true,
            },
          },
          listings: {
            where: { status: 'ACTIVE' },
            take: 1,
          },
          _count: {
            select: { offers: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.nft.count({ where }),
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

// GET /api/nfts/:contract/:tokenId - Get NFT details
nftsRouter.get('/:contract/:tokenId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contract, tokenId } = req.params

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: contract },
    })

    if (!collection) {
      throw new AppError('Collection not found', 404)
    }

    const nft = await prisma.nft.findUnique({
      where: {
        collectionId_tokenId: {
          collectionId: collection.id,
          tokenId,
        },
      },
      include: {
        collection: true,
        listings: {
          where: { status: 'ACTIVE' },
        },
        offers: {
          where: { status: 'ACTIVE' },
          orderBy: { amount: 'desc' },
        },
      },
    })

    if (!nft) {
      throw new AppError('NFT not found', 404)
    }

    // Increment view count
    await prisma.nft.update({
      where: { id: nft.id },
      data: { viewCount: { increment: 1 } },
    })

    res.json({ nft })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfts/:contract/:tokenId/activity - Get NFT activity
nftsRouter.get('/:contract/:tokenId/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contract, tokenId } = req.params
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 100)

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: contract },
    })

    if (!collection) {
      throw new AppError('Collection not found', 404)
    }

    const nft = await prisma.nft.findUnique({
      where: {
        collectionId_tokenId: {
          collectionId: collection.id,
          tokenId,
        },
      },
    })

    if (!nft) {
      throw new AppError('NFT not found', 404)
    }

    const activities = await prisma.activity.findMany({
      where: { nftId: nft.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    res.json({ activities })
  } catch (error) {
    next(error)
  }
})

// GET /api/nfts/:contract/:tokenId/offers - Get NFT offers
nftsRouter.get('/:contract/:tokenId/offers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contract, tokenId } = req.params

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: contract },
    })

    if (!collection) {
      throw new AppError('Collection not found', 404)
    }

    const nft = await prisma.nft.findUnique({
      where: {
        collectionId_tokenId: {
          collectionId: collection.id,
          tokenId,
        },
      },
    })

    if (!nft) {
      throw new AppError('NFT not found', 404)
    }

    const offers = await prisma.offer.findMany({
      where: {
        nftId: nft.id,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { amount: 'desc' },
    })

    res.json({ offers })
  } catch (error) {
    next(error)
  }
})
