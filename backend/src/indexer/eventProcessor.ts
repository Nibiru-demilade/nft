import { prisma } from '../lib/prisma'

export type EventType =
  | 'mint'
  | 'transfer_nft'
  | 'send_nft'
  | 'burn'
  | 'list_fixed_price'
  | 'list_auction'
  | 'cancel_listing'
  | 'buy'
  | 'place_bid'
  | 'accept_bid'
  | 'settle_auction'
  | 'make_offer'
  | 'accept_offer'
  | 'cancel_offer'
  | 'create_collection'

interface EventData {
  type: EventType
  contractAddress: string
  attributes: Record<string, string>
  blockHeight: number
}

export async function processEvent(event: EventData) {
  const { type, contractAddress, attributes, blockHeight } = event

  try {
    switch (type) {
      case 'mint':
        await handleMint(contractAddress, attributes, blockHeight)
        break
      case 'transfer_nft':
      case 'send_nft':
        await handleTransfer(contractAddress, attributes, blockHeight)
        break
      case 'burn':
        await handleBurn(contractAddress, attributes, blockHeight)
        break
      case 'list_fixed_price':
      case 'list_auction':
        await handleList(contractAddress, attributes, blockHeight, type)
        break
      case 'cancel_listing':
        await handleUnlist(contractAddress, attributes, blockHeight)
        break
      case 'buy':
      case 'accept_bid':
      case 'settle_auction':
        await handleSale(contractAddress, attributes, blockHeight)
        break
      case 'place_bid':
        await handleBid(contractAddress, attributes, blockHeight)
        break
      case 'make_offer':
        await handleMakeOffer(contractAddress, attributes, blockHeight)
        break
      case 'accept_offer':
        await handleAcceptOffer(contractAddress, attributes, blockHeight)
        break
      case 'cancel_offer':
        await handleCancelOffer(contractAddress, attributes, blockHeight)
        break
      case 'create_collection':
        await handleCreateCollection(contractAddress, attributes, blockHeight)
        break
    }
  } catch (error) {
    console.error(`Error processing ${type} event:`, error)
  }
}

async function handleMint(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const tokenId = attributes['token_id']
  const owner = attributes['owner']
  const tokenUri = attributes['token_uri']

  // Find or create collection
  let collection = await prisma.collection.findUnique({
    where: { contractAddress },
  })

  if (!collection) {
    // Create placeholder collection - details will be fetched later
    collection = await prisma.collection.create({
      data: {
        contractAddress,
        name: `Collection ${contractAddress.slice(0, 10)}...`,
        symbol: 'NFT',
        creator: owner,
      },
    })
  }

  // Create NFT
  const nft = await prisma.nft.upsert({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
    update: {
      owner,
      metadataUri: tokenUri,
    },
    create: {
      collectionId: collection.id,
      tokenId,
      owner,
      creator: owner,
      metadataUri: tokenUri,
      mintedAt: new Date(),
    },
  })

  // Create activity
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'MINT',
      toAddress: owner,
    },
  })

  // Update collection stats
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      itemCount: { increment: 1 },
    },
  })

  console.log(`Minted NFT: ${contractAddress}/${tokenId}`)
}

async function handleTransfer(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const tokenId = attributes['token_id']
  // CW721 uses "from"/"to"; some contracts use "sender"/"recipient"
  const sender = attributes['from'] || attributes['sender']
  const recipient = attributes['to'] || attributes['recipient']

  const collection = await prisma.collection.findUnique({
    where: { contractAddress },
  })

  if (!collection) return

  const nft = await prisma.nft.findUnique({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
  })

  if (!nft) return

  // Update owner
  await prisma.nft.update({
    where: { id: nft.id },
    data: { owner: recipient },
  })

  // Create activity
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'TRANSFER',
      fromAddress: sender,
      toAddress: recipient,
    },
  })

  console.log(`Transferred NFT: ${contractAddress}/${tokenId} from ${sender} to ${recipient}`)
}

async function handleBurn(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const tokenId = attributes['token_id']
  const sender = attributes['sender']

  const collection = await prisma.collection.findUnique({
    where: { contractAddress },
  })

  if (!collection) return

  // Delete NFT
  await prisma.nft.deleteMany({
    where: {
      collectionId: collection.id,
      tokenId,
    },
  })

  // Update collection stats
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      itemCount: { decrement: 1 },
    },
  })

  console.log(`Burned NFT: ${contractAddress}/${tokenId}`)
}

async function handleList(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number,
  listingType: string
) {
  const nftContract = attributes['nft_contract']
  const tokenId = attributes['token_id']
  const seller = attributes['seller']
  const price = attributes['price']
  const denom = attributes['denom'] || 'unibi'
  const expiresAt = attributes['expires_at']

  const collection = await prisma.collection.findUnique({
    where: { contractAddress: nftContract },
  })

  if (!collection) return

  const nft = await prisma.nft.findUnique({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
  })

  if (!nft) return

  // Create listing
  await prisma.listing.create({
    data: {
      nftId: nft.id,
      seller,
      listingType: listingType === 'list_auction' ? 'AUCTION' : 'FIXED_PRICE',
      price: BigInt(price),
      denom,
      expiresAt: new Date(parseInt(expiresAt) * 1000),
      status: 'ACTIVE',
    },
  })

  // Create activity
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'LIST',
      fromAddress: seller,
      price: BigInt(price),
      denom,
    },
  })

  // Update collection stats
  await updateCollectionFloorPrice(collection.id)
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      totalListings: { increment: 1 },
    },
  })

  console.log(`Listed NFT: ${nftContract}/${tokenId} for ${price} ${denom}`)
}

async function handleUnlist(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const nftContract = attributes['nft_contract']
  const tokenId = attributes['token_id']

  const collection = await prisma.collection.findUnique({
    where: { contractAddress: nftContract },
  })

  if (!collection) return

  const nft = await prisma.nft.findUnique({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
  })

  if (!nft) return

  // Cancel active listings
  await prisma.listing.updateMany({
    where: {
      nftId: nft.id,
      status: 'ACTIVE',
    },
    data: {
      status: 'CANCELLED',
    },
  })

  // Create activity
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'UNLIST',
      fromAddress: attributes['seller'],
    },
  })

  // Update collection stats
  await updateCollectionFloorPrice(collection.id)
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      totalListings: { decrement: 1 },
    },
  })

  console.log(`Unlisted NFT: ${nftContract}/${tokenId}`)
}

async function handleSale(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const nftContract = attributes['nft_contract']
  const tokenId = attributes['token_id']
  const seller = attributes['seller']
  const buyer = attributes['buyer']
  const price = attributes['price']
  const denom = attributes['denom'] || 'unibi'

  const collection = await prisma.collection.findUnique({
    where: { contractAddress: nftContract },
  })

  if (!collection) return

  const nft = await prisma.nft.findUnique({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
  })

  if (!nft) return

  // Update NFT owner
  await prisma.nft.update({
    where: { id: nft.id },
    data: { owner: buyer },
  })

  // Mark listing as sold
  await prisma.listing.updateMany({
    where: {
      nftId: nft.id,
      status: 'ACTIVE',
    },
    data: {
      status: 'SOLD',
    },
  })

  // Create sale activity
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'SALE',
      fromAddress: seller,
      toAddress: buyer,
      price: BigInt(price),
      denom,
    },
  })

  // Update collection stats
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      totalVolume: { increment: BigInt(price) },
      totalSales: { increment: 1 },
      totalListings: { decrement: 1 },
    },
  })

  await updateCollectionFloorPrice(collection.id)

  console.log(`Sale: ${nftContract}/${tokenId} sold for ${price} ${denom}`)
}

async function handleBid(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const nftContract = attributes['nft_contract']
  const tokenId = attributes['token_id']
  const bidder = attributes['bidder']
  const bid = attributes['bid']

  console.log(`Bid placed: ${nftContract}/${tokenId} - ${bid} by ${bidder}`)
}

async function handleMakeOffer(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const nftContract = attributes['nft_contract']
  const tokenId = attributes['token_id']
  const bidder = attributes['bidder']
  const amount = attributes['amount']
  const denom = attributes['denom'] || 'unibi'
  const expiresAt = attributes['expires_at']

  const collection = await prisma.collection.findUnique({
    where: { contractAddress: nftContract },
  })

  if (!collection) return

  const nft = await prisma.nft.findUnique({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
  })

  if (!nft) return

  // Create or update offer
  await prisma.offer.upsert({
    where: {
      nftId_bidder: {
        nftId: nft.id,
        bidder,
      },
    },
    update: {
      amount: BigInt(amount),
      denom,
      expiresAt: new Date(parseInt(expiresAt) * 1000),
      status: 'ACTIVE',
    },
    create: {
      nftId: nft.id,
      bidder,
      amount: BigInt(amount),
      denom,
      expiresAt: new Date(parseInt(expiresAt) * 1000),
      status: 'ACTIVE',
    },
  })

  // Create activity
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'OFFER',
      fromAddress: bidder,
      price: BigInt(amount),
      denom,
    },
  })

  console.log(`Offer made: ${nftContract}/${tokenId} - ${amount} ${denom} by ${bidder}`)
}

async function handleAcceptOffer(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const nftContract = attributes['nft_contract']
  const tokenId = attributes['token_id']
  const seller = attributes['seller']
  const bidder = attributes['buyer']
  const price = attributes['price']
  const denom = attributes['denom'] || 'unibi'

  const collection = await prisma.collection.findUnique({
    where: { contractAddress: nftContract },
  })

  if (!collection) return

  const nft = await prisma.nft.findUnique({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
  })

  if (!nft) return

  // Update NFT owner
  await prisma.nft.update({
    where: { id: nft.id },
    data: { owner: bidder },
  })

  // Mark offer as accepted
  await prisma.offer.updateMany({
    where: {
      nftId: nft.id,
      bidder,
      status: 'ACTIVE',
    },
    data: {
      status: 'ACCEPTED',
    },
  })

  // Create activity
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'OFFER_ACCEPTED',
      fromAddress: seller,
      toAddress: bidder,
      price: BigInt(price),
      denom,
    },
  })

  // Also record as a sale
  await prisma.activity.create({
    data: {
      nftId: nft.id,
      type: 'SALE',
      fromAddress: seller,
      toAddress: bidder,
      price: BigInt(price),
      denom,
    },
  })

  // Update collection stats
  await prisma.collection.update({
    where: { id: collection.id },
    data: {
      totalVolume: { increment: BigInt(price) },
      totalSales: { increment: 1 },
    },
  })

  console.log(`Offer accepted: ${nftContract}/${tokenId} for ${price} ${denom}`)
}

async function handleCancelOffer(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const nftContract = attributes['nft_contract']
  const tokenId = attributes['token_id']
  const bidder = attributes['bidder']

  const collection = await prisma.collection.findUnique({
    where: { contractAddress: nftContract },
  })

  if (!collection) return

  const nft = await prisma.nft.findUnique({
    where: {
      collectionId_tokenId: {
        collectionId: collection.id,
        tokenId,
      },
    },
  })

  if (!nft) return

  // Cancel offer
  await prisma.offer.updateMany({
    where: {
      nftId: nft.id,
      bidder,
      status: 'ACTIVE',
    },
    data: {
      status: 'CANCELLED',
    },
  })

  console.log(`Offer cancelled: ${nftContract}/${tokenId} by ${bidder}`)
}

async function handleCreateCollection(
  contractAddress: string,
  attributes: Record<string, string>,
  blockHeight: number
) {
  const collectionAddress = attributes['collection_address']
  const name = attributes['name']
  const symbol = attributes['symbol']
  const creator = attributes['creator']
  const royaltyPercent = attributes['royalty_percentage']
  const royaltyAddress = attributes['royalty_recipient']

  // Create collection
  await prisma.collection.upsert({
    where: { contractAddress: collectionAddress },
    update: {
      name,
      symbol,
      creator,
      royaltyPercent: parseFloat(royaltyPercent) || 0,
      royaltyAddress,
    },
    create: {
      contractAddress: collectionAddress,
      name,
      symbol,
      creator,
      royaltyPercent: parseFloat(royaltyPercent) || 0,
      royaltyAddress,
    },
  })

  console.log(`Collection created: ${collectionAddress} - ${name}`)
}

async function updateCollectionFloorPrice(collectionId: string) {
  const lowestListing = await prisma.listing.findFirst({
    where: {
      nft: { collectionId },
      status: 'ACTIVE',
    },
    orderBy: { price: 'asc' },
  })

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      floorPrice: lowestListing?.price || null,
    },
  })
}
