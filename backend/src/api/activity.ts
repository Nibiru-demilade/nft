import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export const activityRouter = Router()

// Query schema
const listActivitySchema = z.object({
  collection: z.string().optional(),
  type: z.string().optional(),
  limit: z.string().optional(),
  cursor: z.string().optional(),
})

// GET /api/activity - Get global activity feed
activityRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listActivitySchema.parse(req.query)
    const limit = Math.min(parseInt(query.limit || '50'), 100)

    const where: any = {}

    if (query.collection) {
      const collection = await prisma.collection.findUnique({
        where: { contractAddress: query.collection },
      })
      if (collection) {
        where.nft = { collectionId: collection.id }
      }
    }

    if (query.type) {
      const types = query.type.split(',')
      where.type = { in: types }
    }

    if (query.cursor) {
      where.id = { lt: query.cursor }
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        nft: {
          select: {
            tokenId: true,
            name: true,
            image: true,
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
      orderBy: { timestamp: 'desc' },
      take: limit + 1, // Get one extra to check if there are more
    })

    const hasMore = activities.length > limit
    const items = hasMore ? activities.slice(0, -1) : activities
    const nextCursor = hasMore ? items[items.length - 1].id : null

    res.json({
      activities: items,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/activity/sales - Get recent sales
activityRouter.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '20'), 100)

    const sales = await prisma.activity.findMany({
      where: { type: 'SALE' },
      include: {
        nft: {
          select: {
            tokenId: true,
            name: true,
            image: true,
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
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    res.json({ sales })
  } catch (error) {
    next(error)
  }
})

// GET /api/activity/listings - Get recent listings
activityRouter.get('/listings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '20'), 100)

    const listings = await prisma.listing.findMany({
      where: { status: 'ACTIVE' },
      include: {
        nft: {
          select: {
            tokenId: true,
            name: true,
            image: true,
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
      take: limit,
    })

    res.json({ listings })
  } catch (error) {
    next(error)
  }
})
