/**
 * Mock contract service: simulates mint, list, buy, cancel, createCollection
 * by writing directly to the database. Used when USE_MOCK_CONTRACTS=true.
 */

import { randomUUID } from 'crypto'
import { prisma } from '../lib/prisma'

function fakeTxHash(): string {
  return `mock_tx_${randomUUID().replace(/-/g, '')}`
}

function fakeContractAddress(): string {
  return `mock_contract_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

export interface ContractService {
  mintNFT(params: {
    collectionAddress: string
    tokenId: string
    owner: string
    tokenUri: string
    name?: string
    description?: string
    image?: string
    traits?: object
  }): Promise<{ txHash: string }>
  listNFT(params: {
    collectionAddress: string
    tokenId: string
    price: string
    seller: string
    durationSeconds?: number
  }): Promise<{ txHash: string; listingId: string }>
  buyNFT(params: { listingId: string; buyer: string }): Promise<{ txHash: string }>
  cancelListing(params: { listingId: string; seller: string }): Promise<{ txHash: string }>
  createCollection(params: {
    name: string
    symbol: string
    creator: string
    description?: string
    image?: string
  }): Promise<{ contractAddress: string; txHash: string }>
}

export const contractMock: ContractService = {
  async mintNFT(params) {
    const { collectionAddress, tokenId, owner, tokenUri, name, description, image, traits } = params

    let collection = await prisma.collection.findUnique({
      where: { contractAddress: collectionAddress },
    })
    if (!collection) {
      throw new Error(`Collection not found: ${collectionAddress}`)
    }

    const nft = await prisma.nft.upsert({
      where: {
        collectionId_tokenId: {
          collectionId: collection.id,
          tokenId,
        },
      },
      update: { owner, metadataUri: tokenUri, name: name ?? undefined, description: description ?? undefined, image: image ?? undefined, traits: traits ?? undefined },
      create: {
        collectionId: collection.id,
        tokenId,
        owner,
        creator: owner,
        metadataUri: tokenUri,
        name: name ?? `Token #${tokenId}`,
        description: description ?? undefined,
        image: image ?? undefined,
        traits: traits ?? undefined,
        mintedAt: new Date(),
      },
    })

    await prisma.activity.create({
      data: {
        nftId: nft.id,
        type: 'MINT',
        toAddress: owner,
        txHash: fakeTxHash(),
      },
    })

    await prisma.collection.update({
      where: { id: collection.id },
      data: { itemCount: { increment: 1 } },
    })

    await prisma.user.upsert({
      where: { address: owner },
      update: {},
      create: { address: owner },
    })

    return { txHash: fakeTxHash() }
  },

  async listNFT(params) {
    const { collectionAddress, tokenId, price, seller, durationSeconds = 30 * 24 * 3600 } = params

    const collection = await prisma.collection.findUnique({
      where: { contractAddress: collectionAddress },
    })
    if (!collection) throw new Error('Collection not found')

    const nft = await prisma.nft.findFirst({
      where: {
        collectionId: collection.id,
        tokenId,
        owner: seller,
      },
    })
    if (!nft) throw new Error('NFT not found or not owned by seller')

    const expiresAt = new Date(Date.now() + durationSeconds * 1000)

    const listing = await prisma.listing.create({
      data: {
        nftId: nft.id,
        seller,
        listingType: 'FIXED_PRICE',
        price: BigInt(price),
        denom: 'unibi',
        expiresAt,
        status: 'ACTIVE',
      },
    })

    await prisma.activity.create({
      data: {
        nftId: nft.id,
        type: 'LIST',
        fromAddress: seller,
        price: BigInt(price),
        denom: 'unibi',
        txHash: fakeTxHash(),
      },
    })

    await prisma.collection.update({
      where: { id: collection.id },
      data: { totalListings: { increment: 1 } },
    })

    return { txHash: fakeTxHash(), listingId: listing.id }
  },

  async buyNFT(params) {
    const { listingId, buyer } = params

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { nft: true },
    })
    if (!listing) throw new Error('Listing not found')
    if (listing.status !== 'ACTIVE') throw new Error('Listing is not active')
    if (listing.seller === buyer) throw new Error('Cannot buy your own listing')

    await prisma.$transaction([
      prisma.listing.update({
        where: { id: listingId },
        data: { status: 'SOLD' },
      }),
      prisma.nft.update({
        where: { id: listing.nftId },
        data: { owner: buyer },
      }),
      prisma.activity.create({
        data: {
          nftId: listing.nftId,
          type: 'SALE',
          fromAddress: listing.seller,
          toAddress: buyer,
          price: listing.price,
          denom: listing.denom,
          txHash: fakeTxHash(),
        },
      }),
    ])

    const collection = await prisma.collection.findUnique({
      where: { id: listing.nft.collectionId },
    })
    if (collection) {
      await prisma.collection.update({
        where: { id: collection.id },
        data: {
          totalVolume: { increment: listing.price },
          totalSales: { increment: 1 },
          totalListings: { decrement: 1 },
        },
      })
    }

    await prisma.user.upsert({
      where: { address: buyer },
      update: {},
      create: { address: buyer },
    })

    return { txHash: fakeTxHash() }
  },

  async cancelListing(params) {
    const { listingId, seller } = params

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { nft: true },
    })
    if (!listing) throw new Error('Listing not found')
    if (listing.seller !== seller) throw new Error('Not the seller')

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'CANCELLED' },
    })

    await prisma.activity.create({
      data: {
        nftId: listing.nftId,
        type: 'UNLIST',
        fromAddress: seller,
        txHash: fakeTxHash(),
      },
    })

    const collection = await prisma.collection.findUnique({
      where: { id: listing.nft.collectionId },
    })
    if (collection) {
      await prisma.collection.update({
        where: { id: collection.id },
        data: { totalListings: { decrement: 1 } },
      })
    }

    return { txHash: fakeTxHash() }
  },

  async createCollection(params) {
    const { name, symbol, creator, description, image } = params

    const contractAddress = fakeContractAddress()

    await prisma.collection.create({
      data: {
        contractAddress,
        name,
        symbol,
        description: description ?? null,
        image: image ?? null,
        creator,
        categories: [],
      },
    })

    await prisma.user.upsert({
      where: { address: creator },
      update: {},
      create: { address: creator },
    })

    return {
      contractAddress,
      txHash: fakeTxHash(),
    }
  },
}
