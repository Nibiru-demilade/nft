'use client'

import { useState } from 'react'
import { CollectionCard } from '@/components/ui/collection-card'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Grid, List, TrendingUp, Clock, Verified } from 'lucide-react'

// Mock collections
const mockCollections = Array.from({ length: 16 }, (_, i) => ({
  address: `nibi1collection${i}`,
  name: `Collection ${i + 1}`,
  image: `https://picsum.photos/seed/coll${i}/200`,
  banner: `https://picsum.photos/seed/collbanner${i}/400/200`,
  floorPrice: String((Math.random() * 50 + 1).toFixed(2)),
  totalVolume: String((Math.random() * 10000 + 100).toFixed(0)),
  itemCount: Math.floor(Math.random() * 10000) + 100,
  ownerCount: Math.floor(Math.random() * 5000) + 50,
  isVerified: i < 8,
  change24h: (Math.random() - 0.5) * 40,
}))

const tabs = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'top', label: 'Top', icon: null },
  { id: 'new', label: 'New', icon: Clock },
]

const timeFilters = ['24h', '7d', '30d', 'All Time']

export default function CollectionsPage() {
  const [activeTab, setActiveTab] = useState('trending')
  const [timeFilter, setTimeFilter] = useState('24h')
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)

  const filteredCollections = showVerifiedOnly
    ? mockCollections.filter((c) => c.isVerified)
    : mockCollections

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
                onClick={() => setActiveTab(tab.id)}
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

          {/* Time Filter */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
          >
            {timeFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          {/* Verified Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showVerifiedOnly}
              onChange={(e) => setShowVerifiedOnly(e.target.checked)}
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

      {/* Stats Table Header (for larger screens) */}
      <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-muted-foreground border-b border-border mb-4">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Collection</div>
        <div className="col-span-2 text-right">Floor Price</div>
        <div className="col-span-2 text-right">24h %</div>
        <div className="col-span-2 text-right">Volume</div>
        <div className="col-span-1 text-right">Items</div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block space-y-2">
        {filteredCollections.map((collection, index) => (
          <a
            key={collection.address}
            href={`/collection/${collection.address}`}
            className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors items-center"
          >
            <div className="col-span-1 text-muted-foreground">{index + 1}</div>
            <div className="col-span-4 flex items-center gap-3">
              <img
                src={collection.image}
                alt={collection.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{collection.name}</span>
                  {collection.isVerified && (
                    <Verified className="h-4 w-4 text-primary fill-primary" />
                  )}
                </div>
              </div>
            </div>
            <div className="col-span-2 text-right font-medium">
              {collection.floorPrice} NIBI
            </div>
            <div
              className={`col-span-2 text-right font-medium ${
                collection.change24h > 0
                  ? 'text-green-500'
                  : collection.change24h < 0
                  ? 'text-red-500'
                  : ''
              }`}
            >
              {collection.change24h > 0 ? '+' : ''}
              {collection.change24h.toFixed(1)}%
            </div>
            <div className="col-span-2 text-right font-medium">
              {collection.totalVolume} NIBI
            </div>
            <div className="col-span-1 text-right text-muted-foreground">
              {collection.itemCount.toLocaleString()}
            </div>
          </a>
        ))}
      </div>

      {/* Mobile/Tablet Card Grid */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredCollections.map((collection) => (
          <CollectionCard key={collection.address} {...collection} />
        ))}
      </div>

      {/* Load More */}
      <div className="mt-12 text-center">
        <Button variant="outline" size="lg">
          Load More Collections
        </Button>
      </div>
    </div>
  )
}
