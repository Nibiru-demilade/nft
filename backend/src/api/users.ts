import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

export const usersRouter = Router()

// GET /api/users/:address - Get user profile
usersRouter.get('/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params

    let user = await prisma.user.findUnique({
      where: { address },
    })

    // Create user if not exists
    if (!user) {
      user = await prisma.user.create({
        data: { address },
      })
    }

    // Get stats
    const [ownedCount, createdCount, favoriteCount] = await Promise.all([
      prisma.nft.count({ where: { owner: address } }),
      prisma.nft.count({ where: { creator: address } }),
      prisma.favorite.count({ where: { userId: user.id } }),
    ])

    // Calculate volume traded
    const sales = await prisma.activity.aggregate({
      where: {
        OR: [
          { fromAddress: address, type: 'SALE' },
          { toAddress: address, type: 'SALE' },
        ],
      },
      _sum: { price: true },
    })

    res.json({
      user: {
        ...user,
        stats: {
          owned: ownedCount,
          created: createdCount,
          favorites: favoriteCount,
          volumeTraded: sales._sum.price?.toString() || '0',
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/users/:address/nfts - Get user's NFTs
usersRouter.get('/:address/nfts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params
    const type = req.query.type as string || 'owned'
    const page = parseInt(req.query.page as string || '1')
    const limit = Math.min(parseInt(req.query.limit as string || '20'), 100)
    const skip = (page - 1) * limit

    let where: any = {}

    switch (type) {
      case 'created':
        where.creator = address
        break
      case 'owned':
      default:
        where.owner = address
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
        },
        orderBy: { createdAt: 'desc' },
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

// GET /api/users/:address/activity - Get user's activity
usersRouter.get('/:address/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 100)

    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { fromAddress: address },
          { toAddress: address },
        ],
      },
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
              },
            },
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

// GET /api/users/:address/offers - Get user's offers
usersRouter.get('/:address/offers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params
    const type = req.query.type as string || 'made'

    let offers

    if (type === 'received') {
      // Offers on NFTs owned by this user
      offers = await prisma.offer.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
          nft: {
            owner: address,
          },
        },
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
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      // Offers made by this user
      offers = await prisma.offer.findMany({
        where: {
          bidder: address,
          status: 'ACTIVE',
        },
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
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    res.json({ offers })
  } catch (error) {
    next(error)
  }
})

// PUT /api/users/:address - Update user profile
const updateUserSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  banner: z.string().url().optional(),
  twitter: z.string().optional(),
  discord: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
})

usersRouter.put('/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params
    const data = updateUserSchema.parse(req.body)

    // TODO: Add signature verification to ensure user owns this address

    const user = await prisma.user.upsert({
      where: { address },
      update: data,
      create: {
        address,
        ...data,
      },
    })

    res.json({ user })
  } catch (error) {
    next(error)
  }
})
