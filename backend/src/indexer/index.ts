import { Tendermint37Client } from '@cosmjs/tendermint-rpc'
import { prisma } from '../lib/prisma'
import { processEvent, EventType } from './eventProcessor'

const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://rpc.testnet.nibiru.fi'
const MARKETPLACE_CONTRACT = process.env.MARKETPLACE_CONTRACT || ''
const FACTORY_CONTRACT = process.env.FACTORY_CONTRACT || ''

// Event types we're interested in
const WASM_EVENT_TYPES = [
  'wasm-mint',
  'wasm-transfer_nft',
  'wasm-send_nft',
  'wasm-burn',
  'wasm-list_fixed_price',
  'wasm-list_auction',
  'wasm-cancel_listing',
  'wasm-buy',
  'wasm-place_bid',
  'wasm-accept_bid',
  'wasm-settle_auction',
  'wasm-make_offer',
  'wasm-accept_offer',
  'wasm-cancel_offer',
  'wasm-create_collection',
]

export async function startIndexer() {
  console.log('Starting blockchain indexer...')
  console.log(`RPC Endpoint: ${RPC_ENDPOINT}`)

  try {
    // Get last synced block
    let syncState = await prisma.syncState.findUnique({
      where: { id: 'main' },
    })

    if (!syncState) {
      syncState = await prisma.syncState.create({
        data: {
          id: 'main',
          lastBlockHeight: BigInt(0),
        },
      })
    }

    const startHeight = Number(syncState.lastBlockHeight) + 1
    console.log(`Starting from block: ${startHeight}`)

    // Connect to RPC
    const client = await Tendermint37Client.connect(RPC_ENDPOINT)
    console.log('Connected to Nibiru RPC')

    // Get current block height
    const status = await client.status()
    const currentHeight = status.syncInfo.latestBlockHeight
    console.log(`Current block height: ${currentHeight}`)

    // Sync historical blocks (if needed)
    if (startHeight < currentHeight) {
      console.log(`Syncing blocks ${startHeight} to ${currentHeight}...`)
      await syncHistoricalBlocks(client, startHeight, currentHeight)
    }

    // Subscribe to new blocks
    console.log('Subscribing to new blocks...')
    await subscribeToBlocks(client)
  } catch (error) {
    console.error('Indexer error:', error)
    // Retry after delay
    setTimeout(() => startIndexer(), 10000)
  }
}

async function syncHistoricalBlocks(
  client: Tendermint37Client,
  startHeight: number,
  endHeight: number
) {
  const batchSize = 100 // Process blocks in batches

  for (let height = startHeight; height <= endHeight; height += batchSize) {
    const batch = []
    const batchEnd = Math.min(height + batchSize - 1, endHeight)

    for (let h = height; h <= batchEnd; h++) {
      batch.push(processBlock(client, h))
    }

    await Promise.all(batch)

    // Update sync state
    await prisma.syncState.update({
      where: { id: 'main' },
      data: {
        lastBlockHeight: BigInt(batchEnd),
        lastBlockTime: new Date(),
      },
    })

    console.log(`Synced blocks ${height} to ${batchEnd}`)
  }
}

async function processBlock(client: Tendermint37Client, height: number) {
  try {
    const blockResults = await client.blockResults(height)

    // Process transaction events
    for (const txResult of blockResults.results) {
      if (txResult.code !== 0) continue // Skip failed transactions

      for (const event of txResult.events) {
        const eventType = event.type

        // Check if this is a WASM event we care about
        if (WASM_EVENT_TYPES.includes(eventType)) {
          await processWasmEvent(event, height)
        }
      }
    }
  } catch (error) {
    console.error(`Error processing block ${height}:`, error)
  }
}

async function processWasmEvent(event: any, blockHeight: number) {
  const attributes: Record<string, string> = {}
  
  for (const attr of event.attributes) {
    const key = Buffer.from(attr.key).toString()
    const value = Buffer.from(attr.value).toString()
    attributes[key] = value
  }

  // Extract contract address
  const contractAddress = attributes['_contract_address'] || attributes['contract_address']

  // Determine event type and process
  const eventType = event.type.replace('wasm-', '') as EventType

  await processEvent({
    type: eventType,
    contractAddress,
    attributes,
    blockHeight,
  })
}

async function subscribeToBlocks(client: Tendermint37Client) {
  // In production, use WebSocket subscription
  // For now, poll for new blocks
  
  let lastProcessedHeight = 0
  
  const poll = async () => {
    try {
      const status = await client.status()
      const currentHeight = status.syncInfo.latestBlockHeight

      if (currentHeight > lastProcessedHeight) {
        for (let h = lastProcessedHeight + 1; h <= currentHeight; h++) {
          await processBlock(client, h)
        }

        // Update sync state
        await prisma.syncState.update({
          where: { id: 'main' },
          data: {
            lastBlockHeight: BigInt(currentHeight),
            lastBlockTime: new Date(),
          },
        })

        lastProcessedHeight = currentHeight
      }
    } catch (error) {
      console.error('Polling error:', error)
    }

    // Poll every 5 seconds
    setTimeout(poll, 5000)
  }

  // Get initial height
  const state = await prisma.syncState.findUnique({ where: { id: 'main' } })
  lastProcessedHeight = Number(state?.lastBlockHeight || 0)

  poll()
}

// Update stats periodically
export async function updateGlobalStats() {
  try {
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

    await prisma.globalStats.upsert({
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

    console.log('Updated global stats')
  } catch (error) {
    console.error('Error updating global stats:', error)
  }
}

// Run stats update every 5 minutes
setInterval(updateGlobalStats, 5 * 60 * 1000)
