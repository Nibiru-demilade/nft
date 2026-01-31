const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  return response.json()
}

// ============ Collections API ============

export interface Collection {
  id: string
  contractAddress: string
  name: string
  symbol: string
  description?: string
  image?: string
  banner?: string
  creator: string
  verified: boolean
  floorPrice?: string
  totalVolume: string
  itemCount: number
  ownerCount: number
}

export async function getCollections(params?: {
  creator?: string
  verified?: boolean
  search?: string
  sortBy?: string
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.creator) searchParams.set('creator', params.creator)
  if (params?.verified) searchParams.set('verified', 'true')
  if (params?.search) searchParams.set('search', params.search)
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  return fetchAPI<{ collections: Collection[]; pagination: any }>(
    `/collections?${searchParams.toString()}`
  )
}

export async function getCollection(address: string) {
  return fetchAPI<{ collection: Collection }>(`/collections/${address}`)
}

export async function getCollectionNFTs(address: string, params?: {
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  return fetchAPI<{ nfts: NFT[]; pagination: any }>(
    `/collections/${address}/nfts?${searchParams.toString()}`
  )
}

// ============ NFTs API ============

export interface NFT {
  id: string
  tokenId: string
  name?: string
  description?: string
  image?: string
  owner: string
  traits?: any
  collection: {
    name: string
    contractAddress: string
    verified: boolean
  }
  listings?: Listing[]
}

export interface Listing {
  id: string
  price: string
  denom: string
  listingType: string
  expiresAt: string
  seller: string
}

export async function getNFTs(params?: {
  collection?: string
  owner?: string
  status?: string
  minPrice?: string
  maxPrice?: string
  search?: string
  sortBy?: string
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) searchParams.set(key, String(value))
  })

  return fetchAPI<{ nfts: NFT[]; pagination: any }>(
    `/nfts?${searchParams.toString()}`
  )
}

export async function getNFT(contract: string, tokenId: string) {
  return fetchAPI<{ nft: NFT }>(`/nfts/${contract}/${tokenId}`)
}

export async function getNFTActivity(contract: string, tokenId: string, limit = 50) {
  return fetchAPI<{ activities: Activity[] }>(
    `/nfts/${contract}/${tokenId}/activity?limit=${limit}`
  )
}

export async function getNFTOffers(contract: string, tokenId: string) {
  return fetchAPI<{ offers: Offer[] }>(
    `/nfts/${contract}/${tokenId}/offers`
  )
}

// ============ Users API ============

export interface User {
  id: string
  address: string
  username?: string
  bio?: string
  avatar?: string
  banner?: string
  verified: boolean
  stats: {
    owned: number
    created: number
    favorites: number
    volumeTraded: string
  }
}

export async function getUser(address: string) {
  return fetchAPI<{ user: User }>(`/users/${address}`)
}

export async function getUserNFTs(address: string, type = 'owned', params?: {
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  searchParams.set('type', type)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  return fetchAPI<{ nfts: NFT[]; pagination: any }>(
    `/users/${address}/nfts?${searchParams.toString()}`
  )
}

export async function getUserActivity(address: string, limit = 50) {
  return fetchAPI<{ activities: Activity[] }>(
    `/users/${address}/activity?limit=${limit}`
  )
}

export async function updateUser(address: string, data: Partial<User>) {
  return fetchAPI<{ user: User }>(`/users/${address}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ============ Activity API ============

export interface Activity {
  id: string
  type: string
  fromAddress?: string
  toAddress?: string
  price?: string
  denom?: string
  timestamp: string
  nft?: {
    tokenId: string
    name?: string
    image?: string
    collection: {
      name: string
      contractAddress: string
    }
  }
}

export async function getActivity(params?: {
  collection?: string
  type?: string
  limit?: number
  cursor?: string
}) {
  const searchParams = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) searchParams.set(key, String(value))
  })

  return fetchAPI<{ activities: Activity[]; nextCursor?: string; hasMore: boolean }>(
    `/activity?${searchParams.toString()}`
  )
}

export async function getRecentSales(limit = 20) {
  return fetchAPI<{ sales: Activity[] }>(`/activity/sales?limit=${limit}`)
}

export async function getRecentListings(limit = 20) {
  return fetchAPI<{ listings: Listing[] }>(`/activity/listings?limit=${limit}`)
}

// ============ Stats API ============

export interface GlobalStats {
  totalVolume: string
  totalSales: number
  totalCollections: number
  totalNfts: number
  totalUsers: number
}

export async function getGlobalStats() {
  return fetchAPI<{ stats: GlobalStats }>('/stats')
}

export async function getTrendingCollections(period = '24h', limit = 10) {
  return fetchAPI<{ trending: Collection[] }>(
    `/stats/trending?period=${period}&limit=${limit}`
  )
}

export async function getTopSales(limit = 10) {
  return fetchAPI<{ topSales: Activity[] }>(`/stats/top-sales?limit=${limit}`)
}

// ============ Upload API ============

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/upload/file`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  return response.json()
}

export async function uploadMetadata(metadata: any) {
  return fetchAPI<{ cid: string; uri: string }>('/upload/metadata', {
    method: 'POST',
    body: JSON.stringify(metadata),
  })
}

// ============ Offers API ============

export interface Offer {
  id: string
  bidder: string
  amount: string
  denom: string
  expiresAt: string
  status: string
}

export async function getUserOffers(address: string, type = 'made') {
  return fetchAPI<{ offers: Offer[] }>(
    `/users/${address}/offers?type=${type}`
  )
}
