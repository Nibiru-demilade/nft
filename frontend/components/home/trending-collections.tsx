'use client'

import Link from 'next/link'
import { CollectionCard } from '@/components/ui/collection-card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

// Mock data - replace with API call
const trendingCollections = [
  {
    address: 'nibi1abc123',
    name: 'Cosmic Apes',
    image: 'https://picsum.photos/seed/cosmic/200',
    banner: 'https://picsum.photos/seed/cosmicbanner/400/200',
    floorPrice: '25.5',
    totalVolume: '1,234',
    itemCount: 10000,
    ownerCount: 5432,
    isVerified: true,
    change24h: 12.5,
  },
  {
    address: 'nibi1def456',
    name: 'Nibiru Punks',
    image: 'https://picsum.photos/seed/punks/200',
    banner: 'https://picsum.photos/seed/punksbanner/400/200',
    floorPrice: '8.2',
    totalVolume: '892',
    itemCount: 5000,
    ownerCount: 2341,
    isVerified: true,
    change24h: -3.2,
  },
  {
    address: 'nibi1ghi789',
    name: 'Abstract Dreams',
    image: 'https://picsum.photos/seed/abstract/200',
    banner: 'https://picsum.photos/seed/abstractbanner/400/200',
    floorPrice: '15.0',
    totalVolume: '567',
    itemCount: 3000,
    ownerCount: 1892,
    isVerified: false,
    change24h: 8.7,
  },
  {
    address: 'nibi1jkl012',
    name: 'Pixel Worlds',
    image: 'https://picsum.photos/seed/pixel/200',
    banner: 'https://picsum.photos/seed/pixelbanner/400/200',
    floorPrice: '3.8',
    totalVolume: '345',
    itemCount: 8888,
    ownerCount: 4123,
    isVerified: true,
    change24h: 0,
  },
]

export function TrendingCollections() {
  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Trending Collections</h2>
          <p className="text-muted-foreground mt-1">The most popular collections over the last 24 hours</p>
        </div>
        <Button variant="ghost" asChild className="hidden sm:flex">
          <Link href="/collections">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {trendingCollections.map((collection) => (
          <CollectionCard key={collection.address} {...collection} />
        ))}
      </div>

      <div className="mt-6 text-center sm:hidden">
        <Button variant="outline" asChild>
          <Link href="/collections">
            View All Collections
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
