'use client'

import Link from 'next/link'
import { NFTCard } from '@/components/ui/nft-card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

// Mock data - replace with API call
const recentListings = [
  {
    id: '1',
    name: 'Cosmic Ape #1234',
    image: 'https://picsum.photos/seed/nft1/400',
    collection: 'Cosmic Apes',
    collectionAddress: 'nibi1abc123',
    price: '25.5',
    currency: 'NIBI',
    likes: 42,
  },
  {
    id: '2',
    name: 'Nibiru Punk #567',
    image: 'https://picsum.photos/seed/nft2/400',
    collection: 'Nibiru Punks',
    collectionAddress: 'nibi1def456',
    price: '8.2',
    currency: 'NIBI',
    likes: 18,
  },
  {
    id: '3',
    name: 'Dream #89',
    image: 'https://picsum.photos/seed/nft3/400',
    collection: 'Abstract Dreams',
    collectionAddress: 'nibi1ghi789',
    price: '15.0',
    currency: 'NIBI',
    likes: 67,
  },
  {
    id: '4',
    name: 'Pixel World #2345',
    image: 'https://picsum.photos/seed/nft4/400',
    collection: 'Pixel Worlds',
    collectionAddress: 'nibi1jkl012',
    price: '3.8',
    currency: 'NIBI',
    likes: 23,
  },
  {
    id: '5',
    name: 'Cosmic Ape #5678',
    image: 'https://picsum.photos/seed/nft5/400',
    collection: 'Cosmic Apes',
    collectionAddress: 'nibi1abc123',
    price: '28.0',
    currency: 'NIBI',
    likes: 55,
  },
  {
    id: '6',
    name: 'Abstract #156',
    image: 'https://picsum.photos/seed/nft6/400',
    collection: 'Abstract Dreams',
    collectionAddress: 'nibi1ghi789',
    price: '12.5',
    currency: 'NIBI',
    likes: 31,
  },
  {
    id: '7',
    name: 'Punk #890',
    image: 'https://picsum.photos/seed/nft7/400',
    collection: 'Nibiru Punks',
    collectionAddress: 'nibi1def456',
    price: '9.9',
    currency: 'NIBI',
    likes: 44,
  },
  {
    id: '8',
    name: 'Pixel Castle #789',
    image: 'https://picsum.photos/seed/nft8/400',
    collection: 'Pixel Worlds',
    collectionAddress: 'nibi1jkl012',
    price: '5.5',
    currency: 'NIBI',
    likes: 12,
  },
]

export function RecentListings() {
  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Recently Listed</h2>
          <p className="text-muted-foreground mt-1">Fresh NFTs hitting the market</p>
        </div>
        <Button variant="ghost" asChild className="hidden sm:flex">
          <Link href="/explore">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {recentListings.map((nft) => (
          <NFTCard key={`${nft.collectionAddress}-${nft.id}`} {...nft} />
        ))}
      </div>

      <div className="mt-6 text-center sm:hidden">
        <Button variant="outline" asChild>
          <Link href="/explore">
            View All NFTs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
