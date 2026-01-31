'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clock, ArrowRight } from 'lucide-react'

// Mock data - replace with API call
const featuredDrops = [
  {
    id: '1',
    name: 'Genesis Collection',
    creator: 'NibiruLabs',
    image: 'https://picsum.photos/seed/drop1/600/400',
    mintPrice: '10',
    totalSupply: 1000,
    minted: 756,
    startsAt: new Date(Date.now() + 86400000), // Tomorrow
    status: 'upcoming',
  },
  {
    id: '2',
    name: 'Nebula Series',
    creator: 'CosmicArt',
    image: 'https://picsum.photos/seed/drop2/600/400',
    mintPrice: '5',
    totalSupply: 5000,
    minted: 2345,
    startsAt: new Date(Date.now() - 3600000), // Started 1 hour ago
    status: 'live',
  },
  {
    id: '3',
    name: 'Quantum Realms',
    creator: 'DigitalDreamer',
    image: 'https://picsum.photos/seed/drop3/600/400',
    mintPrice: '15',
    totalSupply: 500,
    minted: 0,
    startsAt: new Date(Date.now() + 172800000), // In 2 days
    status: 'upcoming',
  },
]

export function FeaturedDrops() {
  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Featured Drops</h2>
          <p className="text-muted-foreground mt-1">Upcoming and live minting events</p>
        </div>
        <Button variant="ghost" asChild className="hidden sm:flex">
          <Link href="/drops">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featuredDrops.map((drop) => (
          <Link key={drop.id} href={`/drops/${drop.id}`} className="block">
            <div className="nft-card group">
              {/* Image */}
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={drop.image}
                  alt={drop.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      drop.status === 'live'
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-black'
                    }`}
                  >
                    {drop.status === 'live' ? 'LIVE' : 'UPCOMING'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">by {drop.creator}</p>
                  <h3 className="text-lg font-semibold">{drop.name}</h3>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Minted</span>
                    <span className="font-medium">
                      {drop.minted} / {drop.totalSupply}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-bg rounded-full transition-all duration-300"
                      style={{ width: `${(drop.minted / drop.totalSupply) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Price & Time */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Mint Price</p>
                    <p className="font-semibold">{drop.mintPrice} NIBI</p>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {drop.status === 'live'
                        ? 'Minting Now'
                        : formatTimeUntil(drop.startsAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function formatTimeUntil(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `Starts in ${days}d`
  }
  if (hours > 0) {
    return `Starts in ${hours}h`
  }
  return 'Starting soon'
}
