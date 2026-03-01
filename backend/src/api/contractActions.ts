import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { contractService } from '../services/contracts'
import { AppError } from '../middleware/errorHandler'

export const contractActionsRouter = Router()

const mintSchema = z.object({
  collectionAddress: z.string(),
  tokenId: z.string(),
  owner: z.string(),
  tokenUri: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  traits: z.record(z.unknown()).optional(),
})

const listSchema = z.object({
  collectionAddress: z.string(),
  tokenId: z.string(),
  price: z.string(),
  seller: z.string(),
  durationSeconds: z.number().optional(),
})

const buySchema = z.object({
  listingId: z.string(),
  buyer: z.string(),
})

const cancelListingSchema = z.object({
  listingId: z.string(),
  seller: z.string(),
})

const createCollectionSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  creator: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
})

// POST /api/mint
contractActionsRouter.post('/mint', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = mintSchema.parse(req.body)
    const result = await contractService.mintNFT({
      ...body,
      traits: body.traits ? (body.traits as object) : undefined,
    })
    res.json(result)
  } catch (error) {
    next(error instanceof Error ? error : new AppError('Mint failed', 400))
  }
})

// POST /api/list
contractActionsRouter.post('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = listSchema.parse(req.body)
    const result = await contractService.listNFT(body)
    res.json(result)
  } catch (error) {
    next(error instanceof Error ? error : new AppError('List failed', 400))
  }
})

// POST /api/buy
contractActionsRouter.post('/buy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = buySchema.parse(req.body)
    const result = await contractService.buyNFT(body)
    res.json(result)
  } catch (error) {
    next(error instanceof Error ? error : new AppError('Buy failed', 400))
  }
})

// POST /api/cancel-listing
contractActionsRouter.post('/cancel-listing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = cancelListingSchema.parse(req.body)
    const result = await contractService.cancelListing(body)
    res.json(result)
  } catch (error) {
    next(error instanceof Error ? error : new AppError('Cancel listing failed', 400))
  }
})
