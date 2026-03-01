'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CollectionCard } from '@/components/ui/collection-card'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { fetchTrending } from '@/lib/api'

export function TrendingCollections() {
  const [trending, setTrending] = useState<Array<{
    contractAddress: string
    name: string
    image?: string
    banner?: string
    floorPrice?: string
    totalVolume?: string
    itemCount?: number
    ownerCount?: number
    verified?: boolean
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrending({ limit: 8 })
      .then((r) => { setTrending(r.trending ?? []); setError(null) })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Trending Collections</h2>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border animate-pulse aspect-[3/4]" />
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section>
        <p className="text-muted-foreground">{error}</p>
      </section>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Trending Collections</h2>
          <p className="text-muted-foreground mt-1">Top collections by volume</p>
        </div>
        <Button variant="ghost" asChild className="hidden sm:flex">
          <Link href="/collections">View All<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {trending.map((c) => (
          <CollectionCard
            key={c.contractAddress}
            address={c.contractAddress}
            name={c.name}
            image={c.image}
            banner={c.banner}
            floorPrice={c.floorPrice}
            totalVolume={c.totalVolume}
            itemCount={c.itemCount}
            ownerCount={c.ownerCount}
            isVerified={c.verified}
          />
        ))}
      </div>
      {trending.length === 0 && (
        <p className="text-muted-foreground text-center py-8">No collections yet. Create one to get started.</p>
      )}
    </section>
  )
}
