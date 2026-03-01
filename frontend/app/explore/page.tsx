'use client'

import { useState, useEffect } from 'react'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { Filter, Grid, List } from 'lucide-react'
import { getNFTs, type NFT } from '@/lib/api'

const sortOptions = [
  { label: 'Recently Listed', sortBy: 'recent' as const },
  { label: 'Price: Low to High', sortBy: 'price', sortOrder: 'asc' as const },
  { label: 'Price: High to Low', sortBy: 'price', sortOrder: 'desc' as const },
  { label: 'Most Liked', sortBy: 'favorites' as const },
]

export default function ExplorePage() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedSort, setSelectedSort] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [statusFilter, setStatusFilter] = useState<'all' | 'listed'>('all')

  useEffect(() => {
    setLoading(true)
    const opt = sortOptions[selectedSort]
    getNFTs({
      status: statusFilter === 'listed' ? 'listed' : undefined,
      sortBy: opt.sortBy,
      sortOrder: opt.sortOrder,
      page,
      limit: 20,
    })
      .then((r) => {
        setNfts(r.nfts)
        setTotalPages(r.pagination?.pages ?? 1)
        setError(null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
        setNfts([])
      })
      .finally(() => setLoading(false))
  }, [page, selectedSort, statusFilter])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Explore NFTs</h1>
        <p className="text-muted-foreground mt-2">Discover unique digital assets from creators worldwide</p>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(Number(e.target.value))}
            className="h-9 px-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map((option, i) => (
              <option key={i} value={i}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 rounded-xl bg-card border border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'listed')}
                className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
              >
                <option value="all">All</option>
                <option value="listed">Listed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border animate-pulse aspect-square" />
          ))}
        </div>
      )}
      {error && <p className="text-muted-foreground py-8">{error}</p>}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {nfts.map((nft) => (
              <NFTCard
                key={nft.id}
                id={nft.tokenId}
                name={nft.name ?? `#${nft.tokenId}`}
                image={nft.image ?? ''}
                collection={nft.collection.name}
                collectionAddress={nft.collection.contractAddress}
                price={nft.listings?.[0]?.price?.toString()}
                currency="NIBI"
                likes={0}
              />
            ))}
          </div>
          {nfts.length === 0 && (
            <p className="text-muted-foreground text-center py-12">No NFTs found.</p>
          )}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
