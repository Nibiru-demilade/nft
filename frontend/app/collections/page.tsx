'use client'

import { useState, useEffect } from 'react'
import { CollectionCard } from '@/components/ui/collection-card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { TrendingUp, Clock, Verified } from 'lucide-react'
import { getCollections, type Collection } from '@/lib/api'

const tabs = [
  { id: 'trending', label: 'Trending', icon: TrendingUp, sortBy: 'volume' as const },
  { id: 'top', label: 'Top', icon: null, sortBy: 'volume' as const },
  { id: 'new', label: 'New', icon: Clock, sortBy: 'created' as const },
]

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState('trending')
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    const tab = tabs.find((t) => t.id === activeTab) ?? tabs[0]
    getCollections({
      sortBy: tab.sortBy,
      verified: showVerifiedOnly || undefined,
      page,
      limit: 20,
    })
      .then((r) => {
        setCollections(r.collections ?? [])
        setTotalPages(r.pagination?.pages ?? 1)
        setError(null)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
        setCollections([])
      })
      .finally(() => setLoading(false))
  }, [activeTab, showVerifiedOnly, page])

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Collections</h1>
        <p className="text-muted-foreground mt-2">
          Explore the top NFT collections on Nibiru Chain
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex bg-secondary rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1) }}
                className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon && <tab.icon className="h-4 w-4" />}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Verified Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showVerifiedOnly}
              onChange={(e) => { setShowVerifiedOnly(e.target.checked); setPage(1) }}
              className="rounded border-border"
            />
            <Verified className="h-4 w-4 text-primary" />
            <span className="text-sm">Verified Only</span>
          </label>

          {/* Search */}
          <div className="w-64 hidden md:block">
            <SearchBar placeholder="Search collections..." />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border animate-pulse aspect-[3/4]" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && <p className="text-muted-foreground py-8">{error}</p>}

      {!loading && !error && (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            {/* Stats Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-muted-foreground border-b border-border mb-4">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Collection</div>
              <div className="col-span-2 text-right">Floor Price</div>
              <div className="col-span-2 text-right">Volume</div>
              <div className="col-span-2 text-right">Items</div>
              <div className="col-span-1 text-right">Owners</div>
            </div>

            <div className="space-y-2">
              {collections.map((collection, index) => {
                const floorPrice = collection.floorPrice != null ? String(collection.floorPrice) : '--'
                const totalVolume = collection.totalVolume != null ? String(collection.totalVolume) : '--'
                return (
                  <a
                    key={collection.contractAddress}
                    href={`/collection/${collection.contractAddress}`}
                    className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors items-center"
                  >
                    <div className="col-span-1 text-muted-foreground">{(page - 1) * 20 + index + 1}</div>
                    <div className="col-span-4 flex items-center gap-3">
                      <img
                        src={collection.image || '/placeholder-collection.png'}
                        alt={collection.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">{collection.name}</span>
                          {collection.verified && (
                            <Verified className="h-4 w-4 text-primary fill-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      {floorPrice} NIBI
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      {totalVolume} NIBI
                    </div>
                    <div className="col-span-2 text-right text-muted-foreground">
                      {(collection.itemCount ?? 0).toLocaleString()}
                    </div>
                    <div className="col-span-1 text-right text-muted-foreground">
                      {(collection.ownerCount ?? 0).toLocaleString()}
                    </div>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Mobile/Tablet Card Grid */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.contractAddress}
                address={collection.contractAddress}
                name={collection.name}
                image={collection.image}
                banner={collection.banner}
                floorPrice={collection.floorPrice != null ? String(collection.floorPrice) : undefined}
                totalVolume={collection.totalVolume != null ? String(collection.totalVolume) : undefined}
                itemCount={collection.itemCount}
                ownerCount={collection.ownerCount}
                isVerified={collection.verified}
              />
            ))}
          </div>

          {collections.length === 0 && (
            <p className="text-muted-foreground text-center py-12">No collections found.</p>
          )}

          {/* Pagination */}
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
