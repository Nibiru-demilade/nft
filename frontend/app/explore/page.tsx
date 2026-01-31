'use client'

import { useState } from 'react'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { Filter, Grid, List, SlidersHorizontal } from 'lucide-react'

// Mock data
const mockNFTs = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  name: `NFT #${i + 1}`,
  image: `https://picsum.photos/seed/explore${i}/400`,
  collection: ['Cosmic Apes', 'Nibiru Punks', 'Abstract Dreams', 'Pixel Worlds'][i % 4],
  collectionAddress: ['nibi1abc123', 'nibi1def456', 'nibi1ghi789', 'nibi1jkl012'][i % 4],
  price: String((Math.random() * 50 + 1).toFixed(2)),
  currency: 'NIBI',
  likes: Math.floor(Math.random() * 100),
}))

const categories = ['All', 'Art', 'Gaming', 'Music', 'Photography', 'PFPs', 'Memberships']
const sortOptions = ['Recently Listed', 'Price: Low to High', 'Price: High to Low', 'Most Liked']

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSort, setSelectedSort] = useState('Recently Listed')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">Explore NFTs</h1>
        <p className="text-muted-foreground mt-2">Discover unique digital assets from creators worldwide</p>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 scrollbar-hide">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
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
            onChange={(e) => setSelectedSort(e.target.value)}
            className="h-9 px-3 rounded-lg bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {option}
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-xl bg-card border border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Price Range */}
            <div>
              <label className="text-sm font-medium mb-2 block">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm">
                <option>All</option>
                <option>Listed</option>
                <option>Has Offers</option>
                <option>On Auction</option>
              </select>
            </div>

            {/* Collection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Collection</label>
              <select className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm">
                <option>All Collections</option>
                <option>Cosmic Apes</option>
                <option>Nibiru Punks</option>
                <option>Abstract Dreams</option>
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="text-sm font-medium mb-2 block">Currency</label>
              <select className="w-full h-9 px-3 rounded-lg bg-secondary border border-border text-sm">
                <option>NIBI</option>
                <option>USDC</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {mockNFTs.map((nft) => (
          <NFTCard key={`${nft.collectionAddress}-${nft.id}`} {...nft} />
        ))}
      </div>

      {/* Load More */}
      <div className="mt-12 text-center">
        <Button variant="outline" size="lg">
          Load More
        </Button>
      </div>
    </div>
  )
}
