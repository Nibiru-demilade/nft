import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { Coin } from '@cosmjs/stargate'

// Contract addresses (update after deployment)
export const CONTRACTS = {
  CW721: process.env.NEXT_PUBLIC_CW721_ADDRESS || '',
  MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '',
  FACTORY: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '',
}

// Chain config
export const CHAIN_CONFIG = {
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID || 'nibiru-testnet-1',
  rpcEndpoint: process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://rpc.testnet.nibiru.fi',
  restEndpoint: process.env.NEXT_PUBLIC_REST_ENDPOINT || 'https://lcd.testnet.nibiru.fi',
  denom: 'unibi',
  displayDenom: 'NIBI',
  decimals: 6,
}

// ============ CW721 Contract Functions ============

export async function queryNFTInfo(
  client: CosmWasmClient,
  contractAddress: string,
  tokenId: string
) {
  return client.queryContractSmart(contractAddress, {
    nft_info: { token_id: tokenId },
  })
}

export async function queryAllNFTInfo(
  client: CosmWasmClient,
  contractAddress: string,
  tokenId: string
) {
  return client.queryContractSmart(contractAddress, {
    all_nft_info: { token_id: tokenId },
  })
}

export async function queryOwnerTokens(
  client: CosmWasmClient,
  contractAddress: string,
  owner: string,
  startAfter?: string,
  limit?: number
) {
  return client.queryContractSmart(contractAddress, {
    tokens: { owner, start_after: startAfter, limit },
  })
}

export async function mintNFT(
  client: SigningCosmWasmClient,
  sender: string,
  contractAddress: string,
  tokenId: string,
  owner: string,
  tokenUri?: string,
  extension?: any
) {
  return client.execute(
    sender,
    contractAddress,
    {
      mint: {
        token_id: tokenId,
        owner,
        token_uri: tokenUri,
        extension,
      },
    },
    'auto'
  )
}

export async function transferNFT(
  client: SigningCosmWasmClient,
  sender: string,
  contractAddress: string,
  recipient: string,
  tokenId: string
) {
  return client.execute(
    sender,
    contractAddress,
    {
      transfer_nft: { recipient, token_id: tokenId },
    },
    'auto'
  )
}

// ============ Marketplace Contract Functions ============

export async function queryListing(
  client: CosmWasmClient,
  nftContract: string,
  tokenId: string
) {
  return client.queryContractSmart(CONTRACTS.MARKETPLACE, {
    listing: { nft_contract: nftContract, token_id: tokenId },
  })
}

export async function queryListings(
  client: CosmWasmClient,
  options?: {
    collection?: string
    seller?: string
    minPrice?: string
    maxPrice?: string
    activeOnly?: boolean
    startAfter?: number
    limit?: number
  }
) {
  return client.queryContractSmart(CONTRACTS.MARKETPLACE, {
    listings: {
      collection: options?.collection,
      seller: options?.seller,
      min_price: options?.minPrice,
      max_price: options?.maxPrice,
      active_only: options?.activeOnly,
      start_after: options?.startAfter,
      limit: options?.limit,
    },
  })
}

export async function listNFT(
  client: SigningCosmWasmClient,
  sender: string,
  nftContract: string,
  tokenId: string,
  price: Coin,
  duration: number // seconds
) {
  // First approve marketplace to transfer NFT
  await client.execute(
    sender,
    nftContract,
    {
      approve: {
        spender: CONTRACTS.MARKETPLACE,
        token_id: tokenId,
      },
    },
    'auto'
  )

  // Then create listing
  return client.execute(
    sender,
    CONTRACTS.MARKETPLACE,
    {
      list_fixed_price: {
        nft_contract: nftContract,
        token_id: tokenId,
        price,
        duration,
      },
    },
    'auto'
  )
}

export async function buyNFT(
  client: SigningCosmWasmClient,
  sender: string,
  nftContract: string,
  tokenId: string,
  price: Coin
) {
  return client.execute(
    sender,
    CONTRACTS.MARKETPLACE,
    {
      buy: {
        nft_contract: nftContract,
        token_id: tokenId,
      },
    },
    'auto',
    undefined,
    [price]
  )
}

export async function makeOffer(
  client: SigningCosmWasmClient,
  sender: string,
  nftContract: string,
  tokenId: string,
  amount: Coin,
  duration: number
) {
  return client.execute(
    sender,
    CONTRACTS.MARKETPLACE,
    {
      make_offer: {
        nft_contract: nftContract,
        token_id: tokenId,
        duration,
      },
    },
    'auto',
    undefined,
    [amount]
  )
}

export async function cancelListing(
  client: SigningCosmWasmClient,
  sender: string,
  nftContract: string,
  tokenId: string
) {
  return client.execute(
    sender,
    CONTRACTS.MARKETPLACE,
    {
      cancel_listing: {
        nft_contract: nftContract,
        token_id: tokenId,
      },
    },
    'auto'
  )
}

// ============ Collection Factory Functions ============

export async function queryCollections(
  client: CosmWasmClient,
  options?: {
    creator?: string
    verifiedOnly?: boolean
    startAfter?: string
    limit?: number
  }
) {
  return client.queryContractSmart(CONTRACTS.FACTORY, {
    collections: {
      creator: options?.creator,
      verified_only: options?.verifiedOnly,
      start_after: options?.startAfter,
      limit: options?.limit,
    },
  })
}

export async function queryCollection(
  client: CosmWasmClient,
  address: string
) {
  return client.queryContractSmart(CONTRACTS.FACTORY, {
    collection: { address },
  })
}

export async function createCollection(
  client: SigningCosmWasmClient,
  sender: string,
  params: {
    name: string
    symbol: string
    description?: string
    image?: string
    banner?: string
    royaltyPercentage: string
    royaltyRecipient?: string
    maxSupply?: number
  },
  creationFee?: Coin
) {
  return client.execute(
    sender,
    CONTRACTS.FACTORY,
    {
      create_collection: {
        name: params.name,
        symbol: params.symbol,
        description: params.description,
        image: params.image,
        banner: params.banner,
        royalty_percentage: params.royaltyPercentage,
        royalty_recipient: params.royaltyRecipient,
        max_supply: params.maxSupply,
      },
    },
    'auto',
    undefined,
    creationFee ? [creationFee] : undefined
  )
}

// ============ Helper Functions ============

export function formatTokenAmount(
  amount: string | number,
  decimals = CHAIN_CONFIG.decimals
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  return (value / Math.pow(10, decimals)).toFixed(2)
}

export function toMicroAmount(
  amount: string | number,
  decimals = CHAIN_CONFIG.decimals
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  return Math.floor(value * Math.pow(10, decimals)).toString()
}

export function createCoin(amount: string | number): Coin {
  return {
    denom: CHAIN_CONFIG.denom,
    amount: toMicroAmount(amount),
  }
}
