import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export const statsRouter = Router()

// GET /api/stats - Get global marketplace stats
statsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let stats = await prisma.globalStats.findUnique({
      where: { id: 'global' },
    })

    if (!stats) {
      // Calculate stats if not cached
      const [totalVolume, totalSales, totalCollections, totalNfts, totalUsers] = await Promise.all([
        prisma.activity.aggregate({
          where: { type: 'SALE' },
          _sum: { price: true },
        }),
        prisma.activity.count({ where: { type: 'SALE' } }),
        prisma.collection.count(),
        prisma.nft.count(),
        prisma.user.count(),
      ])

      stats = await prisma.globalStats.upsert({
        where: { id: 'global' },
        update: {
          totalVolume: totalVolume._sum.price || BigInt(0),
          totalSales,
          totalCollections,
          totalNfts,
          totalUsers,
        },
        create: {
          id: 'global',
          totalVolume: totalVolume._sum.price || BigInt(0),
          totalSales,
          totalCollections,
          totalNfts,
          totalUsers,
        },
      })
    }

    res.json({
      stats: {
        totalVolume: stats.totalVolume.toString(),
        totalSales: stats.totalSales,
        totalCollections: stats.totalCollections,
        totalNfts: stats.totalNfts,
        totalUsers: stats.totalUsers,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/stats/trending - Get trending collections
statsRouter.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = req.query.period as string || '24h'
    const limit = Math.min(parseInt(req.query.limit as string || '10'), 50)

    // Get timestamp for period start
    const now = new Date()
    let periodStart: Date
    switch (period) {
      case '7d':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default: // 24h
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get collections with most sales volume in period
    const trending = await prisma.collection.findMany({
      orderBy: { totalVolume: 'desc' },
      take: limit,
      select: {
        contractAddress: true,
        name: true,
        image: true,
        verified: true,
        floorPrice: true,
        totalVolume: true,
        _count: {
          select: { nfts: true },
        },
      },
    })

    res.json({ trending })
  } catch (error) {
    next(error)
  }
})

// GET /api/stats/top-sales - Get top sales
statsRouter.get('/top-sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '10'), 50)

    const topSales = await prisma.activity.findMany({
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
      orderBy: { price: 'desc' },
      take: limit,
    })

    res.json({ topSales })
  } catch (error) {
    next(error)
  }
})
