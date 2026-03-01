const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const response = await fetch(url, {
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
    ...options,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { message?: string }).message || `API Error: ${response.status}`)
  }
  return response.json()
}

// Discovery (home page)
export async function fetchTrending(params?: { period?: string; limit?: number }) {
  const sp = new URLSearchParams()
  if (params?.period) sp.set('period', params.period)
  if (params?.limit) sp.set('limit', String(params.limit))
  return fetchAPI<{ trending: Array<Collection & { floorPrice?: string; totalVolume?: string }> }>(
    `/trending?${sp.toString()}`
  )
}

export async function fetchRecent(params?: { limit?: number }) {
  const sp = new URLSearchParams()
  if (params?.limit) sp.set('limit', String(params.limit))
  return fetchAPI<{ recent: Array<{ id: string; nft: NFT; price: string; denom: string; seller: string; createdAt: string }> }>(
    `/recent?${sp.toString()}`
  )
}

export async function fetchStats() {
  return fetchAPI<{ stats: GlobalStats }>('/stats')
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
  floorPrice?: string | number | bigint
  totalVolume: string | number | bigint
  itemCount?: number
  ownerCount?: number
  website?: string
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
  const r = await fetchTrending({ period, limit })
  return { trending: r.trending }
}

export async function getListings(params?: {
  collection?: string
  seller?: string
  status?: string
  page?: number
  limit?: number
}) {
  const sp = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => { if (v != null) sp.set(k, String(v)) })
  return fetchAPI<{ listings: Array<Listing & { nft?: NFT }>; pagination: { page: number; limit: number; total: number; pages: number } }>(
    `/listings?${sp.toString()}`
  )
}

export async function getTopSales(limit = 10) {
  return fetchAPI<{ topSales: Activity[] }>(`/stats/top-sales?limit=${limit}`)
}

// ============ Upload API ============

export async function uploadFile(file: File): Promise<{ url: string; uri: string; filename?: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const data = await fetchAPI<{ url?: string; uri: string; gateway?: string; filename?: string }>(
    '/upload/file',
    { method: 'POST', body: formData }
  )
  return { url: data.url ?? data.uri ?? data.gateway ?? '', uri: data.uri, filename: data.filename }
}

export async function uploadMetadata(metadata: Record<string, unknown>): Promise<{ uri: string; url?: string }> {
  const data = await fetchAPI<{ uri: string; url?: string; gateway?: string }>('/upload/metadata', {
    method: 'POST',
    body: JSON.stringify(metadata),
  })
  return { uri: data.uri, url: data.url ?? data.gateway }
}

// ============ Contract actions (mock or real) ============

export async function apiMint(params: {
  collectionAddress: string
  tokenId: string
  owner: string
  tokenUri: string
  name?: string
  description?: string
  image?: string
  traits?: object
}) {
  return fetchAPI<{ txHash: string }>('/mint', { method: 'POST', body: JSON.stringify(params) })
}

export async function apiList(params: {
  collectionAddress: string
  tokenId: string
  price: string
  seller: string
  durationSeconds?: number
}) {
  return fetchAPI<{ txHash: string; listingId: string }>('/list', { method: 'POST', body: JSON.stringify(params) })
}

export async function apiBuy(params: { listingId: string; buyer: string }) {
  return fetchAPI<{ txHash: string }>('/buy', { method: 'POST', body: JSON.stringify(params) })
}

export async function apiCancelListing(params: { listingId: string; seller: string }) {
  return fetchAPI<{ txHash: string }>('/cancel-listing', { method: 'POST', body: JSON.stringify(params) })
}

export async function apiCreateCollection(params: {
  name: string
  symbol: string
  creator: string
  description?: string
  image?: string
}) {
  return fetchAPI<{ contractAddress: string; txHash: string }>('/collections/create', {
    method: 'POST',
    body: JSON.stringify(params),
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
