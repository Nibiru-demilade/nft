import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export const listingsRouter = Router()

const listSchema = z.object({
  collection: z.string().optional(),
  seller: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  status: z.enum(['ACTIVE', 'SOLD', 'CANCELLED', 'EXPIRED']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})

// GET /api/listings - Active listings with optional filters
listingsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listSchema.parse(req.query)
    const page = parseInt(query.page || '1')
    const limit = Math.min(parseInt(query.limit || '20'), 100)
    const skip = (page - 1) * limit

    const where: any = {
      status: query.status || 'ACTIVE',
      expiresAt: { gt: new Date() },
    }

    if (query.collection) {
      const col = await prisma.collection.findUnique({
        where: { contractAddress: query.collection },
      })
      if (col) where.nft = { collectionId: col.id }
    }

    if (query.seller) {
      where.seller = query.seller
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {}
      if (query.minPrice !== undefined) where.price.gte = BigInt(query.minPrice)
      if (query.maxPrice !== undefined) where.price.lte = BigInt(query.maxPrice)
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          nft: {
            include: {
              collection: {
                select: {
                  name: true,
                  contractAddress: true,
                  verified: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ])

    res.json({
      listings,
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
