import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export const discoveryRouter = Router()

// GET /api/trending - Trending collections (by volume / recent sales)
discoveryRouter.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || '24h'
    const limit = Math.min(parseInt((req.query.limit as string) || '10'), 50)

    const collections = await prisma.collection.findMany({
      orderBy: { totalVolume: 'desc' },
      take: limit,
      select: {
        contractAddress: true,
        name: true,
        image: true,
        banner: true,
        verified: true,
        floorPrice: true,
        totalVolume: true,
        totalSales: true,
        itemCount: true,
        ownerCount: true,
      },
    })

    res.json({
      trending: collections.map((c) => ({
        ...c,
        floorPrice: c.floorPrice?.toString(),
        totalVolume: c.totalVolume.toString(),
      })),
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/recent - Recently listed NFTs
discoveryRouter.get('/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50)

    const listings = await prisma.listing.findMany({
      where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
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
      take: limit,
    })

    res.json({
      recent: listings.map((l) => ({
        id: l.id,
        nft: l.nft,
        price: l.price.toString(),
        denom: l.denom,
        seller: l.seller,
        createdAt: l.createdAt,
      })),
    })
  } catch (error) {
    next(error)
  }
})
